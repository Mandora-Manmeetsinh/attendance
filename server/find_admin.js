import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const findAdmin = async () => {
    await connectDB();

    const admins = await User.find({ role: 'admin' });

    if (admins.length > 0) {
        console.log('Admin users found:');
        admins.forEach(admin => {
            console.log(`Email: ${admin.email}, Name: ${admin.full_name}`);
            console.log(`Password: ${admin.password}`);
        });
    } else {
        console.log('No admin users found.');
    }

    process.exit();
};

findAdmin();