import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

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
        });
    } else {
        console.log('No admin users found.');
    }

    process.exit();
};

findAdmin();
