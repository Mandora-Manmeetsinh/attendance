import express from 'express';
import Attendance from '../models/Attendance.js';
import Office from '../models/Office.js';
import User from '../models/User.js';
import ShiftConfig from '../models/ShiftConfig.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Helper: Calculate distance between two coordinates (Haversine formula)
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

/**
 * Helper: Determine status based on shift start and grace period (Legacy/Admin fallback)
 */
function determineStatus(currentTime, shiftStart, gracePeriodMins, isWithinRadius) {
    if (!isWithinRadius) return 'absent';
    if (!shiftStart) return 'present'; // Fallback if user has no shift start defined

    const [hours, minutes] = shiftStart.split(':').map(Number);
    const start = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), hours, minutes);
    const graceEnd = new Date(start.getTime() + (gracePeriodMins || 15) * 60 * 1000);

    return currentTime > graceEnd ? 'late' : 'present';
}

// Helper: Parse time string (HH:MM or HH:MM:SS) to Date object for today
function parseTimeToday(timeStr) {
    const now = new Date();
    const parts = timeStr.split(':').map(Number);
    const hours = parts[0];
    const minutes = parts[1] || 0;
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
}

// Helper: Get shift config for a user based on role and batch
async function getShiftConfig(user) {
    const query = { role: user.role };
    if (user.role === 'intern') {
        query.batch = user.batch;
    } else {
        query.batch = null;
    }
    return await ShiftConfig.findOne(query);
}

// =============================================================================
// NEW: CORRECTED CHECK-IN/CHECKOUT LOGIC
// =============================================================================

/**
 * Check if current time is within the SHIFT window (for check-in)
 * FIXED: Allows check-in ANYTIME during the shift, not just a narrow window
 */
function isWithinShiftWindow(shiftConfig) {
    const now = new Date();
    const shiftStart = parseTimeToday(shiftConfig.shift_start);
    const shiftEnd = parseTimeToday(shiftConfig.shift_end);
    return now >= shiftStart && now <= shiftEnd;
}

/**
 * Determine if check-in is LATE based on grace period
 * 
 * EMPLOYEE: On-time if check-in between 10:30 - 10:45, late after 10:45
 * INTERN Batch1: On-time if check-in between 10:30 - 10:45
 * INTERN Batch2: On-time if check-in between 3:00 - 3:15
 */
function isLateCheckIn(checkInTime, shiftConfig) {
    const shiftStart = parseTimeToday(shiftConfig.shift_start);
    // Grace period is 15 minutes after shift start
    const gracePeriodMs = 15 * 60 * 1000;
    const graceEnd = new Date(shiftStart.getTime() + gracePeriodMs);

    return checkInTime > graceEnd;
}

/**
 * Determine if checkout is EARLY based on role
 * 
 * EMPLOYEE: Early if checkout before 6:15 PM (15 mins before 6:30)
 * INTERN Batch1: Early if checkout before 1:15 PM
 * INTERN Batch2: Early if checkout before 5:45 PM
 */
function isEarlyCheckout(checkOutTime, shiftConfig) {
    const shiftEnd = parseTimeToday(shiftConfig.shift_end);
    // Early checkout threshold is 15 minutes before shift end
    const earlyThresholdMs = 15 * 60 * 1000;
    const earlyThreshold = new Date(shiftEnd.getTime() - earlyThresholdMs);

    return checkOutTime < earlyThreshold;
}

/**
 * Calculate FINAL STATUS based on isLate and isEarlyCheckout
 * 
 * Rules:
 * - Late AND EarlyCheckout → Absent
 * - Only Late OR Only EarlyCheckout → HalfDay
 * - Neither → Present
 */
function calculateFinalStatus(isLate, isEarlyCheckoutFlag) {
    if (isLate && isEarlyCheckoutFlag) {
        return 'absent';
    } else if (isLate || isEarlyCheckoutFlag) {
        return 'halfday';
    } else {
        return 'present';
    }
}

