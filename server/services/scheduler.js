import cron from 'node-cron';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import ShiftConfig from '../models/ShiftConfig.js';
import { sendCheckInReminder, sendBreakEndingReminder, sendCheckOutReminder } from './emailService.js';

const initScheduler = () => {
    console.log('Initializing Attendance Schedulers...');

    // 1️⃣ Check-in Reminder (5 minutes before 10:30 AM shift start) - Sent at 10:25 AM
    cron.schedule('25 10 * * *', async () => {
        console.log('Running 10:25 AM Check-in Reminders...');
        try {
            // Interns Batch 1 and Employees start at 10:30 AM
            const users = await User.find({
                role: { $in: ['employee', 'intern'] },
                $or: [
                    { role: 'employee' },
                    { role: 'intern', batch: 'batch1' }
                ]
            });

            for (const user of users) {
                await sendCheckInReminder(user);
            }
        } catch (error) {
            console.error('Error in 10:25 AM reminder:', error);
        }
    });

    // 2️⃣ Automatic Break Pause for Full-Time Employees at 2:00 PM
    cron.schedule('0 14 * * *', async () => {
        console.log('Running 2:00 PM Automatic Break Pause...');
        try {
            const today = new Date().toISOString().split('T')[0];
            const employees = await User.find({ role: 'employee' });
            const employeeIds = employees.map(e => e._id);

            const result = await Attendance.updateMany(
                {
                    user: { $in: employeeIds },
                    date: today,
                    check_in: { $exists: true },
                    check_out: { $exists: false },
                    is_on_break: false
                },
                {
                    $set: {
                        is_on_break: true,
                        break_start: new Date()
                    }
                }
            );
            console.log(`Paused ${result.modifiedCount} sessions for mandatory break.`);
        } catch (error) {
            console.error('Error in 2:00 PM break pause:', error);
        }
    });

    // 3️⃣ Break Ending Reminder at 2:45 PM
    cron.schedule('45 14 * * *', async () => {
        console.log('Running 2:45 PM Break Ending Reminders...');
        try {
            const employees = await User.find({ role: 'employee' });
            for (const employee of employees) {
                await sendBreakEndingReminder(employee);
            }
        } catch (error) {
            console.error('Error in 2:45 PM reminder:', error);
        }
    });

    // 4️⃣ Forgot Check-out Reminders
    // We run every 5 minutes and check for users whose shifts have ended recently
    cron.schedule('*/5 * * * *', async () => {
        console.log('Running Check-out Reminder Check...');
        try {
            const now = new Date();
            const today = new Date().toISOString().split('T')[0];

            // Get all shift configs to know end times
            const shiftConfigs = await ShiftConfig.find({});

            for (const config of shiftConfigs) {
                const [endH, endM] = config.shift_end.split(':').map(Number);
                const shiftEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH, endM);
                const reminderTime = new Date(shiftEnd.getTime() + 5 * 60000);

                if (now >= reminderTime && now < new Date(reminderTime.getTime() + 6 * 60000)) {
                    const query = { role: config.role };
                    if (config.batch) query.batch = config.batch;

                    const users = await User.find(query);
                    const userIds = users.map(u => u._id);

                    const forgetfulUsers = await Attendance.find({
                        user: { $in: userIds },
                        date: today,
                        check_in: { $exists: true },
                        check_out: { $exists: false }
                    }).populate('user');

                    for (const record of forgetfulUsers) {
                        await sendCheckOutReminder(record.user);
                    }
                }
            }
        } catch (error) {
            console.error('Error in check-out reminder check:', error);
        }
    });
};

export default initScheduler;
