require('dotenv').config();
const express = require('express');
const cors = require('cors');
// const compression = require('compression');
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');
const listingRoutes = require('./routes/listings');
const userRoutes = require('./routes/users');
const tradeRoutes = require('./routes/trades');
const messageRoutes = require('./routes/messages');

const app = express();

// Connect to MongoDB
connectDB();

// Performance middleware
// app.use(compression()); // Compress responses

// Middleware
const allowedOrigins = [
  'http://localhost:3000',  // Local development
  'https://thatqne.github.io'  // GitHub Pages
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' })); // For image uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Performance headers
app.use((req, res, next) => {
  // Cache control for static-like data
  if (req.method === 'GET' && (req.path.includes('/api/listings') || req.path.includes('/api/users'))) {
    res.set('Cache-Control', 'public, max-age=30'); // 30 seconds cache
  }
  next();
});

// Request logging middleware (only in development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/messages', messageRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' });
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: error.message })
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
}); 