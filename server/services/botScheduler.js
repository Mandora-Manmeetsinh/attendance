import cron from 'node-cron';
import TelegramUser from '../models/TelegramUser.js';
import { getBotInstance } from './telegramBot.js';

export const initBotScheduler = () => {
    // Schedule times: 9:00 AM, 12:00 PM, 3:00 PM, 6:00 PM
    const alertTimes = ['0 10 * * *', '0 13 * * *', '0 16 * * *', '0 18 * * *'];

    alertTimes.forEach(time => {
        cron.schedule(time, async () => {
            console.log(`[Bot Scheduler] Running attendance update for ${time}`);
            await sendAttendanceUpdates();
        });
    });

    console.log('[Bot Scheduler] Attendance notifications scheduled (10AM, 1PM, 4PM, 6PM)');
};

const sendAttendanceUpdates = async () => {
    const bot = getBotInstance();
    if (!bot) {
        console.error('[Bot Scheduler] Bot instance not available');
        return;
    }

    try {
        const users = await TelegramUser.find();

        for (const user of users) {
            const status = user.totalPresent >= user.totalAbsent ? 'Good Standing' : 'Warning';

            const message = `📢 Attendance Update\n` +
                `Name: ${user.name}\n` +
                `Present: ${user.totalPresent}\n` +
                `Absent: ${user.totalAbsent}\n` +
                `Status: ${status}`;

            try {
                await bot.sendMessage(user.telegramChatId, message);
            } catch (err) {
                console.error(`[Bot Scheduler] Failed to send message to ${user.name}:`, err.message);
            }
        }
    } catch (error) {
        console.error('[Bot Scheduler] Error fetching users:', error);
    }
};
