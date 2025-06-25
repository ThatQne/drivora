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
    ref: 'Trade'
  },
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing'
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
  isVerified: {
    type: Boolean,
    default: false
  },
  helpful: {
    type: Number,
    default: 0,
    min: 0
  },
  reported: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better performance
reviewSchema.index({ revieweeId: 1, createdAt: -1 });
reviewSchema.index({ reviewerId: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ tradeId: 1 });

// Prevent duplicate reviews for the same trade
reviewSchema.index({ reviewerId: 1, revieweeId: 1, tradeId: 1 }, { unique: true, sparse: true });

// Prevent users from reviewing themselves
reviewSchema.pre('save', function(next) {
  if (this.reviewerId.equals(this.revieweeId)) {
    next(new Error('Users cannot review themselves'));
  } else {
    next();
  }
});

// Update reviewee's rating after saving a review
reviewSchema.post('save', async function() {
  try {
    const User = mongoose.model('User');
    const reviewee = await User.findById(this.revieweeId);
    if (reviewee) {
      await reviewee.updateRating();
    }
  } catch (error) {
    console.error('Error updating user rating:', error);
  }
});

// Update reviewee's rating after deleting a review
reviewSchema.post('deleteOne', { document: true, query: false }, async function() {
  try {
    const User = mongoose.model('User');
    const reviewee = await User.findById(this.revieweeId);
    if (reviewee) {
      await reviewee.updateRating();
    }
  } catch (error) {
    console.error('Error updating user rating:', error);
  }
});

module.exports = mongoose.model('Review', reviewSchema); 