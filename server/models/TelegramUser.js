import mongoose from 'mongoose';

const telegramUserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    studentId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    telegramChatId: {
        type: Number,
        required: true,
        unique: true
    },
    totalPresent: {
        type: Number,
        default: 0
    },
    totalAbsent: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

const TelegramUser = mongoose.model('TelegramUser', telegramUserSchema);

export default TelegramUser;
