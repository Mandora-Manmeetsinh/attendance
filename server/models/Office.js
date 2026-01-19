import mongoose from 'mongoose';

const officeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        default: 'Main Office',
    },
    latitude: {
        type: Number,
        required: true,
    },
    longitude: {
        type: Number,
        required: true,
    },
    radius_meters: {
        type: Number,
        required: true,
        default: 100,
    },
    grace_period_mins: {
        type: Number,
        required: true,
        default: 15,
    },
}, {
    timestamps: true,
});

const Office = mongoose.model('Office', officeSchema);

export default Office;
