const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  reviewerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  revieweeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tradeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trade',
    required: false // Made optional since reviews are now per-user, not per-trade
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: false,
    trim: true,
    maxlength: 1000
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
reviewSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes for better performance
reviewSchema.index({ revieweeId: 1 });
reviewSchema.index({ reviewerId: 1 });
reviewSchema.index({ tradeId: 1 });
reviewSchema.index({ createdAt: -1 });

// NEW: Compound index to allow only one review per reviewer for each reviewee
reviewSchema.index({ reviewerId: 1, revieweeId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema); 