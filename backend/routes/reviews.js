const express = require('express');
const Review = require('../models/Review');
const User = require('../models/User');
const Trade = require('../models/Trade');
const auth = require('../middleware/auth');

const router = express.Router();

// Create a new review
router.post('/', auth, async (req, res) => {
  try {
    const { revieweeId, tradeId, rating, comment } = req.body;

    // Validate required fields
    if (!revieweeId || !tradeId || !rating || !comment) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if reviewee exists
    const reviewee = await User.findById(revieweeId);
    if (!reviewee) {
      return res.status(404).json({ message: 'User to review not found' });
    }

    // Check if trade exists and user was involved
    const trade = await Trade.findById(tradeId);
    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    // Verify user was involved in the trade
    if (trade.offererUserId.toString() !== req.user.id && 
        trade.receiverUserId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only review users from your completed trades' });
    }

    // Verify trade is completed
    if (trade.status !== 'completed') {
      return res.status(400).json({ message: 'You can only review completed trades' });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({
      reviewerId: req.user.id,
      revieweeId,
      tradeId
    });

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this trade' });
    }

    // Create the review
    const review = new Review({
      reviewerId: req.user.id,
      revieweeId,
      tradeId,
      rating,
      comment
    });

    await review.save();

    // Update user's rating and review count
    const reviews = await Review.find({ revieweeId });
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / reviews.length;

    await User.findByIdAndUpdate(revieweeId, {
      rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
      reviewCount: reviews.length
    });

    // Populate the review for response
    await review.populate([
      { path: 'reviewerId', select: 'username avatar' },
      { path: 'revieweeId', select: 'username avatar' }
    ]);

    res.status(201).json(review);
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get reviews for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const reviews = await Review.find({ revieweeId: req.params.userId })
      .populate('reviewerId', 'username avatar')
      .populate('tradeId', 'createdAt completedAt')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all reviews (for admin or debugging)
router.get('/', auth, async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('reviewerId', 'username avatar')
      .populate('revieweeId', 'username avatar')
      .populate('tradeId')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 