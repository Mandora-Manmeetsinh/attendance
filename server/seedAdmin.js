import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from the current directory .env file
dotenv.config({ path: path.join(__dirname, '.env') });

const seedAdmin = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected!');

        // Define User Schema (Simplified for seeding)
        const userSchema = new mongoose.Schema({
            email: String,
            password: { type: String, required: true },
            full_name: String,
            role: { type: String, default: 'employee' },
            must_change_password: { type: Boolean, default: false }
        }, { timestamps: true });

        // Check if Users collection exists, if not it will be created automatically
        const User = mongoose.model('User', userSchema);

        const email = 'admin@exoticinfotech.com';
        const password = 'admin12345';
        const full_name = 'Riddhi Rana';

        // Delete all existing admins to completely reset
        await User.deleteMany({ role: 'admin' });
        console.log('Cleared existing admins from the database.');

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            email,
            password: hashedPassword,
            full_name,
            role: 'admin',
            must_change_password: false
        });

        console.log('✅ Admin account created successfully in the "users" collection!');
        console.log('Email:', email);
        console.log('Password: (The one you set above)');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding admin:', error);
        process.exit(1);
    }
};

seedAdmin();
