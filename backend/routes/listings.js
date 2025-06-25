const express = require('express');
const Listing = require('../models/Listing');
const Vehicle = require('../models/Vehicle');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/listings
// @desc    Get all active listings with search and filters
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { 
      search, 
      make, 
      model, 
      minPrice, 
      maxPrice, 
      minYear, 
      maxYear,
      tags,
      sortBy = 'lastRenewed',
      order = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    // Build match stage for listings
    let listingMatch = { isActive: true };

    // Search in title, description, and tags
    if (search) {
      listingMatch.$text = { $search: search };
    }

    // Price filters
    if (minPrice || maxPrice) {
      listingMatch.price = {};
      if (minPrice) listingMatch.price.$gte = Number(minPrice);
      if (maxPrice) listingMatch.price.$lte = Number(maxPrice);
    }

    // Tag filters
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      listingMatch.tags = { $in: tagArray };
    }

    // Build vehicle match stage
    let vehicleMatch = {};
    if (make) vehicleMatch.make = new RegExp(make, 'i');
    if (model) vehicleMatch.model = new RegExp(model, 'i');
    if (minYear) vehicleMatch.year = { ...vehicleMatch.year, $gte: Number(minYear) };
    if (maxYear) vehicleMatch.year = { ...vehicleMatch.year, $lte: Number(maxYear) };

    // Build sort object
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortObj = { [sortBy]: sortOrder };

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Use aggregation pipeline for better performance
    const pipeline = [
      // Match active listings
      { $match: listingMatch },
      
      // Lookup vehicle data
      {
        $lookup: {
          from: 'vehicles',
          localField: 'vehicleId',
          foreignField: '_id',
          as: 'vehicleData'
        }
      },
      
      // Unwind vehicle data
      { $unwind: '$vehicleData' },
      
      // Match vehicle criteria
      ...(Object.keys(vehicleMatch).length > 0 ? [
        {
          $match: Object.keys(vehicleMatch).reduce((acc, key) => {
            acc[`vehicleData.${key}`] = vehicleMatch[key];
            return acc;
          }, {})
        }
      ] : []),
      
      // Lookup seller data
      {
        $lookup: {
          from: 'users',
          localField: 'sellerId',
          foreignField: '_id',
          as: 'sellerData',
          pipeline: [
            {
              $project: {
                username: 1,
                firstName: 1,
                lastName: 1,
                rating: 1,
                reviewCount: 1,
                location: 1,
                avatar: 1
              }
            }
          ]
        }
      },
      
      // Unwind seller data
      { $unwind: '$sellerData' },
      
      // Add computed fields while preserving original IDs
      {
        $addFields: {
          vehicle: '$vehicleData',
          seller: '$sellerData'
        }
      },
      
      // Remove temporary fields
      {
        $project: {
          vehicleData: 0,
          sellerData: 0
        }
      },
      
      // Sort
      { $sort: sortObj },
      
      // Facet for pagination
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: Number(limit) }
          ],
          count: [
            { $count: "total" }
          ]
        }
      }
    ];

    const [result] = await Listing.aggregate(pipeline);
    const listings = result.data || [];
    const total = result.count[0]?.total || 0;

    res.json({
      listings,
      pagination: {
        current: Number(page),
        pages: Math.ceil(total / Number(limit)),
        total,
        hasNext: skip + listings.length < total,
        hasPrev: Number(page) > 1
      }
    });

  } catch (error) {
    console.error('Get listings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/listings/count
// @desc    Get count of active listings for skeleton loading
// @access  Public
router.get('/count', async (req, res) => {
  try {
    const count = await Listing.countDocuments({ isActive: true });
    res.json({ count });
  } catch (error) {
    console.error('Get listings count error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/listings/my
// @desc    Get user's listings
// @access  Private
router.get('/my', auth, async (req, res) => {
  try {
    const listings = await Listing.find({ sellerId: req.user._id })
      .populate('vehicleId')
      .sort({ createdAt: -1 });

    res.json(listings);
  } catch (error) {
    console.error('Get my listings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/listings/:id
// @desc    Get single listing by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('vehicleId')
      .populate('sellerId', 'username firstName lastName rating reviewCount location phone avatar');

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (!listing.isActive) {
      return res.status(404).json({ error: 'Listing is no longer active' });
    }

    // Increment views (don't wait for it)
    listing.incrementViews().catch(err => console.error('Error incrementing views:', err));

    res.json(listing);
  } catch (error) {
    console.error('Get listing error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/listings
// @desc    Create new listing
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { 
      vehicleId, 
      title, 
      description, 
      price, 
      problems, 
      additionalFeatures, 
      tags 
    } = req.body;

    // Validation
    if (!vehicleId || !title || !description || price === undefined) {
      return res.status(400).json({ error: 'Vehicle, title, description, and price are required' });
    }

    // Check if vehicle exists and belongs to user
    const vehicle = await Vehicle.findOne({
      _id: vehicleId,
      ownerId: req.user._id
    });

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Check if vehicle is already listed or auctioned
    if (vehicle.isListed || vehicle.isAuctioned) {
      return res.status(400).json({ error: 'Vehicle is already listed or in auction' });
    }

    // Create listing
    const listing = new Listing({
      vehicleId,
      sellerId: req.user._id,
      title,
      description,
      price,
      problems: problems || [],
      additionalFeatures: additionalFeatures || [],
      tags: tags || []
    });

    await listing.save();

    // Update vehicle status
    vehicle.isListed = true;
    vehicle.listingId = listing._id;
    await vehicle.save();

    // Populate and return
    await listing.populate('vehicleId');
    await listing.populate('sellerId', 'username firstName lastName rating reviewCount');

    res.status(201).json(listing);

  } catch (error) {
    console.error('Create listing error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ error: messages.join('. ') });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/listings/:id
// @desc    Update listing
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, description, price, problems, additionalFeatures, tags } = req.body;

    const listing = await Listing.findOne({
      _id: req.params.id,
      sellerId: req.user._id
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Update fields
    if (title) listing.title = title;
    if (description) listing.description = description;
    if (price !== undefined) listing.price = price;
    if (problems !== undefined) listing.problems = problems;
    if (additionalFeatures !== undefined) listing.additionalFeatures = additionalFeatures;
    if (tags !== undefined) listing.tags = tags;

    await listing.save();

    // Populate and return
    await listing.populate('vehicleId');
    await listing.populate('sellerId', 'username firstName lastName rating reviewCount');

    res.json(listing);

  } catch (error) {
    console.error('Update listing error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ error: messages.join('. ') });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/listings/:id/renew
// @desc    Renew listing (24-hour cooldown)
// @access  Private
router.post('/:id/renew', auth, async (req, res) => {
  try {
    const listing = await Listing.findOne({
      _id: req.params.id,
      sellerId: req.user._id
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (!listing.canRenew) {
      const hoursLeft = Math.ceil((listing.canRenewAfter - new Date()) / (1000 * 60 * 60));
      return res.status(400).json({ 
        error: `Cannot renew listing yet. Please wait ${hoursLeft} more hours.` 
      });
    }

    await listing.renew();

    res.json({ 
      message: 'Listing renewed successfully',
      listing: {
        lastRenewed: listing.lastRenewed,
        canRenewAfter: listing.canRenewAfter
      }
    });

  } catch (error) {
    console.error('Renew listing error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/listings/:id
// @desc    Delete listing
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const listing = await Listing.findOne({
      _id: req.params.id,
      sellerId: req.user._id
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Update vehicle status
    const vehicle = await Vehicle.findById(listing.vehicleId);
    if (vehicle) {
      vehicle.isListed = false;
      vehicle.listingId = null;
      await vehicle.save();
    }

    // Delete listing
    await Listing.deleteOne({ _id: req.params.id });

    res.json({ message: 'Listing deleted successfully' });

  } catch (error) {
    console.error('Delete listing error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/listings/:id/deactivate
// @desc    Deactivate listing (mark as sold)
// @access  Private
router.post('/:id/deactivate', auth, async (req, res) => {
  try {
    const { soldTo } = req.body;

    const listing = await Listing.findOne({
      _id: req.params.id,
      sellerId: req.user._id
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    listing.isActive = false;
    listing.soldAt = new Date();
    if (soldTo) listing.soldTo = soldTo;

    await listing.save();

    // Update vehicle status
    const vehicle = await Vehicle.findById(listing.vehicleId);
    if (vehicle) {
      vehicle.isListed = false;
      vehicle.listingId = null;
      await vehicle.save();
    }

    res.json({ message: 'Listing marked as sold' });

  } catch (error) {
    console.error('Deactivate listing error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 