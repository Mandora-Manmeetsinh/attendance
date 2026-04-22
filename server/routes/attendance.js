import express from 'express';
import Attendance from '../models/Attendance.js';
import Office from '../models/Office.js';
import User from '../models/User.js';
import ShiftConfig from '../models/ShiftConfig.js';
import { protect } from '../middleware/authMiddleware.js';
import { sendCheckInConfirmation, sendCheckOutConfirmation } from '../services/emailService.js';

const router = express.Router();

async function getShiftConfig(user) {
    const query = { role: user.role };

    if (user.role === 'intern') {
        query.batch = user.batch;
    } else {
        query.batch = null;
    }

    return await ShiftConfig.findOne(query);
}
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function parseTimeToday(timeStr) {
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

    // Convert to IST manually
    const istNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

    const [hours, minutes] = timeStr.split(':').map(Number);

    return new Date(
        istNow.getFullYear(),
        istNow.getMonth(),
        istNow.getDate(),
        hours,
        minutes
    );
}

function isWithinShiftWindow(shiftConfig) {
    const now = new Date();
    const shiftStart = parseTimeToday(shiftConfig.shift_start);
    const shiftEnd = parseTimeToday(shiftConfig.shift_end);
    
    // Allow check-in from 30 mins before shift start until shift end
    const earlyCheckInAllowedMs = 30 * 60 * 1000;
    const startTime = new Date(shiftStart.getTime() - earlyCheckInAllowedMs);

    return now >= startTime && now <= shiftEnd;
}
function isLateCheckIn(checkInTime, shiftConfig, officeConfig) {
    const shiftStart = parseTimeToday(shiftConfig.shift_start);
    const gracePeriodMs = (officeConfig?.grace_period_mins || 5) * 60 * 1000;
    const graceEnd = new Date(shiftStart.getTime() + gracePeriodMs);

    return checkInTime > graceEnd;
}

function isEarlyCheckout(checkOutTime, shiftConfig) {
    const shiftEnd = parseTimeToday(shiftConfig.shift_end);
    const earlyThresholdMs = 15 * 60 * 1000;
    const earlyThreshold = new Date(shiftEnd.getTime() - earlyThresholdMs);

    return checkOutTime < earlyThreshold;
}

function calculateFinalStatus(isLate, isEarlyCheckoutFlag, workedMinutes, shiftConfig) {
    const requiredMins = shiftConfig ? (shiftConfig.min_minutes || 480) : 480;
    const halfShift = requiredMins / 2;

    if (workedMinutes < halfShift) {
        return 'halfday';
    }

    if (isLate && isEarlyCheckoutFlag) {
        return 'absent';
    } else if (isLate) {
        return 'late';
    } else if (isEarlyCheckoutFlag) {
        return 'early_exit';
    } else {
        return 'present';
    }
}

