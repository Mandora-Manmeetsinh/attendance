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

const createAdmin = async () => {
    await connectDB();

    const adminEmail = 'admin@geoattend.com';
    const adminPassword = 'admin123';

    const userExists = await User.findOne({ email: adminEmail });

    if (userExists) {
        console.log('Admin user already exists');
        process.exit();
    }

    const user = await User.create({
        full_name: 'Admin User',
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
    });

    if (user) {
        console.log(`Admin user created: ${user.email}`);
        console.log(`Password: ${adminPassword}`);
    } else {
        console.log('Invalid user data');
    }

    process.exit();
};

createAdmin();
