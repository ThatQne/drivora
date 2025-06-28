const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Use development URI if MONGODB_URI is not set
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/drivora';
    
    console.log('🔌 Connecting to MongoDB...');
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔌 MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🔌 MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error);
    // Don't exit in development to allow fallback to local database
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

module.exports = connectDB; 
 
 