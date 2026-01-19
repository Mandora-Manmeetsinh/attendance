import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    full_name: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['admin', 'employee'],
        default: 'employee',
    },
    shift_start: {
        type: String,
        default: '09:00:00',
    },
    shift_end: {
        type: String,
        default: '18:00:00',
    },
    current_streak: {
        type: Number,
        default: 0,
    },
    best_streak: {
        type: Number,
        default: 0,
    },
    total_attendance: {
        type: Number,
        default: 0,
    },
    last_check_in: {
        type: Date,
    },
    notification_preferences: {
        email_notifications: { type: Boolean, default: true },
        push_notifications: { type: Boolean, default: true },
        late_alerts: { type: Boolean, default: true },
        early_exit_alerts: { type: Boolean, default: true },
        daily_summary: { type: Boolean, default: false },
    }
}, {
    timestamps: true,
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Encrypt password using bcrypt
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model('User', userSchema);

export default User;
