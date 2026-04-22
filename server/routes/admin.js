import express from 'express';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import SystemSettings from '../models/SystemSettings.js';
import Holiday from '../models/Holiday.js';
import ShiftConfig from '../models/ShiftConfig.js';
import ExcelJS from 'exceljs';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/dashboard/stats', protect, admin, async (req, res) => {
    try {
        const totalEmployees = await User.countDocuments({ role: { $ne: 'admin' } });
 
        const today = new Date().toISOString().split('T')[0];
        const attendanceToday = await Attendance.find({ date: today });

        const present = attendanceToday.filter(a => a.status === 'present').length;
        const late = attendanceToday.filter(a => a.status === 'late').length;
        const earlyExit = attendanceToday.filter(a => a.status === 'early_exit').length;
        const checkedInCount = attendanceToday.length;
        const absent = totalEmployees - checkedInCount;
        
        const isHoliday = await Holiday.findOne({ date: today });

        res.json({
            total: totalEmployees,
            present,
            late,
            absent: isHoliday ? 0 : (absent < 0 ? 0 : absent),
            earlyExit,
            isHoliday: !!isHoliday,
            holidayName: isHoliday ? isHoliday.name : null
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

            const [attendance, isHoliday] = await Promise.all([
                Attendance.find({ date: dateStr }),
                Holiday.findOne({ date: dateStr })
            ]);

            weeklyData.push({
                day: dayName,
                present: attendance.filter(a => a.status === 'present').length,
                late: attendance.filter(a => a.status === 'late' || a.status === 'early_exit').length,
                absent: 0,
                isHoliday: !!isHoliday
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
            { new: true, upsert: true }
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
        res.json(employees);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Holiday Management
router.get('/holidays', protect, admin, async (req, res) => {
    try {
        const holidays = await Holiday.find().sort({ date: 1 });
        res.json(holidays);
    } catch (error) {
        console.error('Error fetching holidays', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.post('/holidays', protect, admin, async (req, res) => {
    const { date, name } = req.body;
    try {
        if (!date || !name) return res.status(400).json({ message: 'Date and name are required' });
        
        const existing = await Holiday.findOne({ date });
        if (existing) {
            return res.status(400).json({ message: 'A holiday already exists for this date' });
        }

        const holiday = await Holiday.create({
            date,
            name,
            createdBy: req.user._id
        });

        res.status(201).json(holiday);
    } catch (error) {
        console.error('Error creating holiday', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.delete('/holidays/:id', protect, admin, async (req, res) => {
    try {
        const holiday = await Holiday.findById(req.params.id);
        if (!holiday) {
            return res.status(404).json({ message: 'Holiday not found' });
        }
        await Holiday.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Holiday removed successfully' });
    } catch (error) {
        console.error('Error deleting holiday', error);
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

async function getShiftForRole(role, batch) {
    try {
        const query = { role };
        if (role === 'intern') {
            query.batch = batch;
        } else {
            query.batch = null;
        }
        
        const config = await ShiftConfig.findOne(query);
        if (config) {
            return { shift_start: config.shift_start, shift_end: config.shift_end };
        }
    } catch (error) {
        console.error('Error in getShiftForRole:', error);
    }
    
    // Fallback defaults if no config found in database
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
        const { shift_start, shift_end } = await getShiftForRole(role, batch);

        const user = await User.create({
            full_name,
            email,
            password: tempPassword,
            role,
            batch: role === 'intern' ? batch : null,
            shift_start,
            shift_end,
            phone_number: phone_number || '',
            wfh_enabled: req.body.wfh_enabled || false,
            monthly_limits: req.body.monthly_limits || { leave: 2, late: 3, wfh: 2 },
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
                monthly_limits: user.monthly_limits,
            },
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.put('/users/:id', protect, admin, async (req, res) => {
    const { full_name, role, batch, studentId, monthly_limits } = req.body;

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
            const { shift_start, shift_end } = await getShiftForRole(role, batch || user.batch);
            user.shift_start = shift_start;
            user.shift_end = shift_end;
        }
        if (batch && ['batch1', 'batch2'].includes(batch)) {
            user.batch = batch;
            const { shift_start, shift_end } = await getShiftForRole(user.role, batch);
            user.shift_start = shift_start;
            user.shift_end = shift_end;
        }

        if (monthly_limits) {
            user.monthly_limits = { ...user.monthly_limits.toObject(), ...monthly_limits };
        }

        if (req.body.wfh_enabled !== undefined) {
            user.wfh_enabled = req.body.wfh_enabled;
        }

        if (req.body.phone_number !== undefined) {
            user.phone_number = req.body.phone_number;
        }

        if (req.body.avatar_url !== undefined) {
            user.avatar_url = req.body.avatar_url;
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
                monthly_limits: user.monthly_limits,
                avatar_url: user.avatar_url,
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

        // 1. Setup Workbook & Professional Worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Attendance Analytics');
        
        // 2. Add Branded Title & Meta Data
        worksheet.mergeCells('A1:L1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'EXOTIC INFOTECH - ATTENDANCE INTELLIGENCE REPORT';
        titleCell.font = { name: 'Arial Black', size: 16, color: { argb: 'FFFFFFFF' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };

        worksheet.mergeCells('A2:L2');
        const dateRangeCell = worksheet.getCell('A2');
        dateRangeCell.value = `Period: ${startDate || 'All Time'} to ${endDate || 'Present'}`;
        dateRangeCell.font = { bold: true, italic: true, color: { argb: 'FF4F46E5' } };
        dateRangeCell.alignment = { horizontal: 'center' };

        // 3. Add Analytics Summary Section
        const totalRecords = records.length;
        const totalLate = records.filter(r => r.status === 'late').length;
        const totalViolations = records.filter(r => r.is_policy_violation).length;
        const totalPresent = records.filter(r => r.status === 'present').length;

        worksheet.addRow([]); // Spacer
        worksheet.addRow(['SUMMARY ANALYTICS', '', '', '', '', '', '', '', '', '', '', '']);
        const summaryHeader = worksheet.getRow(4);
        summaryHeader.font = { bold: true, size: 12 };
        
        worksheet.addRow(['Total Employees Checked-in', totalRecords, '', 'Total On-Time', totalPresent, '', 'Total Late Arrivals', totalLate, '', 'Policy Violations', totalViolations]);
        worksheet.getRow(5).font = { bold: true };
        worksheet.getRow(5).alignment = { horizontal: 'left' };
        
        worksheet.addRow([]); // Spacer

        // 4. Define Table Columns
        const headerRowIndex = 7;
        worksheet.columns = [
            { header: 'LOG DATE', key: 'date', width: 15 },
            { header: 'TEAM MEMBER', key: 'name', width: 25 },
            { header: 'EMAIL IDENTITY', key: 'email', width: 30 },
            { header: 'ROLE', key: 'role', width: 15 },
            { header: 'SHIFT/BATCH', key: 'shift', width: 15 },
            { header: 'ENTRY (IST)', key: 'check_in', width: 12 },
            { header: 'EXIT (IST)', key: 'check_out', width: 12 },
            { header: 'BREAKS (MIN)', key: 'break_minutes', width: 12 },
            { header: 'PRODUCTION', key: 'worked_hours', width: 18 },
            { header: 'MODE', key: 'work_mode', width: 12 },
            { header: 'COMPLIANCE', key: 'status', width: 15 },
            { header: 'ALERT', key: 'violation', width: 12 },
        ];

        // 5. Professional Header Styling
        const headerRow = worksheet.getRow(headerRowIndex);
        headerRow.height = 30;
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Dark Slate
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // 6. Data Injection & Conditional Styling
        records.forEach((record, idx) => {
            const user = record.user || {};
            const workedMins = record.worked_minutes || 0;
            const hours = Math.floor(workedMins / 60);
            const mins = workedMins % 60;
            const productionStr = `${hours}h ${mins}m`;

            const row = worksheet.addRow({
                date: record.date,
                name: (user.full_name || 'N/A').toUpperCase(),
                email: user.email || 'N/A',
                role: user.role ? (user.role.toUpperCase()) : 'N/A',
                shift: user.role === 'intern' ? (user.batch ? user.batch.toUpperCase() : 'N/A') : 'OFFICE',
                check_in: record.check_in ? new Date(record.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—',
                check_out: record.check_out ? new Date(record.check_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : (record.check_in ? 'ACTIVE' : '—'),
                break_minutes: record.break_minutes || 0,
                worked_hours: productionStr,
                work_mode: (record.work_mode || 'office').toUpperCase(),
                status: (record.status || 'N/A').toUpperCase(),
                violation: record.is_policy_violation ? '⚠️ ALERT' : '✅ CLEAN',
            });

            // Styling for each row
            row.alignment = { vertical: 'middle', horizontal: 'center' };
            
            // Zebra Striping
            if (idx % 2 === 0) {
                row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            }

            // Status Color Coding
            const statusCell = row.getCell('status');
            if (record.status === 'present') {
                statusCell.font = { bold: true, color: { argb: 'FF10B981' } }; // Green
            } else if (record.status === 'late' || record.status === 'early_exit') {
                statusCell.font = { bold: true, color: { argb: 'FFF59E0B' } }; // Orange/Amber
            } else if (record.status === 'absent') {
                statusCell.font = { bold: true, color: { argb: 'FFEF4444' } }; // Red
            }

            // Violation Highlighting
            const violationCell = row.getCell('violation');
            if (record.is_policy_violation) {
                violationCell.font = { bold: true, color: { argb: 'FFEF4444' } };
            }

            // Cell Borders
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                };
            });
        });

        // 7. Final Polish: Auto-filter & Freeze Panes
        worksheet.autoFilter = {
            from: { row: headerRowIndex, column: 1 },
            to: { row: headerRowIndex + records.length, column: 12 }
        };
        worksheet.views = [{ state: 'frozen', ySplit: headerRowIndex }];

        // 8. Stream Response
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=' + `attendance_analytics_${startDate || 'full'}.xlsx`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error exporting attendance:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

export default router;