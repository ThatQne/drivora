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
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better performance
reviewSchema.index({ revieweeId: 1 });
reviewSchema.index({ reviewerId: 1 });
reviewSchema.index({ tradeId: 1 });
reviewSchema.index({ createdAt: -1 });

// Compound index to prevent duplicate reviews
reviewSchema.index({ reviewerId: 1, revieweeId: 1, tradeId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema); 