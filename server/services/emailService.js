import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

export const sendEmail = async (to, subject, text) => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const info = await transporter.sendMail({
            from: `"Attendance Portal" <${process.env.EMAIL_USER || 'noreply@attendanceportal.com'}>`,
            to,
            subject,
            text,
        });
        console.log('Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

const formatDate = (date) => date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
const formatTime = (date) => date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

export const sendCheckInReminder = async (user) => {
    const subject = 'Friendly Reminder: Shift Starting Soon';
    const message = `Hello ${user.full_name},

Your shift is scheduled to begin in 5 minutes. Please remember to check-in using the Attendance Portal once you are within the designated zone.

Have a productive day!

Best regards,
Attendance Portal`;
    return sendEmail(user.email, subject, message);
};

export const sendCheckInConfirmation = async (user, checkInTime) => {
    const subject = 'Check-In Confirmation';
    const message = `Hello ${user.full_name},

This is to confirm that you have successfully checked in today, ${formatDate(checkInTime)}, at ${formatTime(checkInTime)}.

Your attendance has been recorded.

Best regards,
Attendance Portal`;
    return sendEmail(user.email, subject, message);
};

export const sendBreakEndingReminder = async (user) => {
    const subject = 'Break Period Conclusion';
    const message = `Hello ${user.full_name},

Your scheduled break period has concluded. Please return to the Attendance Portal to resume your work timer.

Thank you,
Attendance Portal`;
    return sendEmail(user.email, subject, message);
};

export const sendCheckOutReminder = async (user) => {
    const subject = 'Action Required: Pending Check-Out';
    const message = `Hello ${user.full_name},

Our records show that your shift has ended, but you have not yet checked out. Please log in to the Attendance Portal to record your departure and ensure your work hours are accurately logged.

Regards,
Attendance Portal`;
    return sendEmail(user.email, subject, message);
};

export const sendCheckOutConfirmation = async (user, checkOutTime) => {
    const subject = 'Check-Out Confirmation';
    const message = `Hello ${user.full_name},

You have successfully checked out for the day at ${formatTime(checkOutTime)}. 

Thank you for your hard work today. We hope you have a relaxing evening!

Best regards,
Attendance Portal`;
    return sendEmail(user.email, subject, message);
};
