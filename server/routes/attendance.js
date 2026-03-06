import express from 'express';
import Attendance from '../models/Attendance.js';
import Office from '../models/Office.js';
import User from '../models/User.js';
import ShiftConfig from '../models/ShiftConfig.js';
import { protect } from '../middleware/authMiddleware.js';
import { sendCheckInConfirmation, sendCheckOutConfirmation } from '../services/emailService.js';

const router = express.Router();
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Helper: Parse time string (HH:MM or HH:MM:SS) to Date object for today
function parseTimeToday(timeStr) {
    const now = new Date();
    const parts = timeStr.split(':').map(Number);
    const hours = parts[0];
    const minutes = parts[1] || 0;
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
}
async function getShiftConfig(user) {
    const query = { role: user.role };
    if (user.role === 'intern') {
        query.batch = user.batch;
    } else {
        query.batch = null;
    }
    return await ShiftConfig.findOne(query);
}

function isWithinShiftWindow(shiftConfig) {
    const now = new Date();
    const shiftStart = parseTimeToday(shiftConfig.shift_start);
    const shiftEnd = parseTimeToday(shiftConfig.shift_end);
    return now >= shiftStart && now <= shiftEnd;
}
function isLateCheckIn(checkInTime, shiftConfig) {
    const shiftStart = parseTimeToday(shiftConfig.shift_start);
    const gracePeriodMs = 15 * 60 * 1000;
    const graceEnd = new Date(shiftStart.getTime() + gracePeriodMs);

    return checkInTime > graceEnd;
}

function isEarlyCheckout(checkOutTime, shiftConfig) {
    const shiftEnd = parseTimeToday(shiftConfig.shift_end);
    const earlyThresholdMs = 15 * 60 * 1000;
    const earlyThreshold = new Date(shiftEnd.getTime() - earlyThresholdMs);

    return checkOutTime < earlyThreshold;
}

function calculateFinalStatus(isLate, isEarlyCheckoutFlag) {
    if (isLate && isEarlyCheckoutFlag) {
        return 'absent';
    } else if (isLate || isEarlyCheckoutFlag) {
        return 'halfday';
    } else {
        return 'present';
    }
}

function determineStatus(checkInTime, shiftStart, gracePeriod, isWithinRadius) {
    if (!isWithinRadius) return 'absent';

    const [hours, minutes] = shiftStart.split(':').map(Number);
    const shiftStartTime = new Date(checkInTime.getFullYear(), checkInTime.getMonth(), checkInTime.getDate(), hours, minutes);
    const lateThreshold = new Date(shiftStartTime.getTime() + (gracePeriod || 15) * 60000);

    return checkInTime <= lateThreshold ? 'present' : 'late';
}

