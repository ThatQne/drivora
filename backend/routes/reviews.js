const express = require('express');
const Review = require('../models/Review');
const User = require('../models/User');
const Trade = require('../models/Trade');
const auth = require('../middleware/auth');

const router = express.Router();

// Create or update a review
router.post('/', auth, async (req, res) => {
  try {
    const { revieweeId, tradeId, rating, comment } = req.body;

    // Validate required fields
    if (!revieweeId || !rating) {
      return res.status(400).json({ message: 'Reviewee ID and rating are required' });
    }

    // Prevent self-review
    if (revieweeId === req.user.id) {
      return res.status(400).json({ message: 'You cannot review yourself' });
    }

    // Check if reviewee exists
    const reviewee = await User.findById(revieweeId);
    if (!reviewee) {
      return res.status(404).json({ message: 'User to review not found' });
    }

    // Optional: If tradeId is provided, verify the trade exists and user was involved
    if (tradeId) {
      const trade = await Trade.findById(tradeId);
      if (!trade) {
        return res.status(404).json({ message: 'Trade not found' });
      }

      // Verify user was involved in the trade
      if (trade.offererUserId.toString() !== req.user.id && 
          trade.receiverUserId.toString() !== req.user.id) {
        return res.status(403).json({ message: 'You can only reference trades you were involved in' });
      }
    }

    // Check if review already exists (one review per user pair)
    const existingReview = await Review.findOne({
      reviewerId: req.user.id,
      revieweeId
    });

    let review;
    let isUpdate = false;

    if (existingReview) {
      // Update existing review
      existingReview.rating = rating;
      existingReview.comment = comment || '';
      if (tradeId) existingReview.tradeId = tradeId;
      existingReview.updatedAt = new Date();
      
      review = await existingReview.save();
      isUpdate = true;
      console.log(`📝 Updated existing review from ${req.user.id} for user ${revieweeId}`);
    } else {
      // Create new review
      review = new Review({
        reviewerId: req.user.id,
        revieweeId,
        tradeId: tradeId || undefined,
        rating,
        comment: comment || ''
      });

      try {
        await review.save();
        console.log(`📝 Created new review from ${req.user.id} for user ${revieweeId}`);
      } catch (error) {
        if (error.code === 11000) {
          return res.status(400).json({ message: 'You have already reviewed this user' });
        }
        throw error;
      }
    }

    // Update user's rating and review count
    const reviews = await Review.find({ revieweeId });
    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / reviews.length;

    await User.findByIdAndUpdate(revieweeId, {
      rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
      reviewCount: reviews.length
    });

    console.log(`📊 Updated user ${revieweeId} rating to ${Math.round(averageRating * 10) / 10} (${reviews.length} reviews)`);

    // Populate the review for response
    await review.populate([
      { path: 'reviewerId', select: 'username avatar firstName lastName' },
      { path: 'revieweeId', select: 'username avatar firstName lastName' },
      { path: 'tradeId', select: 'createdAt completedAt status' }
    ]);

    res.status(isUpdate ? 200 : 201).json({
      ...review.toObject(),
      id: review._id.toString(),
      isUpdate
    });
  } catch (error) {
    console.error('Error creating/updating review:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get reviews for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const reviews = await Review.find({ revieweeId: req.params.userId })
      .populate('reviewerId', 'username avatar firstName lastName')
      .populate('tradeId', 'createdAt completedAt status')
      .sort({ updatedAt: -1 }) // Sort by most recently updated
      .lean(); // Use lean for better performance

    // Transform the response to ensure proper ID mapping
    const transformedReviews = reviews.map(review => ({
      ...review,
      id: review._id.toString(),
      reviewerId: typeof review.reviewerId === 'object' ? review.reviewerId._id.toString() : review.reviewerId,
      revieweeId: typeof review.revieweeId === 'object' ? review.revieweeId._id.toString() : review.revieweeId,
      reviewer: review.reviewerId, // Keep the populated reviewer object
      _id: undefined
    }));

    console.log(`📋 Fetched ${transformedReviews.length} reviews for user ${req.params.userId}`);
    res.json(transformedReviews);
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get existing review between current user and target user
router.get('/between/:targetUserId', auth, async (req, res) => {
  try {
    const review = await Review.findOne({
      reviewerId: req.user.id,
      revieweeId: req.params.targetUserId
    })
      .populate('reviewerId', 'username avatar firstName lastName')
      .populate('revieweeId', 'username avatar firstName lastName')
      .populate('tradeId', 'createdAt completedAt status')
      .lean();

    if (!review) {
      return res.status(404).json({ message: 'No review found between these users' });
    }

    // Transform the response
    const transformedReview = {
      ...review,
      id: review._id.toString(),
      reviewerId: typeof review.reviewerId === 'object' ? review.reviewerId._id.toString() : review.reviewerId,
      revieweeId: typeof review.revieweeId === 'object' ? review.revieweeId._id.toString() : review.revieweeId,
      reviewer: review.reviewerId,
      reviewee: review.revieweeId,
      _id: undefined
    };

    res.json(transformedReview);
  } catch (error) {
    console.error('Error fetching review between users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all reviews (for admin or debugging)
router.get('/', auth, async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('reviewerId', 'username avatar firstName lastName')
      .populate('revieweeId', 'username avatar firstName lastName')
      .populate('tradeId')
      .sort({ updatedAt: -1 });

    res.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 