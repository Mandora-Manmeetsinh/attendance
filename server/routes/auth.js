import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import { protect } from '../middleware/authMiddleware.js';
import crypto from 'crypto';
import sendEmail from '../utils/sendEmail.js';
import uploadAvatar from '../middleware/uploadMiddleware.js';

const router = express.Router();

/* ================= TOKEN ================= */
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

/* ================= LOGIN ================= */
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            return res.json({
                _id: user._id,
                full_name: user.full_name,
                email: user.email,
                role: user.role,
                batch: user.batch,
                must_change_password: user.must_change_password,
                token: generateToken(user._id),
            });
        } else {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server Error' });
    }
});

/* ================= ADMIN EXISTS ================= */
router.get('/admin-exists', async (req, res) => {
    try {
        const adminExists = await User.exists({ role: 'admin' });
        return res.json({ exists: !!adminExists });
    } catch (error) {
        return res.status(500).json({ message: 'Server Error' });
    }
});

/* ================= REGISTER (ONLY FIRST ADMIN) ================= */
router.post('/register', async (req, res) => {
    try {
        const adminExists = await User.findOne({ role: 'admin' });

        if (adminExists) {
            return res.status(403).json({
                message: 'Admin already exists'
            });
        }

        const { full_name, email, password } = req.body;

        const user = await User.create({
            full_name,
            email,
            password,
            role: 'admin',
            must_change_password: false
        });

        return res.status(201).json({
            _id: user._id,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
            message: 'Admin created successfully'
        });

    } catch (error) {
        console.error(error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'User already exists' });
        }
        return res.status(500).json({ message: 'Server Error' });
    }
});

/* ================= PROFILE ================= */
router.get('/profile', protect, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const attendanceThisMonth = await Attendance.find({
            user: user._id,
            date: {
                $gte: startOfMonth,
                $lte: endOfMonth
            }
        });

        const stats = {
            late: attendanceThisMonth.filter(a => a.status === 'late' || a.is_late).length,
            wfh: attendanceThisMonth.filter(a => a.work_mode === 'wfh').length,
            leave: 0
        };

        return res.json({
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

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server Error' });
    }
});

/* ================= UPDATE PROFILE ================= */
router.put('/profile', protect, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const { full_name, phone_number, avatar_url, email } = req.body;

        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'Email already in use' });
            }
            user.email = email;
        }

        if (full_name) user.full_name = full_name;
        if (phone_number !== undefined) user.phone_number = phone_number;
        if (avatar_url !== undefined) user.avatar_url = avatar_url;

        await user.save();

        return res.json({
            success: true,
            message: 'Profile updated successfully',
            user
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server Error' });
    }
});

/* ================= ACTIVITY ================= */
router.get('/profile/activity', protect, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        const activities = await Attendance.find({ user: req.user._id })
            .sort({ date: -1, createdAt: -1 })
            .limit(5);

        return res.json(activities);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server Error' });
    }
});

/* ================= UPLOAD AVATAR ================= */
router.post('/upload-avatar', protect, uploadAvatar.single('avatar'), async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a file' });
        }

        const user = await User.findById(req.user._id);
        user.avatar_url = `/uploads/avatars/${req.file.filename}`;
        await user.save();

        return res.json({
            success: true,
            message: 'Avatar uploaded successfully',
            avatar_url: user.avatar_url
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server Error' });
    }
});

/* ================= CHANGE PASSWORD ================= */
router.post('/change-password', protect, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        if (!user.must_change_password) {
            const isMatch = await user.matchPassword(currentPassword);
            if (!isMatch) {
                return res.status(401).json({ message: 'Current password incorrect' });
            }
        }

        user.password = newPassword;
        user.must_change_password = false;

        await user.save();

        return res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server Error' });
    }
});

/* ================= FORGOT PASSWORD ================= */
router.post('/forgot-password', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const resetToken = crypto.randomBytes(20).toString('hex');

        user.reset_password_token = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.reset_password_expires = Date.now() + 10 * 60 * 1000;

        await user.save();

        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

        await sendEmail({
            to: user.email,
            subject: 'Password Reset',
            text: resetUrl,
        });

        return res.json({ success: true, message: 'Email sent' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server Error' });
    }
});

/* ================= RESET PASSWORD ================= */
router.post('/reset-password/:token', async (req, res) => {
    try {
        const resetToken = crypto.createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        const user = await User.findOne({
            reset_password_token: resetToken,
            reset_password_expires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        user.password = req.body.password;
        user.reset_password_token = undefined;
        user.reset_password_expires = undefined;
        user.must_change_password = false;

        await user.save();

        return res.json({ success: true, message: 'Password reset successful' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server Error' });
    }
});

export default router;
