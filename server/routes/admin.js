import express from 'express';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import SystemSettings from '../models/SystemSettings.js';
import ExcelJS from 'exceljs';
import { protect, admin } from '../middleware/authMiddleware.js';
import { getBotInfo } from '../services/telegramBot.js';

const router = express.Router();

router.get('/dashboard/stats', protect, admin, async (req, res) => {
    try {
        const totalEmployees = await User.countDocuments({ role: 'employee' });

        const today = new Date().toISOString().split('T')[0];
        const attendanceToday = await Attendance.find({ date: today });

        const present = attendanceToday.filter(a => a.status === 'present').length;
        const late = attendanceToday.filter(a => a.status === 'late').length;
        const earlyExit = attendanceToday.filter(a => a.status === 'early_exit').length;
        const checkedInCount = attendanceToday.length;
        const absent = totalEmployees - checkedInCount;

        res.json({
            total: totalEmployees,
            present,
            late,
            absent: absent < 0 ? 0 : absent, // Safety check
            earlyExit
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.get('/dashboard/weekly', protect, admin, async (req, res) => {
    try {
        const weeklyData = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

            const attendance = await Attendance.find({ date: dateStr });

            weeklyData.push({
                day: dayName,
                present: attendance.filter(a => a.status === 'present').length,
                late: attendance.filter(a => a.status === 'late' || a.status === 'early_exit').length,
                absent: 0 // Calculating absent for past days is complex without shift schedules, leaving as 0 or TODO
            });
        }
        res.json(weeklyData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.get('/dashboard/top-performers', protect, admin, async (req, res) => {
    try {
        const topUsers = await User.find({ role: { $ne: 'admin' } })
            .sort({ current_streak: -1 })
            .limit(3)
            .select('full_name current_streak total_attendance');

        const formatted = topUsers.map(user => ({
            id: user._id,
            name: user.full_name,
            streak: user.current_streak || 0,
            attendance: user.total_attendance || 0,
            score: Math.min(100, Math.round(((user.current_streak || 0) / 30) * 100))
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error fetching top performers:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.get('/dashboard/activity', protect, admin, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const recentAttendance = await Attendance.find({ date: today })
            .sort({ updatedAt: -1 })
            .limit(5)
            .populate('user', 'full_name email');

        const activity = recentAttendance.map(record => ({
            id: record._id,
            user: record.user,
            status: record.check_out ? 'checked_out' : 'checked_in',
            time: record.check_out || record.check_in,
            check_in: record.check_in,
            check_out: record.check_out
        }));

        res.json(activity);
    } catch (error) {
        console.error('Error fetching activity:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.get('/settings/:key', protect, admin, async (req, res) => {
    try {
        const settings = await SystemSettings.findOne({ key: req.params.key });
        res.json(settings ? settings.value : {});
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.post('/settings/:key', protect, admin, async (req, res) => {
    try {
        const { key } = req.params;
        const value = req.body;

        const settings = await SystemSettings.findOneAndUpdate(
            { key },
            {
                key,
                value,
                updatedBy: req.user._id
            },
            { new: true, upsert: true } // Create if not exists
        );

        res.json(settings.value);
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.get('/employees', protect, admin, async (req, res) => {
    try {
        const employees = await User.find({}).select('-password').sort({ createdAt: -1 });

        const botInfo = getBotInfo();
        const formatted = employees.map(user => {
            const userObj = user.toObject();
            if (userObj.studentId && botInfo) {
                userObj.telegram_link = `https://t.me/${botInfo.username}?start=${userObj.studentId}`;
            }
            return userObj;
        });

        res.json(formatted);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

function generateTempPassword() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

function getShiftForRole(role, batch) {
    if (role === 'employee') {
        return { shift_start: '10:30:00', shift_end: '18:30:00' };
    } else if (role === 'intern') {
        if (batch === 'batch1') {
            return { shift_start: '10:30:00', shift_end: '13:30:00' };
        } else if (batch === 'batch2') {
            return { shift_start: '15:00:00', shift_end: '18:00:00' };
        }
    }
    return { shift_start: '09:00:00', shift_end: '18:00:00' };
}

router.post('/users', protect, admin, async (req, res) => {
    const { full_name, email, role, batch, phone_number, studentId } = req.body;

    try {
        if (!full_name || !email) {
            return res.status(400).json({ message: 'Name and email are required' });
        }
        if (!role || !['employee', 'intern'].includes(role)) {
            return res.status(400).json({ message: 'Role must be employee or intern' });
        }

        if (role === 'intern' && !batch) {
            return res.status(400).json({ message: 'Batch is required for interns (batch1 or batch2)' });
        }

        if (role === 'intern' && !['batch1', 'batch2'].includes(batch)) {
            return res.status(400).json({ message: 'Batch must be batch1 or batch2' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'A user with this email already exists' });
        }

        if (studentId) {
            const existingStudent = await User.findOne({ studentId });
            if (existingStudent) {
                return res.status(400).json({ message: 'This Student ID is already assigned to another user' });
            }
        }

        const tempPassword = generateTempPassword();
        const { shift_start, shift_end } = getShiftForRole(role, batch);

        const user = await User.create({
            full_name,
            email,
            password: tempPassword,
            role,
            batch: role === 'intern' ? batch : null,
            shift_start,
            shift_end,
            phone_number: phone_number || '',
            wfh_enabled: req.body.wfh_enabled || false, // [NEW]
            studentId: studentId || '',
            must_change_password: true,
            temp_password_created_at: new Date(),
        });

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            temporary_password: tempPassword,
            instructions: 'Share this temporary password with the user. They will be required to change it on first login.',
            user: {
                _id: user._id,
                full_name: user.full_name,
                email: user.email,
                role: user.role,
                batch: user.batch,
                shift_start: user.shift_start,
                shift_end: user.shift_end,
                phone_number: user.phone_number,
                studentId: user.studentId,
                telegram_link: getBotInfo() ? `https://t.me/${getBotInfo().username}?start=${user.studentId}` : null,
            },
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.put('/users/:id', protect, admin, async (req, res) => {
    const { full_name, role, batch, studentId } = req.body;

    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role === 'admin') {
            return res.status(403).json({ message: 'Cannot modify admin users' });
        }

        if (full_name) user.full_name = full_name;
        if (studentId) user.studentId = studentId;
        if (role && ['employee', 'intern'].includes(role)) {
            user.role = role;
            const { shift_start, shift_end } = getShiftForRole(role, batch || user.batch);
            user.shift_start = shift_start;
            user.shift_end = shift_end;
        }
        if (batch && ['batch1', 'batch2'].includes(batch)) {
            user.batch = batch;
            const { shift_start, shift_end } = getShiftForRole(user.role, batch);
            user.shift_start = shift_start;
            user.shift_end = shift_end;
        }

        if (req.body.wfh_enabled !== undefined) {
            user.wfh_enabled = req.body.wfh_enabled;
        }

        if (req.body.phone_number !== undefined) {
            user.phone_number = req.body.phone_number;
        }

        await user.save();

        res.json({
            success: true,
            message: 'User updated successfully',
            user: {
                _id: user._id,
                full_name: user.full_name,
                email: user.email,
                role: user.role,
                batch: user.batch,
                shift_start: user.shift_start,
                shift_end: user.shift_end,
                phone_number: user.phone_number,
                studentId: user.studentId,
                telegram_link: getBotInfo() ? `https://t.me/${getBotInfo().username}?start=${user.studentId}` : null,
            },
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.post('/users/:id/reset-password', protect, admin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role === 'admin') {
            return res.status(403).json({ message: 'Cannot reset admin passwords' });
        }
        const tempPassword = generateTempPassword();

        user.password = tempPassword;
        user.must_change_password = true;
        user.temp_password_created_at = new Date();
        await user.save();

        res.json({
            success: true,
            message: 'Password reset successfully',
            temporary_password: tempPassword,
            instructions: 'Share this new temporary password with the user.',
        });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.delete('/users/:id', protect, admin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role === 'admin') {
            return res.status(403).json({ message: 'Cannot delete admin users' });
        }

        await User.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'User deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.get('/attendance', protect, admin, async (req, res) => {
    try {
        const { startDate, endDate, shift } = req.query;
        let query = {};

        if (startDate && endDate) {
            query.date = { $gte: startDate, $lte: endDate };
        } else if (startDate) {
            query.date = startDate;
        }

        let records = await Attendance.find(query)
            .populate('user', 'full_name email role batch')
            .sort({ date: -1, 'user.full_name': 1 });

        if (shift && shift !== 'all') {
            records = records.filter(r => {
                const user = r.user;
                if (!user) return false;

                if (shift === 'employee') return user.role === 'employee';
                if (shift === 'intern_batch1') return user.role === 'intern' && user.batch === 'batch1';
                if (shift === 'intern_batch2') return user.role === 'intern' && user.batch === 'batch2';
                return true;
            });
        }

        res.json(records);
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.get('/attendance/export', protect, admin, async (req, res) => {
    try {
        const { startDate, endDate, shift } = req.query;
        let query = {};

        if (startDate && endDate) {
            query.date = { $gte: startDate, $lte: endDate };
        }

        let records = await Attendance.find(query)
            .populate('user', 'full_name email role batch')
            .sort({ date: 1, 'user.full_name': 1 });

        if (shift && shift !== 'all') {
            records = records.filter(r => {
                const user = r.user;
                if (!user) return false;
                if (shift === 'employee') return user.role === 'employee';
                if (shift === 'intern_batch1') return user.role === 'intern' && user.batch === 'batch1';
                if (shift === 'intern_batch2') return user.role === 'intern' && user.batch === 'batch2';
                return true;
            });
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Attendance Report');

        worksheet.columns = [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Name', key: 'name', width: 25 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Role', key: 'role', width: 15 },
            { header: 'Shift/Batch', key: 'shift', width: 20 },
            { header: 'Check In', key: 'check_in', width: 15 },
            { header: 'Check Out', key: 'check_out', width: 15 },
            { header: 'Worked (Mins)', key: 'worked_minutes', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Final Status', key: 'final_status', width: 15 },
        ];

        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        const addRecordRow = (record) => {
            const user = record.user || {};
            worksheet.addRow({
                date: record.date,
                name: user.full_name || 'N/A',
                email: user.email || 'N/A',
                role: user.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'N/A',
                shift: user.role === 'intern' ? (user.batch ? user.batch.toUpperCase() : 'N/A') : (user.role === 'employee' ? 'OFFICE' : 'N/A'),
                check_in: record.check_in ? new Date(record.check_in).toLocaleTimeString() : 'N/A',
                check_out: record.check_out ? new Date(record.check_out).toLocaleTimeString() : 'N/A',
                worked_minutes: record.worked_minutes || 0,
                status: record.status || 'N/A',
                final_status: record.final_status || record.status || 'N/A',
            });
        };

        const employees = records.filter(r => r.user?.role === 'employee');
        const interns = records.filter(r => r.user?.role === 'intern');

        if (employees.length > 0) {
            const row = worksheet.addRow({ date: '--- EMPLOYEES ---' });
            row.font = { bold: true };
            employees.forEach(addRecordRow);
        }

        if (interns.length > 0) {
            if (employees.length > 0) worksheet.addRow([]); // Spacer
            const row = worksheet.addRow({ date: '--- INTERNS ---' });
            row.font = { bold: true };
            interns.forEach(addRecordRow);
        }

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=' + `attendance_${startDate || 'all'}_to_${endDate || 'all'}.xlsx`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error exporting attendance:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

export default router;