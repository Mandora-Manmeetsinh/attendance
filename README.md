# 📍 Radius Check - Advanced Attendance Management System

**Radius Check** is a high-performance, precision-based attendance management system designed for modern workplaces. It ensures integrity in attendance tracking by enforcing geographic constraints (Geo-fencing) and provides a gamified experience for employees with real-time notifications and achievements.

---

## 🚀 Key Features

- 📍 **Precision Geo-fencing**: Check-in and check-out are only allowed when the user is within a specified radius of the office coordinates.
- 🤖 **Telegram Bot Integration**: 
  - Automated attendance reminders.
  - Quick registration via deep-linking.
  - Real-time notifications for status changes.
- 📅 **Flexible Shift Management**: Support for multiple shifts (Morning, Afternoon, Night) with automated late and early-exit tracking.
- 🏆 **Gamified Experience**: Earn achievements for consistent attendance and on-time performance.
- 📊 **Power Admin Dashboard**:
  - Manage Offices, Shifts, and Users.
  - View real-time attendance logs.
  - Export comprehensive attendance reports to **Excel**.
  - System-wide settings and notification management.
- 🛡️ **Secure Backend**: JWT-based authentication and role-based access control (RBAC).

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React 18](https://reactjs.org/) (with [Vite](https://vitejs.dev/))
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Shadcn UI](https://ui.shadcn.com/) & [Radix UI](https://www.radix-ui.com/)
- **State Management**: [TanStack Query (React Query)](https://tanstack.com/query/latest)
- **Form Handling**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)

### Backend
- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) (Mongoose ODM)
- **Authentication**: [JSON Web Tokens (JWT)](https://jwt.io/) & [Bcrypt.js](https://github.com/kelektiv/node.bcrypt.js)
- **Export**: [ExcelJS](https://github.com/exceljs/exceljs)

---

## 📥 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16.x or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) (Local or Atlas)
- [Supabase](https://supabase.com/) Account (for frontend integrations)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Mandora-Manmeetsinh/radius-check.git
   cd radius-check
   ```

2. **Backend Setup**
   ```bash
   cd server
   npm install
   # Create a .env file based on the environment variables section below
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd ..
   npm install
   # Create a .env file based on the environment variables section below
   npm run dev
   ```

---

## 🔑 Environment Variables

### Backend (`/server/.env`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Port for the Express server | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/radius-check` |
| `JWT_SECRET` | Secret key for JWT signing | `your_jwt_secret_key` |

### Frontend (`/.env`)
| Variable | Description |
| :--- | :--- |
| `VITE_SUPABASE_PROJECT_ID` | Your Supabase Project ID |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase Anon/Public Key |
| `VITE_SUPABASE_URL` | Your Supabase Project URL |
| `VITE_API_URL` | Your Deployed Backend URL (e.g. `https://api.your-radius-check.com/api`) |

---

## 📖 Usage

1. **Register/Login**: Users can sign up and login via the web portal or link their Telegram account for notifications.
2. **Setup Office**: Admins define office locations (latitude, longitude) and allowed radius (in meters).
3. **Check-in**: Employees check-in via the dashboard. The system validates their GPS coordinates against the office location.
4. **Reports**: Admins can generate and download monthly attendance reports in `.xlsx` format.

---

## 👨‍💻 Development

### Project Structure
```text
radius-check/
├── server/             # Express.js Backend
│   ├── models/         # Mongoose Schemas
│   ├── routes/         # API Endpoints
│   └── config/         # Database Configuration
├── src/                # React Frontend
│   ├── components/     # UI & Reusable Components
│   ├── pages/          # View Components
│   ├── hooks/          # Custom React Hooks
│   └── api/            # API Service Layer
└── public/             # Static Assets
```

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).

---

*Made with ❤️ by [Manmeetsinh Mandora](https://github.com/Mandora-Manmeetsinh)*