import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    studentId: {
        type: String,
        unique: true,
        sparse: true,
    },
    password: {
        type: String,
        required: true,
    },
    full_name: {
        type: String,
        required: true,
    },
    phone_number: {
        type: String,
        default: '',
    },
    role: {
        type: String,
        enum: ['admin', 'employee', 'intern'],
        default: 'employee',
    },
    batch: {
        type: String,
        enum: ['batch1', 'batch2', null],
        default: null,
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
    },
    wfh_enabled: {
        type: Boolean,
        default: false,
    },
    must_change_password: {
        type: Boolean,
        default: true,
    },
    temp_password_created_at: {
        type: Date,
    },
}, {
    timestamps: true,
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model('User', userSchema);

export default User;
