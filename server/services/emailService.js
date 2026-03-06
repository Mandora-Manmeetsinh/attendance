import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_PORT == 465,
    auth: {
        user: process.env.EMAIL_USER || 'placeholder@example.com',
        pass: process.env.EMAIL_PASS || 'password',
    },
});

export const sendEmail = async (to, subject, text) => {
    try {
        const info = await transporter.sendMail({
            from: `"Radius Check" <${process.env.EMAIL_USER || 'noreply@radiuscheck.com'}>`,
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

export const sendCheckInReminder = async (user) => {
    const message = `Hi ${user.full_name}, reminder to check-in for your shift starting in 5 minutes.`;
    return sendEmail(user.email, 'Check-in Reminder', message);
};

export const sendCheckInConfirmation = async (user, checkInTime) => {
    const message = `Hi ${user.full_name}, you checked in successfully at ${checkInTime.toLocaleTimeString()}.`;
    return sendEmail(user.email, 'Check-in Confirmation', message);
};

export const sendBreakEndingReminder = async (user) => {
    const message = `Hi ${user.full_name}, break time is over. Please resume your work timer.`;
    return sendEmail(user.email, 'Break Ending Reminder', message);
};

export const sendCheckOutReminder = async (user) => {
    const message = `Hi ${user.full_name}, it looks like you forgot to check-out. Please remember to check-out for the day.`;
    return sendEmail(user.email, 'Forgot Check-out Reminder', message);
};

export const sendCheckOutConfirmation = async (user, checkOutTime) => {
    const message = `Hi ${user.full_name}, you have checked out successfully at ${checkOutTime.toLocaleTimeString()}. Have a great day!`;
    return sendEmail(user.email, 'Check-out Confirmation', message);
};
