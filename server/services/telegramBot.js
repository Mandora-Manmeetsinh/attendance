import TelegramBot from 'node-telegram-bot-api';
import TelegramUser from '../models/TelegramUser.js';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
    console.error('TELEGRAM_BOT_TOKEN is missing in .env file');
}

let bot;
let botInfo;

export const initTelegramBot = () => {
    if (!token) return;

    bot = new TelegramBot(token, { polling: true });

    bot.getMe().then(info => {
        botInfo = info;
        console.log(`[Telegram Bot] Initialized as @${info.username}`);
    });

    bot.onText(/\/start ?(.*)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const startParam = match[1];

        if (startParam) {
            try {
                let existing = await TelegramUser.findOne({ telegramChatId: chatId });
                if (existing) {
                    return bot.sendMessage(chatId, `⚠️ Your Telegram is already linked to ${existing.name} (ID: ${existing.studentId}).`);
                }

                const systemUser = await User.findOne({ studentId: startParam });
                if (!systemUser) {
                    return bot.sendMessage(chatId, `❌ Invalid link. No user found with ID: ${startParam}`);
                }

                const alreadyLinked = await TelegramUser.findOne({ studentId: startParam });
                if (alreadyLinked) {
                    return bot.sendMessage(chatId, `❌ This ID (${startParam}) is already linked to another Telegram account.`);
                }

                const newLink = new TelegramUser({
                    name: systemUser.full_name,
                    studentId: startParam,
                    telegramChatId: chatId
                });

                await newLink.save();
                return bot.sendMessage(chatId, `✅ *Linking Successful!*\n\nHello ${systemUser.full_name}, your account is now connected to this bot.\nYou will receive attendance updates here.`, { parse_mode: 'Markdown' });

            } catch (error) {
                console.error('[Telegram Bot] Deep Link Error:', error);
                return bot.sendMessage(chatId, '❌ An error occurred while linking your account.');
            }
        }

        const message = `Welcome to the Attendance Notification Bot! 📢\n\nTo register, use the unique link provided by your admin, or use:\n/register <studentId> <Your Name>`;
        bot.sendMessage(chatId, message);
    });

    bot.onText(/\/register (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const input = match[1].split(' ');

        if (input.length < 2) {
            return bot.sendMessage(chatId, '❌ Invalid format. Use: /register <studentId> <Name>');
        }

        const studentId = input[0];
        const name = input.slice(1).join(' ');

        try {
            let user = await TelegramUser.findOne({ telegramChatId: chatId });
            if (user) {
                return bot.sendMessage(chatId, `⚠️ You are already registered as ${user.name} (ID: ${user.studentId}).`);
            }

            user = await TelegramUser.findOne({ studentId });
            if (user) {
                return bot.sendMessage(chatId, `❌ This Student ID is already linked to another Telegram account.`);
            }

            user = new TelegramUser({
                name,
                studentId,
                telegramChatId: chatId
            });

            await user.save();
            bot.sendMessage(chatId, `✅ Registration successful!\nName: ${name}\nID: ${studentId}\n\nYou will receive attendance updates 4 times daily.`);

        } catch (error) {
            console.error('[Telegram Bot] Registration Error:', error);
            bot.sendMessage(chatId, '❌ An error occurred during registration. Please try again later.');
        }
    });

    return bot;
};

export const getBotInstance = () => bot;
export const getBotInfo = () => botInfo;