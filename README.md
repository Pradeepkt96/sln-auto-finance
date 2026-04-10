# Sri Lakshmi Narayana Auto Finance 🏍️

A full-stack, comprehensive web application built to manage auto finance operations smoothly. It provides a rich interface to manage customers, track loans, calculate EMI automatically, and handle payments.

## 🌟 Features

- **Authentication System**: Secure login and admin dashboard access.
- **Customer Management**: Add and track customers with complete information including Indian 10-digit mobile number and vehicle number (e.g., TN24BB3313) validation.
- **Loan Management**: Create loans for customers, track loan amounts, interest rates, and automatically calculate or manually edit EMIs.
- **Loan Tracking**: Advanced loan tracking with `Active`, `Closed`, and `Default` statuses along with responsive inline status updates.
- **Search & Filtering**: Real-time searching, sorting, and filtering capabilities on both the Customers and Loans dashboards.
- **Interactive Dashboard**: Overview of system statistics.
- **EMI Calculator**: A handy tool built directly into the system for quick calculations.
- **Bilingual Interface**: Support for translations (English & Tamil).

## 🛠️ Technology Stack

**Frontend:**
- React (with Vite)
- Tailwind CSS
- Axios (for API requests)
- Lucide React (for icons)

**Backend:**
- Node.js & Express.js
- MongoDB (via Mongoose)
- JSON Web Tokens (JWT) for Authentication
- Bcryptjs for secure password hashing

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [MongoDB](https://www.mongodb.com/) (running locally or via MongoDB Atlas)

### 1. Database Setup
Start your MongoDB service locally. (If you are using the included script `start-mongo.ps1`, you can run it via PowerShell.)

### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file inside the `backend` directory with the following variables:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27018/sln_auto_finance
JWT_SECRET=your_jwt_secret_key_here
```

Start the backend development server:
```bash
npm run dev
```

### 3. Frontend Setup
Open a new terminal window and navigate to the frontend directory:

```bash
cd frontend
npm install
```

Start the frontend development server:
```bash
npm run dev
```

The frontend will start typically on `http://localhost:5173`.

## 📂 Project Structure

```
sln-auto-finance/
├── backend/
│   ├── config/          # Database configuration
│   ├── controllers/     # API request handlers
│   ├── middleware/      # Custom middleware (e.g., Auth protection)
│   ├── models/          # MongoDB Mongoose models
│   ├── routes/          # Express route definitions
│   └── server.js        # Main backend entry point
│
└── frontend/
    ├── src/
    │   ├── components/  # Reusable UI components (e.g., Navbar)
    │   ├── pages/       # Dashboard, Customers, Loans, etc.
    │   ├── index.css    # Tailwind CSS entry
    │   └── App.jsx      # Main application router
    ├── tailwind.config.js
    └── vite.config.js
```

## 📝 License
This project is proprietary software created for Sri Lakshmi Narayana Auto Finance.
