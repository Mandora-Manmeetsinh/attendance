import cron from 'node-cron';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import ShiftConfig from '../models/ShiftConfig.js';
import Holiday from '../models/Holiday.js';
import { sendCheckInReminder, sendBreakEndingReminder, sendCheckOutReminder } from './emailService.js';

const initScheduler = () => {
    const timezone = 'Asia/Kolkata';
    console.log('Attendance schedulers started.');

    // Helper to get today's date string in IST
    const getISTToday = () => {
        const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    };

    // 10:25 AM — remind employees and batch 1 interns to check in
    cron.schedule('25 10 * * *', async () => {
        try {
            const today = getISTToday();
            const isHoliday = await Holiday.findOne({ date: today });
            if (isHoliday) {
                console.log(`Skipping check-in reminder: Today is holiday (${isHoliday.name})`);
                return;
            }

            const users = await User.find({
                role: { $in: ['employee', 'intern'] },
                $or: [{ role: 'employee' }, { role: 'intern', batch: 'batch1' }]
            });
            for (const user of users) {
                await sendCheckInReminder(user);
            }
        } catch (error) {
            console.error('Check-in reminder failed:', error);
        }
    }, { scheduled: true, timezone: timezone });

    // 2:00 PM — pause timers for employees on mandatory break
    cron.schedule('0 14 * * *', async () => {
        try {
            const today = getISTToday();
            const employeeIds = await User.find({ role: 'employee' }).distinct('_id');

            const result = await Attendance.updateMany(
                {
                    user: { $in: employeeIds },
                    date: today,
                    check_in: { $exists: true },
                    check_out: { $exists: false },
                    is_on_break: false
                },
                { $set: { is_on_break: true, break_start: new Date() } }
            );
            console.log(`[${new Date().toISOString()}] Break started for ${result.modifiedCount} employees.`);
        } catch (error) {
            console.error('Break pause failed:', error);
        }
    }, { scheduled: true, timezone: timezone });

    // 2:45 PM — remind employees break is ending
    cron.schedule('45 14 * * *', async () => {
        try {
            const employees = await User.find({ role: 'employee' });
            for (const employee of employees) {
                await sendBreakEndingReminder(employee);
            }
        } catch (error) {
            console.error('Break ending reminder failed:', error);
        }
    }, { scheduled: true, timezone: timezone });

    // Every 5 mins — send check-out reminder if shift just ended
    cron.schedule('*/5 * * * *', async () => {
        try {
            const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
            const today = getISTToday();
            const shiftConfigs = await ShiftConfig.find({});

            for (const config of shiftConfigs) {
                const [endH, endM] = config.shift_end.split(':').map(Number);
                const shiftEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH, endM);
                const reminderTime = new Date(shiftEnd.getTime() + 5 * 60000);

                // Only fire in the 6-minute window right after the reminder time
                if (now >= reminderTime && now < new Date(reminderTime.getTime() + 6 * 60000)) {
                    const query = { role: config.role };
                    if (config.batch) query.batch = config.batch;

                    const userIds = await User.find(query).distinct('_id');
                    const forgetfulUsers = await Attendance.find({
                        user: { $in: userIds },
                        date: today,
                        check_in: { $exists: true },
                        check_out: { $exists: false },
                        checkout_reminder_sent: false
                    }).populate('user');

                    for (const record of forgetfulUsers) {
                        try {
                            await sendCheckOutReminder(record.user);
                            record.checkout_reminder_sent = true;
                            await record.save();
                        } catch (emailError) {
                            console.error(`Check-out reminder failed for ${record.user.full_name}:`, emailError);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Check-out reminder check failed:', error);
        }
    }, { scheduled: true, timezone: timezone });
};

export default initScheduler;