function determineStatus(checkInTime, shiftStart, gracePeriod, isWithinRadius) {
    if (!isWithinRadius) return 'absent';

    const [hours, minutes] = shiftStart.split(':').map(Number);
    const shiftStartTime = new Date(checkInTime.getFullYear(), checkInTime.getMonth(), checkInTime.getDate(), hours, minutes);
    const lateThreshold = new Date(shiftStartTime.getTime() + (gracePeriod) * 60000);

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

        const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const existing = await Attendance.findOne({ user: userId, date: today });

        if (existing && existing.check_in) {
            return res.status(400).json({ message: 'Already checked in today' });
        }

        let shiftConfig = null;
        let isLate = false;

        if (user.role !== 'admin') {
            shiftConfig = await getShiftConfig(user);

            if (shiftConfig) {
                const office = await Office.findOne();
                const shiftStart = parseTimeToday(shiftConfig.shift_start);
                const shiftEnd = parseTimeToday(shiftConfig.shift_end);

                if (!isWithinShiftWindow(shiftConfig, office)) {
                    return res.status(400).json({
                        error: 'Check-in is not allowed at this time',
                        message: `Check-in is only allowed during your shift: ${shiftStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${shiftEnd.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`,
                        currentTime: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                    });
                }

                isLate = isLateCheckIn(new Date(), shiftConfig, office);

                const startOfMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

                if (work_mode === 'wfh') {
                    const wfhCount = await Attendance.countDocuments({
                        user: userId,
                        work_mode: 'wfh',
                        date: { $gte: startOfMonthStr }
                    });

                    if (wfhCount >= 2) {
                        return res.status(403).json({ message: 'Work From Home limit reached for this month.' });
                    }
                }

                if (isLate) {
                    const lateCount = await Attendance.countDocuments({
                        user: userId,
                        is_late: true,
                        date: { $gte: startOfMonthStr }
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

        // Update User streak and total attendance
        const lastCheckInDate = user.last_check_in ? new Date(user.last_check_in) : null;
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);

        let newStreak = user.current_streak || 0;

        if (lastCheckInDate) {
            lastCheckInDate.setHours(0, 0, 0, 0);
            const diffTime = Math.abs(todayDate - lastCheckInDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                newStreak += 1;
            } else if (diffDays > 1) {
                if (todayDate.getDay() === 1 && lastCheckInDate.getDay() === 5 && diffDays === 3) {
                    newStreak += 1;
                } else if (todayDate.getDay() === 1 && lastCheckInDate.getDay() === 6 && diffDays === 2) {
                    newStreak += 1;
                } else {
                    newStreak = 1;
                }
            }
        } else {
            newStreak = 1;
        }

        user.current_streak = newStreak;
        if (newStreak > (user.best_streak || 0)) {
            user.best_streak = newStreak;
        }
        user.last_check_in = new Date();
        user.total_attendance = (user.total_attendance || 0) + 1;
        await user.save();

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
        const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
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

        if (attendance.break_minutes > 0) {
            workedMinutes -= attendance.break_minutes;
        }

        let newStatus = attendance.status;
        let isEarlyCheckoutFlag = false;
        let finalStatus = null;

        if (shiftConfig) {
            isEarlyCheckoutFlag = isEarlyCheckout(checkOutTime, shiftConfig);
            const finalStatusResult = calculateFinalStatus(attendance.is_late, isEarlyCheckoutFlag, workedMinutes, shiftConfig);
            finalStatus = finalStatusResult;
            newStatus = finalStatus;
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

router.post('/start-break', protect, async (req, res) => {
    try {
        const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const attendance = await Attendance.findOne({ user: req.user._id, date: today });

        if (!attendance) {
            console.log(`[StartBreak] No attendance for ${req.user.email} on ${today}`);
            return res.status(404).json({ message: 'No attendance record found for today. Please check-in first.' });
        }

        if (attendance.check_out) {
            return res.status(400).json({ message: 'Already checked out today' });
        }

        if (attendance.is_on_break) {
            return res.status(400).json({ message: 'Already on break' });
        }

        const totalBreakMinutes = attendance.break_minutes || 0;
        if (req.user.role === 'employee' && totalBreakMinutes >= 45) {
            return res.status(400).json({ message: 'Daily break limit (45 minutes) reached' });
        }

        attendance.is_on_break = true;
        attendance.break_start = new Date();
        await attendance.save();

        res.json({
            success: true,
            message: 'Break started. Working timer paused.',
            record: attendance
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.post('/resume-break', protect, async (req, res) => {
    try {
        const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const attendance = await Attendance.findOne({ user: req.user._id, date: today });

        if (!attendance) {
            console.log(`[ResumeBreak] No attendance for ${req.user.email} on ${today}`);
            return res.status(404).json({ message: 'No attendance record found for today' });
        }

        if (!attendance.is_on_break) {
            return res.status(400).json({ message: 'Employee is not on break' });
        }

        const breakStartTime = new Date(attendance.break_start);
        const thisBreakMinutes = Math.floor((now - breakStartTime) / 60000);

        const totalBreakMinutes = (attendance.break_minutes || 0) + thisBreakMinutes;

        attendance.break_end = now;
        attendance.break_minutes = totalBreakMinutes;
        attendance.is_on_break = false;

        await attendance.save();

        let message = 'Break ended. Working timer resumed.';
        if (totalBreakMinutes > 45) {
            message += ` Note: Total break time exceeded limit by ${totalBreakMinutes - 45} minutes.`;
        }

        res.json({
            success: true,
            message: message,
            break_duration: totalBreakMinutes,
            record: attendance
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.get('/today', protect, async (req, res) => {
    try {
        const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const attendance = await Attendance.findOne({ user: req.user._id, date: today });
        const startOfMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

        const wfh_count = await Attendance.countDocuments({
            user: req.user._id,
            work_mode: 'wfh',
            date: { $gte: startOfMonthStr }
        });

        res.json({
            record: attendance || null,
            wfh_count,
            wfh_limit: 2
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.get('/history', protect, async (req, res) => {
    const { startDate, endDate } = req.query;
    let query = { user: req.user._id };

    if (startDate && endDate) {
        query.date = { $gte: startDate, $lte: endDate };
    }

    try {
        const attendance = await Attendance.find(query).sort({ date: -1 });
        res.json(attendance);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
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
