require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
// const compression = require('compression');
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');
const listingRoutes = require('./routes/listings');
const userRoutes = require('./routes/users');
const tradeRoutes = require('./routes/trades');
const messageRoutes = require('./routes/messages');
const reviewRoutes = require('./routes/reviews');

const app = express();
const server = http.createServer(app);

// WebSocket Server Setup
const wss = new WebSocket.Server({ 
  server,
  verifyClient: (info) => {
    try {
      const url = new URL(info.req.url, `http://${info.req.headers.host}`);
      const token = url.searchParams.get('token');
      const userId = url.searchParams.get('userId');
      
      if (!token || !userId) {
        console.log('❌ WebSocket connection rejected: Missing token or userId');
        return false;
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      if (decoded.userId !== userId) {
        console.log('❌ WebSocket connection rejected: Token userId mismatch');
        return false;
      }

      // Store user info for later use
      info.req.userId = userId;
      info.req.user = decoded;
      return true;
    } catch (error) {
      console.log('❌ WebSocket connection rejected: Invalid token', error.message);
      return false;
    }
  }
});

// Store active WebSocket connections
const activeConnections = new Map(); // userId -> Set of WebSocket connections

wss.on('connection', (ws, req) => {
  const userId = req.userId;
  console.log(`✅ WebSocket connected for user: ${userId}`);

  // Add connection to active connections
  if (!activeConnections.has(userId)) {
    activeConnections.set(userId, new Set());
  }
  activeConnections.get(userId).add(ws);

  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log(`📨 WebSocket message from ${userId}:`, message.type);

      // Handle different message types
      switch (message.type) {
        case 'PING':
          ws.send(JSON.stringify({ type: 'PONG', timestamp: new Date().toISOString() }));
          break;
        case 'TYPING_START':
        case 'TYPING_STOP':
          // Broadcast typing status to other participants in conversation
          broadcastToConversation(message.data.conversationId, {
            type: message.type,
            data: { userId, conversationId: message.data.conversationId },
            timestamp: new Date().toISOString()
          }, userId);
          break;
        default:
          console.warn('⚠️ Unknown WebSocket message type:', message.type);
      }
    } catch (error) {
      console.error('❌ Error handling WebSocket message:', error);
    }
  });

  // Handle connection close
  ws.on('close', () => {
    console.log(`🔌 WebSocket disconnected for user: ${userId}`);
    
    // Remove connection from active connections
    if (activeConnections.has(userId)) {
      activeConnections.get(userId).delete(ws);
      if (activeConnections.get(userId).size === 0) {
        activeConnections.delete(userId);
      }
    }

    // DISABLED: User offline status broadcast
    // broadcastToAll({
    //   type: 'USER_OFFLINE',
    //   data: { userId },
    //   timestamp: new Date().toISOString()
    // }, userId);
  });

  // DISABLED: User online status broadcast
  // broadcastToAll({
  //   type: 'USER_ONLINE',
  //   data: { userId },
  //   timestamp: new Date().toISOString()
  // }, userId);
});

// WebSocket broadcast functions
function broadcastToUser(userId, message) {
  if (activeConnections.has(userId)) {
    const userConnections = activeConnections.get(userId);
    userConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
    console.log(`📤 Broadcasted ${message.type} to user ${userId}`);
  }
}

function broadcastToAll(message, excludeUserId = null) {
  let broadcastCount = 0;
  activeConnections.forEach((connections, userId) => {
    if (userId !== excludeUserId) {
      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
          broadcastCount++;
        }
      });
    }
  });
  console.log(`📤 Broadcasted ${message.type} to ${broadcastCount} connections`);
}

function broadcastToConversation(conversationId, message, excludeUserId = null) {
  // Extract user IDs from conversation ID (format: "userId1-userId2")
  const userIds = conversationId.split('-');
  
  userIds.forEach(userId => {
    if (userId !== excludeUserId) {
      broadcastToUser(userId, message);
    }
  });
}

// Make broadcast functions available to routes
app.locals.webSocket = {
  broadcastToUser,
  broadcastToAll,
  broadcastToConversation,
  getActiveUsers: () => Array.from(activeConnections.keys())
};

// Connect to MongoDB
connectDB();

// Performance middleware
// app.use(compression()); // Compress responses

// Middleware
const allowedOrigins = [
  'http://localhost:3000',  // Local development
  'https://thatqne.github.io',  // GitHub Pages
  'https://drivora.onrender.com'  // Render backend
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.warn('⚠️ Blocked by CORS:', origin);
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
app.use('/api/reviews', reviewRoutes);

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

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 WebSocket server ready for connections`);
  console.log(`👥 Active connections: ${activeConnections.size}`);
});