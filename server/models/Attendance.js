import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    office: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Office',
    },
    date: {
        type: String, // YYYY-MM-DD
        required: true,
    },
    check_in: {
        type: Date,
    },
    check_out: {
        type: Date,
    },
    check_in_lat: {
        type: Number,
    },
    check_in_lng: {
        type: Number,
    },
    check_out_lat: {
        type: Number,
    },
    check_out_lng: {
        type: Number,
    },
    distance_at_check_in: {
        type: Number,
    },
    distance_at_check_out: {
        type: Number,
    },
    status: {
        type: String,
        enum: ['present', 'late', 'early_exit', 'absent'],
        default: 'absent',
    },
}, {
    timestamps: true,
});

// Ensure one record per user per day
attendanceSchema.index({ user: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;
