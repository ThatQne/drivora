const mongoose = require('mongoose');

const tradeHistorySchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['created', 'countered', 'accepted', 'rejected', 'cancelled', 'completed', 'declined'],
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  offererCashAmount: {
    type: Number,
    default: 0
  },
  offererVehicleIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle'
  }],
  receiverCashAmount: {
    type: Number,
    default: 0
  },
  receiverVehicleIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle'
  }],
  message: {
    type: String,
    default: ''
  }
});

const tradeSchema = new mongoose.Schema({
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: true
  },
  offererUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled', 'countered', 'pending_acceptance', 'declined'],
    default: 'pending'
  },
  
  lastCounteredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Offerer's offer
  offererCashAmount: {
    type: Number,
    default: 0
  },
  offererVehicleIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle'
  }],
  
  // Receiver's counter-offer (if any)
  receiverCashAmount: {
    type: Number,
    default: 0
  },
  receiverVehicleIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle'
  }],
  
  // Acceptance tracking
  offererAccepted: {
    type: Boolean,
    default: false
  },
  receiverAccepted: {
    type: Boolean,
    default: false
  },
  
  message: {
    type: String,
    default: ''
  },
  counterMessage: {
    type: String,
    default: ''
  },
  
  // Trade history for tracking negotiations
  tradeHistory: [tradeHistorySchema],
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  }
});

// Update the updatedAt field before saving
tradeSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for better query performance
tradeSchema.index({ offererUserId: 1 });
tradeSchema.index({ receiverUserId: 1 });
tradeSchema.index({ listingId: 1 });
tradeSchema.index({ status: 1 });
tradeSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Trade', tradeSchema); 
 
 