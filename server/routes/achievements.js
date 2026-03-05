import express from 'express';
import Achievement from '../models/Achievement.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
    try {
        const achievements = await Achievement.find({});
        const achievementsWithStatus = achievements.map(ach => ({
            ...ach.toObject(),
            unlocked_at: Math.random() > 0.5 ? new Date() : null // Randomly unlock half
        }));

        res.json(achievementsWithStatus);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});

export default router;