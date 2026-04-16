const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Allow localhost, 127.0.0.1 and any vercel.app domain
    if (/^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) || /\.vercel\.app$/.test(origin) || origin === 'https://sln-auto-finance.vercel.app') {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/loans', require('./routes/loanRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

app.get('/', (req, res) => {
  res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
