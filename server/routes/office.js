import express from 'express';
import Office from '../models/Office.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
    const office = await Office.findOne();
    if (office) {
        res.json(office);
    } else {
        res.status(404).json({ message: 'Office not configured' });
    }
});

router.post('/', protect, admin, async (req, res) => {
    const { name, latitude, longitude, radius_meters, grace_period_mins } = req.body;
    let office = await Office.findOne();

    if (office) {
        office.name = name;
        office.latitude = latitude;
        office.longitude = longitude;
        office.radius_meters = radius_meters;
        office.grace_period_mins = grace_period_mins;
        await office.save();
        res.json(office);
    } else {
        office = await Office.create({
            name,
            latitude,
            longitude,
            radius_meters,
            grace_period_mins
        });
        res.status(201).json(office);
    }
});

export default router;