router.post('/check-in', protect, async (req, res) => {
    const { latitude, longitude } = req.body;
    const userId = req.user._id;

    try {
        const office = await Office.findOne();
        if (!office) {
            return res.status(404).json({ message: 'Office configuration not found' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        let isWithinRadius = false;
        let work_mode = req.body.work_mode || 'office';
        let distance = 0;

        if (work_mode === 'wfh' && !user.wfh_enabled) {
            return res.status(403).json({ message: 'You are not authorized for Work From Home.' });
        }

        if (work_mode === 'wfh') {
            isWithinRadius = true;
        } else {
            distance = calculateDistance(latitude, longitude, office.latitude, office.longitude);
            const bufferMeters = 20;
            isWithinRadius = distance <= (office.radius_meters + bufferMeters);

            if (!isWithinRadius) {
                return res.status(400).json({
                    error: 'You are outside the office geo-fence',
                    distance: Math.round(distance),
                    required_radius: office.radius_meters
                });
            }
        }

        const today = new Date().toISOString().split('T')[0];
        const existing = await Attendance.findOne({ user: userId, date: today });

        if (existing && existing.check_in) {
            return res.status(400).json({ message: 'Already checked in today' });
        }

        let shiftConfig = null;
        let isLate = false;

        if (user.role !== 'admin') {
            shiftConfig = await getShiftConfig(user);

            if (shiftConfig) {
                if (!isWithinShiftWindow(shiftConfig)) {
                    const shiftStart = parseTimeToday(shiftConfig.shift_start);
                    const shiftEnd = parseTimeToday(shiftConfig.shift_end);
                    return res.status(400).json({
                        error: 'Check-in is not allowed at this time',
                        message: `You can only check in during your shift: ${shiftStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${shiftEnd.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`,
                        currentTime: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                    });
                }

                isLate = isLateCheckIn(new Date(), shiftConfig);
                const startOfMonth = new Date();
                startOfMonth.setDate(1);
                startOfMonth.setHours(0, 0, 0, 0);

                if (work_mode === 'wfh') {
                    const wfhCount = await Attendance.countDocuments({
                        user: userId,
                        work_mode: 'wfh',
                        date: { $gte: startOfMonth.toISOString().split('T')[0] }
                    });

                    if (wfhCount >= 2) {
                        return res.status(403).json({ message: 'Work From Home limit reached for this month.' });
                    }
                }

                if (isLate) {
                    const lateCount = await Attendance.countDocuments({
                        user: userId,
                        is_late: true,
                        date: { $gte: startOfMonth.toISOString().split('T')[0] }
                    });

                    if (lateCount >= 2) {
                        req.is_policy_violation = true;
                    }
                }
            }
        }

        const status = shiftConfig ? (isLate ? 'late' : 'present') : determineStatus(new Date(), user.shift_start, office.grace_period_mins, isWithinRadius);
        const attendance = await Attendance.create({
            user: userId,
            office: office._id,
            date: today,
            check_in: new Date(),
            check_in_lat: latitude,
            check_in_lng: longitude,
            distance_at_check_in: work_mode === 'office' ? Math.round(calculateDistance(latitude, longitude, office.latitude, office.longitude)) : 0,
            status: status,
            is_late: isLate,
            is_policy_violation: req.is_policy_violation || false,
            work_mode: work_mode
        });

        sendCheckInConfirmation(user, new Date());


        res.status(201).json({
            success: true,
            message: `Checked in successfully. ${isLate ? 'Marked as Late.' : 'On Time.'}`,
            record: attendance,
            distance: Math.round(distance),
            shiftConfig: shiftConfig ? {
                shift_end: shiftConfig.shift_end,
                min_minutes: shiftConfig.min_minutes,
                role: user.role,
                batch: user.batch
            } : null
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.post('/check-out', protect, async (req, res) => {
    const { latitude, longitude } = req.body;
    const userId = req.user._id;

    try {
        const today = new Date().toISOString().split('T')[0];
        const attendance = await Attendance.findOne({ user: userId, date: today });

        if (!attendance) {
            return res.status(400).json({ message: 'No check-in record found for today' });
        }

        if (attendance.check_out) {
            return res.status(400).json({ message: 'Already checked out today' });
        }

        const office = await Office.findById(attendance.office);
        const distance = calculateDistance(latitude, longitude, office.latitude, office.longitude);
        const bufferMeters = 20;
        const isWithinRadius = distance <= (office.radius_meters + bufferMeters);
        const user = await User.findById(userId);

        let shiftConfig = null;
        if (user.role !== 'admin') {
            shiftConfig = await getShiftConfig(user);
        }
        const checkOutTime = new Date();
        const checkInTime = new Date(attendance.check_in);
        const workedMs = checkOutTime - checkInTime;
        let workedMinutes = Math.floor(workedMs / 60000);

        // Subtract break time
        if (attendance.break_minutes > 0) {
            workedMinutes -= attendance.break_minutes;
        }

        let newStatus = attendance.status;
        let isEarlyCheckoutFlag = false;
        let finalStatus = null;

        if (shiftConfig) {
            isEarlyCheckoutFlag = isEarlyCheckout(checkOutTime, shiftConfig);
            const finalStatusResult = calculateFinalStatus(attendance.is_late, isEarlyCheckoutFlag);
            finalStatus = finalStatusResult;

            if (finalStatus === 'present') newStatus = 'present';
            else if (finalStatus === 'halfday') newStatus = 'halfday';
            else if (finalStatus === 'absent') newStatus = 'absent';
        } else {
            const currentTime = new Date();
            const [endHours, endMinutes] = user.shift_end.split(':').map(Number);
            const shiftEndTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), endHours, endMinutes);

            if (currentTime < shiftEndTime && attendance.status !== 'late') {
                newStatus = 'early_exit';
            }
        }

        attendance.check_out = checkOutTime;
        attendance.check_out_lat = latitude;
        attendance.check_out_lng = longitude;
        attendance.distance_at_check_out = Math.round(distance);
        attendance.worked_minutes = workedMinutes;
        attendance.status = newStatus;
        attendance.is_early_checkout = isEarlyCheckoutFlag;
        attendance.final_status = finalStatus;

        await attendance.save();

        // Send confirmation email
        sendCheckOutConfirmation(user, checkOutTime);

        const workedHours = Math.floor(workedMinutes / 60);
        const workedMins = workedMinutes % 60;

        res.json({
            success: true,
            message: `Checked out successfully. Final Status: ${finalStatus ? finalStatus.toUpperCase() : newStatus}`,
            record: attendance,
            distance: Math.round(distance),
            workedTime: {
                hours: workedHours,
                minutes: workedMins,
                total_minutes: workedMinutes,
                formatted: `${workedHours}h ${workedMins}m`
            },
            minRequired: shiftConfig ? shiftConfig.min_minutes : null
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.post('/resume-break', protect, async (req, res) => {
    // Route to allow full-time employees to manually resume work timer after 2:45 PM
    try {
        const today = new Date().toISOString().split('T')[0];
        const attendance = await Attendance.findOne({ user: req.user._id, date: today });

        if (!attendance) {
            return res.status(404).json({ message: 'No attendance record found for today' });
        }

        if (req.user.role !== 'employee') {
            return res.status(403).json({ message: 'Only full-time employees have mandatory breaks' });
        }

        if (!attendance.is_on_break) {
            return res.status(400).json({ message: 'Employee is not on break' });
        }

        const now = new Date();
        const [resumeH, resumeM] = [14, 45]; // 2:45 PM
        const resumeTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), resumeH, resumeM);

        if (now < resumeTime) {
            return res.status(400).json({
                message: 'Break period is still active. Please resume after 2:45 PM.',
                currentTime: now.toLocaleTimeString(),
                resumeTime: resumeTime.toLocaleTimeString()
            });
        }

        const breakStartTime = new Date(attendance.break_start);
        const breakMinutes = Math.floor((now - breakStartTime) / 60000);

        attendance.break_end = now;
        attendance.break_minutes = breakMinutes;
        attendance.is_on_break = false;

        await attendance.save();

        res.json({
            success: true,
            message: 'Break ended. Working timer resumed.',
            break_duration: breakMinutes,
            record: attendance
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.get('/today', protect, async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const attendance = await Attendance.findOne({ user: req.user._id, date: today });
    res.json(attendance || null);
});

router.get('/history', protect, async (req, res) => {
    const attendance = await Attendance.find({ user: req.user._id }).sort({ date: -1 });
    res.json(attendance);
});

router.get('/leaderboard', protect, async (req, res) => {
    try {
        const leaderboard = await Attendance.aggregate([
            {
                $group: {
                    _id: '$user',
                    total_attendance: { $sum: 1 },
                }
            },
            { $sort: { total_attendance: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $project: {
                    id: '$_id',
                    full_name: '$user.full_name',
                    avatar_url: '$user.avatar_url',
                    total_attendance: 1,
                    current_streak: '$user.current_streak'
                }
            }
        ]);

        res.json(leaderboard);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

export default router;