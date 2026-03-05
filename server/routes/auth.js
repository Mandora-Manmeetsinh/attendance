import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                full_name: user.full_name,
                email: user.email,
                role: user.role,
                batch: user.batch,
                must_change_password: user.must_change_password,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.post('/register', async (req, res) => {
    res.status(403).json({
        message: 'Public registration is disabled. Please contact your administrator.'
    });
});

router.get('/profile', protect, async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        res.json({
            _id: user._id,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
            batch: user.batch,
            must_change_password: user.must_change_password, // NEW: Include first-login flag
            shift_start: user.shift_start,
            shift_end: user.shift_end,
            current_streak: user.current_streak,
            best_streak: user.best_streak,
            total_attendance: user.total_attendance,
            notification_preferences: user.notification_preferences,
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});

router.post('/change-password', protect, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }
        if (!user.must_change_password && currentPassword) {
            const isMatch = await user.matchPassword(currentPassword);
            if (!isMatch) {
                return res.status(401).json({ message: 'Current password is incorrect' });
            }
        }
        user.password = newPassword;
        user.must_change_password = false;
        await user.save();

        res.json({
            success: true,
            message: 'Password changed successfully',
            must_change_password: false,
        });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

export default router;