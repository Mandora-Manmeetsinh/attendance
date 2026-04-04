import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const sendEmail = async ({ to, subject, text, html }) => {
    // Basic nodemailer configuration
    // Uses ethereal email or standard SMTP depending on env vars. Fallback to console if not provided.
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
        port: process.env.EMAIL_PORT || 587,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@radiuscheck.com',
        to,
        subject,
        text,
        html,
    };

    if (!process.env.EMAIL_USER && !process.env.EMAIL_PASS) {
        console.log("-----------------------------------------");
        console.log("No SMTP details provided. Mock Email Send:");
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Text: ${text}`);
        console.log("-----------------------------------------");
        return;
    }

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${to}`);
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

export default sendEmail;
