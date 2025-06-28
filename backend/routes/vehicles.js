const express = require('express');
const Vehicle = require('../models/Vehicle');
const Listing = require('../models/Listing');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/vehicles
// @desc    Get user's vehicles (garage)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ ownerId: req.user._id })
      .populate('listingId')
      .populate('auctionId')
      .sort({ createdAt: -1 });

    res.json(vehicles);
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/vehicles/count
// @desc    Get count of user's vehicles for skeleton loading
// @access  Private
router.get('/count', auth, async (req, res) => {
  try {
    const count = await Vehicle.countDocuments({ ownerId: req.user._id });
    res.json({ count });
  } catch (error) {
    console.error('Get vehicles count error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/vehicles/user/:userId
// @desc    Get vehicles by user ID (for trade system)
// @access  Private
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ 
      ownerId: req.params.userId,
      isAuctioned: false // Only return non-auctioned vehicles for trading
    })
      .populate('listingId')
      .populate('auctionId')
      .sort({ createdAt: -1 });

    res.json(vehicles);
  } catch (error) {
    console.error('Get user vehicles error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/vehicles/:id
// @desc    Get single vehicle
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      ownerId: req.user._id
    }).populate('listingId').populate('auctionId');

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    res.json(vehicle);
  } catch (error) {
    console.error('Get vehicle error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/vehicles
// @desc    Add new vehicle
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { make, model, year, vin, mileage, transmission, estimatedValue, customPrice, images } = req.body;

    // Validation
    if (!make || !model || !year || !vin || mileage === undefined || !transmission || estimatedValue === undefined) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Check if VIN already exists for this user
    const existingVehicle = await Vehicle.findOne({ 
      vin: vin.toUpperCase(), 
      ownerId: req.user._id 
    });

    if (existingVehicle) {
      return res.status(400).json({ error: 'Vehicle with this VIN already exists in your garage' });
    }

    const vehicle = new Vehicle({
      ownerId: req.user._id,
      make,
      model,
      year,
      vin: vin.toUpperCase(),
      mileage,
      transmission,
      estimatedValue,
      customPrice,
      images: images || []
    });

    await vehicle.save();

    // 🔗 WEBSOCKET: Broadcast new vehicle to user
    if (req.app.locals.webSocket) {
      req.app.locals.webSocket.broadcastToUser(req.user._id.toString(), {
        type: 'VEHICLE_ADDED',
        data: vehicle,
        userId: req.user._id.toString(),
        timestamp: new Date().toISOString()
      });
    }

    res.status(201).json(vehicle);

  } catch (error) {
    console.error('Add vehicle error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ error: messages.join('. ') });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/vehicles/:id
// @desc    Update vehicle
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const { make, model, year, vin, mileage, transmission, estimatedValue, customPrice, images } = req.body;

    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      ownerId: req.user._id
    });

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // If VIN is being changed, check for duplicates
    if (vin && vin.toUpperCase() !== vehicle.vin) {
      const existingVehicle = await Vehicle.findOne({ 
        vin: vin.toUpperCase(), 
        ownerId: req.user._id,
        _id: { $ne: req.params.id }
      });

      if (existingVehicle) {
        return res.status(400).json({ error: 'Vehicle with this VIN already exists in your garage' });
      }
    }

    // Store original images to check if they changed
    const originalImages = vehicle.images;

    // Update fields
    if (make) vehicle.make = make;
    if (model) vehicle.model = model;
    if (year) vehicle.year = year;
    if (vin) vehicle.vin = vin.toUpperCase();
    if (mileage !== undefined) vehicle.mileage = mileage;
    if (transmission) vehicle.transmission = transmission;
    if (estimatedValue !== undefined) vehicle.estimatedValue = estimatedValue;
    if (customPrice !== undefined) vehicle.customPrice = customPrice;
    if (images !== undefined) vehicle.images = images;

    await vehicle.save();

    // If images were updated and vehicle has an active listing, sync the images
    if (images !== undefined && 
        vehicle.isListed && 
        vehicle.listingId && 
        JSON.stringify(originalImages) !== JSON.stringify(images)) {
      
      try {
        // Update the listing's lastEditedAt timestamp to mark it as recently updated
        const listing = await Listing.findById(vehicle.listingId);
        if (listing) {
          listing.lastEditedAt = new Date();
          await listing.save();
          console.log(`Vehicle ${vehicle._id} images updated, listing ${listing._id} marked as recently updated`);
        }
      } catch (listingError) {
        console.error('Error updating listing timestamp:', listingError);
        // Don't fail the vehicle update if listing sync fails
      }
    }

    // 🔗 WEBSOCKET: Broadcast vehicle update to user
    if (req.app.locals.webSocket) {
      req.app.locals.webSocket.broadcastToUser(req.user._id.toString(), {
        type: 'VEHICLE_UPDATED',
        data: vehicle,
        userId: req.user._id.toString(),
        timestamp: new Date().toISOString()
      });
    }

    res.json(vehicle);

  } catch (error) {
    console.error('Update vehicle error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ error: messages.join('. ') });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/vehicles/:id
// @desc    Delete vehicle
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      ownerId: req.user._id
    });

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Check if vehicle is currently listed or auctioned
    if (vehicle.isListed || vehicle.isAuctioned) {
      return res.status(400).json({ 
        error: 'Cannot delete vehicle while it is listed or in auction. Please remove from listing/auction first.' 
      });
    }

    await Vehicle.deleteOne({ _id: req.params.id });
    res.json({ message: 'Vehicle deleted successfully' });

  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/vehicles/:id/update-status
// @desc    Update vehicle listing/auction status
// @access  Private
router.post('/:id/update-status', auth, async (req, res) => {
  try {
    const { isListed, isAuctioned, listingId, auctionId } = req.body;

    const vehicle = await Vehicle.findOne({
      _id: req.params.id,
      ownerId: req.user._id
    });

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Update status
    vehicle.isListed = isListed || false;
    vehicle.isAuctioned = isAuctioned || false;
    vehicle.listingId = listingId || null;
    vehicle.auctionId = auctionId || null;

    await vehicle.save();
    res.json(vehicle);

  } catch (error) {
    console.error('Update vehicle status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
 