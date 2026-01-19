import express from 'express';
import Attendance from '../models/Attendance.js';
import Office from '../models/Office.js';
import User from '../models/User.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Helper: Calculate distance
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

// Helper: Determine Status
function determineStatus(checkInTime, shiftStart, gracePeriodMins, isWithinRadius) {
    if (!isWithinRadius) return 'absent';

    const today = new Date();
    const [hours, minutes] = shiftStart.split(':').map(Number);
    const shiftStartTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
    const graceEndTime = new Date(shiftStartTime.getTime() + gracePeriodMins * 60 * 1000);

    if (checkInTime <= graceEndTime) return 'present';
    return 'late';
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

        // 4. Create Record
        const user = await User.findById(userId);
        const status = determineStatus(new Date(), user.shift_start, office.grace_period_mins, isWithinRadius);

        const attendance = await Attendance.create({
            user: userId,
            office: office._id,
            date: today,
            check_in: new Date(),
            check_in_lat: latitude,
            check_in_lng: longitude,
            distance_at_check_in: Math.round(distance),
            status: status
        });

        res.status(201).json({
            success: true,
            message: `Checked in successfully. Status: ${status}`,
            record: attendance,
            distance: Math.round(distance)
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

        // Determine Early Exit
        const user = await User.findById(userId);
        let newStatus = attendance.status;
        const currentTime = new Date();
        const [endHours, endMinutes] = user.shift_end.split(':').map(Number);
        const shiftEndTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), endHours, endMinutes);

        if (currentTime < shiftEndTime && attendance.status !== 'late') {
            newStatus = 'early_exit';
        }

        attendance.check_out = new Date();
        attendance.check_out_lat = latitude;
        attendance.check_out_lng = longitude;
        attendance.distance_at_check_out = Math.round(distance);
        attendance.status = newStatus;

        await attendance.save();

        res.json({
            success: true,
            message: `Checked out successfully. Status: ${newStatus}`,
            record: attendance,
            distance: Math.round(distance)
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

export default router;
