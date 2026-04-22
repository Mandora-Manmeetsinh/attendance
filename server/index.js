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

dotenv.config({ path: path.join(__dirname, '.env') });

// Connect DB
connectDB();

// Start schedulers
initScheduler();

const app = express();


// ✅ FIXED CORS (IMPORTANT)
const allowedOrigins = [
  "https://attendance.exoticinfotech.com",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:5173"
];
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
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
