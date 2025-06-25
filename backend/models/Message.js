const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000 // Limit message length
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  tradeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trade',
    required: false
  },
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: false
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
messageSchema.index({ senderId: 1, receiverId: 1, timestamp: -1 });
messageSchema.index({ receiverId: 1, read: 1 }); // For unread messages
messageSchema.index({ timestamp: -1 }); // For sorting by time
messageSchema.index({ tradeId: 1 }); // For trade-related messages
messageSchema.index({ listingId: 1 }); // For listing-related messages

// Compound index for conversation queries
messageSchema.index({ 
  senderId: 1, 
  receiverId: 1, 
  timestamp: -1 
});

module.exports = mongoose.model('Message', messageSchema); 
 
 