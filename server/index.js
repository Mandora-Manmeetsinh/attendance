// ✅ FIRST LINE
process.env.TZ = 'Asia/Kolkata';

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import attendanceRoutes from './routes/attendance.js';
import officeRoutes from './routes/office.js';
import adminRoutes from './routes/admin.js';
import notificationRoutes from './routes/notifications.js';
import achievementRoutes from './routes/achievements.js';
import shiftRoutes from './routes/shifts.js';
import initScheduler from './services/scheduler.js'; 
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Connect DB
connectDB();

// Start schedulers
initScheduler();

const app = express();


// ✅ FIXED CORS (IMPORTANT)
app.use(cors({
  origin: "https://attendance.exoticinfotech.com",
  credentials: true
}));

// Middleware
app.use(express.json());

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// ✅ Routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/office', officeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/shifts', shiftRoutes);


// ✅ Root route (for testing)
app.get('/', (req, res) => {
    res.send('API is running 🚀');
});


// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
