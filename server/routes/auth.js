import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import { protect } from '../middleware/authMiddleware.js';
import crypto from 'crypto';
import sendEmail from '../utils/sendEmail.js';

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

router.get('/admin-exists', async (req, res) => {
    try {
        const adminExists = await User.exists({ role: 'admin' });
        res.json({ exists: !!adminExists });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

router.post('/register', async (req, res) => {
    const { full_name, email, password } = req.body;

    try {
        const adminExists = await User.exists({ role: 'admin' });

        if (adminExists) {
            return res.status(403).json({
                message: 'Public registration is disabled. Please contact your administrator.'
            });
        }

        // Create the first admin
        const user = await User.create({
            full_name,
            email,
            password,
            role: 'admin',
            must_change_password: false // First admin doesn't need to change password immediately
        });

        res.status(201).json({
            _id: user._id,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
            message: 'Admin account created successfully'
        });
    } catch (error) {
        console.error(error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'User already exists' });
        }
        res.status(500).json({ message: 'Server Error' });
    }
});

router.get('/profile', protect, async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

        const attendanceThisMonth = await Attendance.find({
            user: user._id,
            date: { $gte: startOfMonth, $lte: endOfMonth }
        });

        const stats = {
            late: attendanceThisMonth.filter(a => a.status === 'late' || a.is_late).length,
            wfh: attendanceThisMonth.filter(a => a.work_mode === 'wfh').length,
            leave: 0 // TODO: Implement leave tracking if applicable, or count absences
        };

        res.json({
            _id: user._id,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
            batch: user.batch,
            must_change_password: user.must_change_password,
            avatar_url: user.avatar_url,
            monthly_limits: user.monthly_limits,
            month_stats: stats,
            shift_start: user.shift_start,
            shift_end: user.shift_end,
            current_streak: user.current_streak,
            best_streak: user.best_streak,
            total_attendance: user.total_attendance,
            notification_preferences: user.notification_preferences,
            phone_number: user.phone_number,
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});

router.put('/profile', protect, async (req, res) => {
    const { full_name, phone_number, avatar_url, email } = req.body;

    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'Email is already in use' });
            }
            user.email = email;
        }

        if (full_name) user.full_name = full_name;
        if (phone_number !== undefined) user.phone_number = phone_number;
        if (avatar_url !== undefined) user.avatar_url = avatar_url;

        await user.save();

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                _id: user._id,
                full_name: user.full_name,
                email: user.email,
                avatar_url: user.avatar_url,
                phone_number: user.phone_number,
            },
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.get('/profile/activity', protect, async (req, res) => {
    try {
        const activities = await Attendance.find({ user: req.user._id })
            .sort({ date: -1, createdAt: -1 })
            .limit(5);
        res.json(activities);
    } catch (error) {
        console.error('Error fetching activity:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

import uploadAvatar from '../middleware/uploadMiddleware.js';

router.post('/upload-avatar', protect, uploadAvatar.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a file' });
        }

        const user = await User.findById(req.user._id);
        const avatarPath = `/uploads/avatars/${req.file.filename}`;

        user.avatar_url = avatarPath;
        await user.save();

        res.json({
            success: true,
            message: 'Avatar uploaded successfully',
            avatar_url: avatarPath
        });
    } catch (error) {
        console.error('Error uploading avatar:', error);
        res.status(500).json({ message: 'Server Error' });
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

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found with this email' });
        }

        const resetToken = crypto.randomBytes(20).toString('hex');
        user.reset_password_token = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.reset_password_expires = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save();

        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/reset-password/${resetToken}`;
        const message = `You are receiving this email because you (or someone else) have requested the reset of a password. Please click the following link to complete the process: \n\n ${resetUrl}`;
        
        try {
            await sendEmail({
                to: user.email,
                subject: 'Password Reset Request',
                text: message,
            });
            res.status(200).json({ success: true, message: 'Email sent' });
        } catch (error) {
            user.reset_password_token = undefined;
            user.reset_password_expires = undefined;
            await user.save();
            return res.status(500).json({ message: 'Email could not be sent' });
        }
    } catch (error) {
        console.error('Error in forgot password:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.post('/reset-password/:token', async (req, res) => {
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    try {
        const user = await User.findOne({
            reset_password_token: resetPasswordToken,
            reset_password_expires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired password reset token' });
        }

        if (!req.body.password || req.body.password.length < 6) {
             return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        user.password = req.body.password;
        user.reset_password_token = undefined;
        user.reset_password_expires = undefined;
        user.must_change_password = false;

        await user.save();
        res.status(200).json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

export default router;