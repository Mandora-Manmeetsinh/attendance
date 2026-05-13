import mongoose from 'mongoose';

const shiftConfigSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['employee', 'intern'],
        required: true,
    },
    batch: {
        type: String,
        enum: ['batch1', 'batch2', 'batch3', null],
        default: null,
    },
    shift_start: {
        type: String,
        required: true,
    },
    shift_end: {
        type: String,
        required: true,
    },
    check_in_window_start: {
        type: String,
        required: true,
    },
    check_in_window_end: {
        type: String,
        required: true,
    },
    min_minutes: {
        type: Number,
        required: true,
    },
    description: {
        type: String,
    },
}, {
    timestamps: true,
});

shiftConfigSchema.index({ role: 1, batch: 1 }, { unique: true });
const ShiftConfig = mongoose.model('ShiftConfig', shiftConfigSchema);

export default ShiftConfig;