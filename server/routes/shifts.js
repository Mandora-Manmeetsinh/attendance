import express from 'express';
import ShiftConfig from '../models/ShiftConfig.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

function parseTimeToday(timeStr) {
    const now = new Date();
    const [hours, minutes] = timeStr.split(':').map(Number);
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
}

function formatTime(timeStr) {
    const date = parseTimeToday(timeStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

router.get('/my-shift', protect, async (req, res) => {
    try {
        const user = req.user;

        if (user.role === 'admin') {
            return res.json({ message: 'Admins do not have shift configurations' });
        }

        const query = { role: user.role };
        if (user.role === 'intern') {
            query.batch = user.batch;
        } else {
            query.batch = null;
        }

        const shiftConfig = await ShiftConfig.findOne(query);

        if (!shiftConfig) {
            return res.status(404).json({
                message: 'Shift configuration not found for your role',
                role: user.role,
                batch: user.batch
            });
        }

        const now = new Date();
        const shiftStart = parseTimeToday(shiftConfig.shift_start);
        const shiftEnd = parseTimeToday(shiftConfig.shift_end);
        const canCheckIn = now >= shiftStart && now <= shiftEnd;
        const isBeforeCheckIn = now < shiftStart;
        const isAfterCheckIn = now > shiftEnd;
        const canCheckOut = true;

        res.json({
            ...shiftConfig.toObject(),
            formatted: {
                shift_start: formatTime(shiftConfig.shift_start),
                shift_end: formatTime(shiftConfig.shift_end),
                check_in_window: `${formatTime(shiftConfig.shift_start)} - ${formatTime(shiftConfig.shift_end)}`,
                min_hours: (shiftConfig.min_minutes / 60).toFixed(1),
            },
            status: {
                canCheckIn,
                canCheckOut,
                isBeforeCheckIn,
                isAfterCheckIn,
                currentTime: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
            }
        });
    } catch (error) {
        console.error('Error fetching shift config:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.get('/all', protect, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const shifts = await ShiftConfig.find({}).sort({ role: 1, batch: 1 });
        res.json(shifts);
    } catch (error) {
        console.error('Error fetching shifts:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

export default router;