// @desc    Check In
// @route   POST /api/attendance/check-in
// @access  Private
router.post('/check-in', protect, async (req, res) => {
    const { latitude, longitude } = req.body;
    const userId = req.user._id;

    try {
        // 1. Get Office Config
        const office = await Office.findOne(); // Assuming single office for now
        if (!office) {
            return res.status(404).json({ message: 'Office configuration not found' });
        }

        // 2. Validate Location
        const distance = calculateDistance(latitude, longitude, office.latitude, office.longitude);
        const bufferMeters = 20;
        const isWithinRadius = distance <= (office.radius_meters + bufferMeters);

        if (!isWithinRadius) {
            return res.status(400).json({
                error: 'You are outside the office geo-fence',
                distance: Math.round(distance),
                required_radius: office.radius_meters
            });
        }

        // 3. Check if already checked in
        const today = new Date().toISOString().split('T')[0];
        const existing = await Attendance.findOne({ user: userId, date: today });

        if (existing && existing.check_in) {
            return res.status(400).json({ message: 'Already checked in today' });
        }

        // 4. Get user and shift config
        const user = await User.findById(userId);

        // NEW: Role-based shift validation
        let shiftConfig = null;
        let isLate = false;

        if (user.role !== 'admin') {
            shiftConfig = await getShiftConfig(user);

            if (shiftConfig) {
                // Validate check-in window (ANYTIME during shift)
                // FIXED: Use isWithinShiftWindow instead of narrow check-in window
                if (!isWithinShiftWindow(shiftConfig)) {
                    const shiftStart = parseTimeToday(shiftConfig.shift_start);
                    const shiftEnd = parseTimeToday(shiftConfig.shift_end);
                    return res.status(400).json({
                        error: 'Check-in is not allowed at this time',
                        message: `You can only check in during your shift: ${shiftStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${shiftEnd.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`,
                        currentTime: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                    });
                }

                // Calculate Late Status
                isLate = isLateCheckIn(new Date(), shiftConfig);
            }
        }

        // 5. Determine initial status (Legacy compatibility)
        // If shiftConfig exists, use isLate flag. Otherwise fallback to legacy logic.
        const status = shiftConfig ? (isLate ? 'late' : 'present') : determineStatus(new Date(), user.shift_start, office.grace_period_mins, isWithinRadius);

        // 6. Create Attendance Record
        const attendance = await Attendance.create({
            user: userId,
            office: office._id,
            date: today,
            check_in: new Date(),
            check_in_lat: latitude,
            check_in_lng: longitude,
            distance_at_check_in: Math.round(distance),
            status: status,
            is_late: isLate, // NEW field
        });

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

// @desc    Check Out
// @route   POST /api/attendance/check-out
// @access  Private
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

        // Get Office for distance calc
        const office = await Office.findById(attendance.office);
        const distance = calculateDistance(latitude, longitude, office.latitude, office.longitude);
        const bufferMeters = 20;
        const isWithinRadius = distance <= (office.radius_meters + bufferMeters);

        // Get user and shift config
        const user = await User.findById(userId);

        // NEW: Role-based checkout validation
        let shiftConfig = null;
        if (user.role !== 'admin') {
            shiftConfig = await getShiftConfig(user);
            // NOTE: Checkout is allowed anytime for everyone now, so no blocking check here.
        }

        // Calculate checkout time and worked minutes
        const checkOutTime = new Date();
        const checkInTime = new Date(attendance.check_in);
        const workedMs = checkOutTime - checkInTime;
        const workedMinutes = Math.floor(workedMs / 60000);

        let newStatus = attendance.status;
        let isEarlyCheckoutFlag = false;
        let finalStatus = null;

        if (shiftConfig) {
            // NEW: Calculate Early Checkout
            isEarlyCheckoutFlag = isEarlyCheckout(checkOutTime, shiftConfig);

            // NEW: Calculate Final Status
            // Uses the is_late from check-in and is_early_checkout from here
            const finalStatusResult = calculateFinalStatus(attendance.is_late, isEarlyCheckoutFlag);

            finalStatus = finalStatusResult;

            // Map final status to legacy status field for compatibility
            // 'present' -> 'present', 'halfday' -> 'incomplete' (or new 'halfday'), 'absent' -> 'absent'
            if (finalStatus === 'present') newStatus = 'present';
            else if (finalStatus === 'halfday') newStatus = 'halfday'; // Ensure 'halfday' is in enum
            else if (finalStatus === 'absent') newStatus = 'absent';

        } else {
            // Legacy: Determine Early Exit for users without shift config
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
        attendance.is_early_checkout = isEarlyCheckoutFlag; // NEW field
        attendance.final_status = finalStatus; // NEW field

        await attendance.save();

        // Format worked time for response
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

// @desc    Get Today's Attendance
// @route   GET /api/attendance/today
// @access  Private
router.get('/today', protect, async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const attendance = await Attendance.findOne({ user: req.user._id, date: today });
    res.json(attendance || null);
});

// @desc    Get Attendance History
// @route   GET /api/attendance/history
// @access  Private
router.get('/history', protect, async (req, res) => {
    const attendance = await Attendance.find({ user: req.user._id }).sort({ date: -1 });
    res.json(attendance);
});

// @desc    Get Leaderboard
// @route   GET /api/attendance/leaderboard
// @access  Private
router.get('/leaderboard', protect, async (req, res) => {
    try {
        // Aggregate to find top users by attendance count
        // This is a simple implementation. You might want to filter by month/week.
        const leaderboard = await Attendance.aggregate([
            {
                $group: {
                    _id: '$user',
                    total_attendance: { $sum: 1 },
                    // You can add logic for streaks here if you store it on attendance or calculate it
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
                    avatar_url: '$user.avatar_url', // Assuming this field exists or will exist
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
