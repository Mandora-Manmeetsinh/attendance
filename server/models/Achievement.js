import mongoose from 'mongoose';

const achievementSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        unique: true,
    },
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    icon_name: {
        type: String,
        required: true,
    },
    color: {
        type: String,
        required: true,
    },
}, {
    timestamps: true,
});

const Achievement = mongoose.model('Achievement', achievementSchema);

export default Achievement;
