import mongoose from 'mongoose';

const systemSettingsSchema = mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true, // e.g., 'notifications', 'general'
    },
    value: {
        type: mongoose.Schema.Types.Mixed, // Allows flexible structure (JSON object)
        required: true,
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }
}, {
    timestamps: true,
});

const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema);

export default SystemSettings;
