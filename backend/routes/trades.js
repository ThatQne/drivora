const express = require('express');
const Trade = require('../models/Trade');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Listing = require('../models/Listing');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all trades for the authenticated user
router.get('/', auth, async (req, res) => {
  try {
    console.log(`🔍 Loading trades for user ${req.user.id}`);
    
    // First, clean up trades with missing listings automatically
    const tradesWithMissingListings = await Trade.find({
      $or: [
        { offererUserId: req.user.id },
        { receiverUserId: req.user.id }
      ]
    }).populate('listingId');

    console.log(`📊 Found ${tradesWithMissingListings.length} total trades for user ${req.user.id}`);

    // Delete trades where listing is null (listing was deleted)
    const tradesToDelete = tradesWithMissingListings
      .filter(trade => !trade.listingId)
      .map(trade => trade._id);

    console.log(`🗑️ Found ${tradesToDelete.length} trades with missing listings to delete`);

    if (tradesToDelete.length > 0) {
      const deleteResult = await Trade.deleteMany({ _id: { $in: tradesToDelete } });
      console.log(`✅ Auto-cleaned up ${deleteResult.deletedCount} trades with missing listings for user ${req.user.id}`);
    }

    // Also delete any cancelled trades immediately (don't wait 1 hour)
    const cancelledDeleteResult = await Trade.deleteMany({
      $or: [
        { offererUserId: req.user.id },
        { receiverUserId: req.user.id }
      ],
      status: 'cancelled'
    });

    if (cancelledDeleteResult.deletedCount > 0) {
      console.log(`🧹 Cleaned up ${cancelledDeleteResult.deletedCount} cancelled trades for user ${req.user.id}`);
    }

    const trades = await Trade.find({
      $or: [
        { offererUserId: req.user.id },
        { receiverUserId: req.user.id }
      ]
    })
    .sort({ createdAt: -1 }) // Sort by creation date, newest first
    .populate('offererUserId', 'username email avatar rating reviewCount')
    .populate('receiverUserId', 'username email avatar rating reviewCount')
    .populate('listingId')
    .populate('offererVehicleIds')
    .populate('receiverVehicleIds');

    // Filter out any remaining trades with missing listings (just in case)
    const validTrades = trades.filter(trade => trade.listingId != null);
    const invalidTrades = trades.filter(trade => trade.listingId == null);

    if (invalidTrades.length > 0) {
      console.log(`⚠️ Found ${invalidTrades.length} additional trades with null listings after cleanup`);
    }

    console.log(`📤 Returning ${validTrades.length} valid trades to user ${req.user.id}`);

    res.json(validTrades);
  } catch (error) {
    console.error('Error fetching trades:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/trades/cleanup
// @desc    Cleanup corrupted trades (missing listings)
// @access  Private
router.delete('/cleanup', auth, async (req, res) => {
  try {
    // Find all trades for this user
    const userTrades = await Trade.find({
      $or: [
        { offererUserId: req.user.id },
        { receiverUserId: req.user.id }
      ]
    }).populate('listingId');

    // Find trades with missing listings
    const corruptedTrades = userTrades.filter(trade => !trade.listingId);
    
    if (corruptedTrades.length === 0) {
      return res.json({ 
        message: 'No corrupted trades found',
        deletedCount: 0
      });
    }

    // Delete corrupted trades
    const tradeIds = corruptedTrades.map(trade => trade._id);
    const result = await Trade.deleteMany({ _id: { $in: tradeIds } });

    console.log(`Cleaned up ${result.deletedCount} corrupted trades for user ${req.user.id}`);

    res.json({ 
      message: `Successfully removed ${result.deletedCount} corrupted trades`,
      deletedCount: result.deletedCount,
      deletedTradeIds: tradeIds
    });

  } catch (error) {
    console.error('Error cleaning up corrupted trades:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/trades/cleanup-vehicles
// @desc    Cleanup vehicles with incorrect listing/auction flags
// @access  Private
router.post('/cleanup-vehicles', auth, async (req, res) => {
  try {
    console.log(`🧹 Starting vehicle flag cleanup for user ${req.user.id}`);
    
    // Find all vehicles owned by the user
    const userVehicles = await Vehicle.find({ ownerId: req.user.id });
    
    let cleanedCount = 0;
    
    for (const vehicle of userVehicles) {
      let needsUpdate = false;
      const updates = {};
      
      // Check if vehicle is marked as listed but has no active listing
      if (vehicle.isListed) {
        const activeListing = await Listing.findOne({
          vehicleId: vehicle._id,
          isActive: true
        });
        
        if (!activeListing) {
          updates.isListed = false;
          updates.listingId = null;
          needsUpdate = true;
          console.log(`🔧 Vehicle ${vehicle._id} marked as listed but no active listing found`);
        }
      }
      
      // Check if vehicle is marked as auctioned but not in any active trades
      if (vehicle.isAuctioned) {
        const activeTrades = await Trade.find({
          $or: [
            { offererVehicleIds: vehicle._id },
            { receiverVehicleIds: vehicle._id }
          ],
          status: { $in: ['pending', 'accepted', 'pending_acceptance', 'countered'] }
        });
        
        if (activeTrades.length === 0) {
          updates.isAuctioned = false;
          needsUpdate = true;
          console.log(`🔧 Vehicle ${vehicle._id} marked as auctioned but no active trades found`);
        }
      }
      
      if (needsUpdate) {
        await Vehicle.updateOne({ _id: vehicle._id }, updates);
        cleanedCount++;
      }
    }
    
    console.log(`✅ Cleaned up ${cleanedCount} vehicles for user ${req.user.id}`);
    
    res.json({
      message: `Successfully cleaned up ${cleanedCount} vehicles`,
      cleanedCount
    });
    
  } catch (error) {
    console.error('Error cleaning up vehicle flags:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get a specific trade
router.get('/:id', auth, async (req, res) => {
  try {
    const trade = await Trade.findById(req.params.id)
      .populate('offererUserId', 'username email avatar rating reviewCount')
      .populate('receiverUserId', 'username email avatar rating reviewCount')
      .populate('listingId')
      .populate('offererVehicleIds')
      .populate('receiverVehicleIds');

    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    // Check if user is involved in this trade
    if (trade.offererUserId._id.toString() !== req.user.id && 
        trade.receiverUserId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(trade);
  } catch (error) {
    console.error('Error fetching trade:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create a new trade
router.post('/', auth, async (req, res) => {
  try {
    const {
      listingId,
      receiverUserId,
      offererCashAmount,
      offererVehicleIds,
      message
    } = req.body;

    // Validate required fields
    if (!listingId || !receiverUserId) {
      return res.status(400).json({ message: 'Listing ID and receiver ID are required' });
    }

    // Check if listing exists and is active
    const listing = await Listing.findById(listingId);
    if (!listing || !listing.isActive) {
      return res.status(404).json({ message: 'Listing not found or inactive' });
    }

    // Check if user is trying to trade with themselves
    if (req.user.id === receiverUserId) {
      return res.status(400).json({ message: 'Cannot create trade with yourself' });
    }

    // Check if user already has an active trade for this listing
    const existingTrade = await Trade.findOne({
      listingId: listingId,
      offererUserId: req.user.id,
      status: { $in: ['pending', 'accepted', 'pending_acceptance', 'countered'] }
    });

    if (existingTrade) {
      return res.status(400).json({ 
        message: 'You already have an active trade for this listing. Please cancel or complete the existing trade first.',
        existingTradeId: existingTrade._id
      });
    }

    // Check if receiver exists
    const receiver = await User.findById(receiverUserId);
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    // Validate offered vehicles belong to the user
    if (offererVehicleIds && offererVehicleIds.length > 0) {
      const vehicles = await Vehicle.find({
        _id: { $in: offererVehicleIds },
        ownerId: req.user.id
      });
      
      if (vehicles.length !== offererVehicleIds.length) {
        return res.status(400).json({ message: 'Some offered vehicles do not belong to you' });
      }

      // Check if any vehicles are auctioned (listed and unlisted vehicles are both allowed for trading)
      const auctionedVehicles = vehicles.filter(v => v.isAuctioned);
      if (auctionedVehicles.length > 0) {
        return res.status(400).json({ 
          message: 'Some offered vehicles are currently in auction and cannot be traded' 
        });
      }
    }

    // Create trade history entry
    const historyEntry = {
      action: 'created',
      userId: req.user.id,
      timestamp: new Date(),
      offererCashAmount: offererCashAmount || 0,
      offererVehicleIds: offererVehicleIds || [],
      message
    };

    // Create the trade
    const trade = new Trade({
      listingId,
      offererUserId: req.user.id,
      receiverUserId,
      status: 'pending',
      offererCashAmount: offererCashAmount || 0,
      offererVehicleIds: offererVehicleIds || [],
      message: message || '',
      tradeHistory: [historyEntry]
    });

    await trade.save();
    
    // Populate the new trade for response
    await trade.populate([
      { path: 'offererUserId', select: 'username email avatar rating reviewCount' },
      { path: 'receiverUserId', select: 'username email avatar rating reviewCount' },
      { path: 'listingId' },
      { path: 'offererVehicleIds' },
    ]);

    // 🔗 WEBSOCKET: Broadcast trade creation to both users
    if (req.app.locals.webSocket) {
      const socket = req.app.locals.webSocket;
      socket.broadcastToUser(trade.offererUserId._id.toString(), {
        type: 'TRADE_CREATED',
        data: trade
      });
      socket.broadcastToUser(trade.receiverUserId._id.toString(), {
        type: 'TRADE_CREATED',
        data: trade
      });
      console.log(`🔗 Broadcasted TRADE_CREATED to ${trade.offererUserId._id} and ${trade.receiverUserId._id}`);
    }

    res.status(201).json(trade);
  } catch (error) {
    console.error('Error creating trade:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update a trade (accept, reject, counter, cancel)
router.put('/:id', auth, async (req, res) => {
  try {
    console.log(`🔍 PUT /api/trades/${req.params.id} - User: ${req.user.id}`);
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
    
    const trade = await Trade.findById(req.params.id);
    
    if (!trade) {
      console.log('❌ Trade not found');
      return res.status(404).json({ message: 'Trade not found' });
    }

    console.log('📊 Current trade:', {
      id: trade._id,
      status: trade.status,
      offererUserId: trade.offererUserId,
      receiverUserId: trade.receiverUserId
    });

    // Check if user is involved in this trade
    if (trade.offererUserId.toString() !== req.user.id && 
        trade.receiverUserId.toString() !== req.user.id) {
      console.log('❌ Access denied - user not involved in trade');
      return res.status(403).json({ message: 'Access denied' });
    }

    const {
      status,
      receiverCashAmount,
      receiverVehicleIds,
      counterMessage
    } = req.body;

    // Validate status transitions
    const validTransitions = {
      'pending': ['accepted', 'rejected', 'cancelled', 'countered'],
      'countered': ['accepted', 'rejected', 'cancelled', 'countered'],
      'accepted': ['completed', 'declined'],
      'rejected': [],
      'cancelled': [],
      'completed': [],
      'declined': []
    };

    console.log(`🔄 Status transition check: ${trade.status} -> ${status}`);
    if (!validTransitions[trade.status].includes(status)) {
      console.log(`❌ Invalid status transition from ${trade.status} to ${status}`);
      return res.status(400).json({ 
        message: `Cannot transition from ${trade.status} to ${status}` 
      });
    }
    console.log(`✅ Status transition valid`);

    // Validate permissions for different actions
    if (status === 'cancelled') {
      console.log(`🔍 Checking cancellation permissions`);
      // Allow both offerer and receiver to cancel, but check if they're involved in the trade
      const isOfferer = trade.offererUserId.toString() === req.user.id;
      const isReceiver = trade.receiverUserId.toString() === req.user.id;
      
      if (!isOfferer && !isReceiver) {
        console.log(`❌ User not involved in trade for cancellation`);
        return res.status(403).json({ message: 'Only parties involved in the trade can cancel it' });
      }
      console.log(`✅ Cancellation permission granted`);
    }

    // For accept/reject, only the receiver can do these actions (but both can counter)
    if (['accepted', 'rejected'].includes(status)) {
      console.log(`🔍 Checking accept/reject permissions`);

      let isAllowed = false;

      // Scenario 1: Accepting/rejecting the initial offer. Only the receiver can do this.
      if (trade.status === 'pending' && trade.receiverUserId.toString() === req.user.id) {
        console.log('✅ Allowing action: User is receiver of a pending trade.');
        isAllowed = true;
      }
      
      // Scenario 2: Accepting/rejecting a counter-offer.
      if (trade.status === 'countered') {
        // The user taking action should NOT be the one who last countered.
        if (trade.lastCounteredBy) {
          // If lastCounteredBy is set, only allow the other party to accept/reject
          if (trade.lastCounteredBy.toString() !== req.user.id) {
            console.log('✅ Allowing action: User is recipient of a counter-offer.');
            isAllowed = true;
          } else {
            console.log(`❌ User ${req.user.id} is the same as lastCounteredBy ${trade.lastCounteredBy}`);
          }
        } else {
          // If lastCounteredBy is not set (legacy trade), allow both parties to accept/reject
          console.log('⚠️ Legacy trade without lastCounteredBy - allowing both parties to accept/reject');
          isAllowed = true;
        }
      }

      if (!isAllowed) {
        console.log(`❌ Permission denied for user ${req.user.id} to ${status} trade ${trade._id} with status ${trade.status}`);
        return res.status(403).json({ 
          message: 'It is not your turn to accept or reject this trade.' 
        });
      }

      console.log(`✅ Accept/reject permission granted`);
    }

    // For counter offers, validate and handle unified counter system
    if (status === 'countered') {
      console.log(`🔄 Processing counter offer`);
      const {
        counterVehicleIds = [],
        counterCashAmount = 0,
        counterMessage = ''
      } = req.body;

      console.log(`📋 Counter data:`, { counterVehicleIds, counterCashAmount, counterMessage });

      // Determine if current user is the original offerer or receiver
      const isOriginalOfferer = trade.offererUserId.toString() === req.user.id;
      const isOriginalReceiver = trade.receiverUserId.toString() === req.user.id;

      console.log(`👤 User roles:`, { isOriginalOfferer, isOriginalReceiver });

      if (!isOriginalOfferer && !isOriginalReceiver) {
        console.log(`❌ User not authorized to counter`);
        return res.status(403).json({ message: 'You are not authorized to counter this trade' });
      }

      // Validate counter vehicles based on who is countering
      if (counterVehicleIds.length > 0) {
        console.log(`🚗 Validating ${counterVehicleIds.length} counter vehicles`);
        if (isOriginalReceiver) {
          console.log(`🔍 Original receiver countering - validating vehicles belong to offerer`);
          // Original receiver is countering - they're selecting from offerer's vehicles
          // Validate that the selected vehicles belong to the original offerer
          const vehicles = await Vehicle.find({
            _id: { $in: counterVehicleIds },
            ownerId: trade.offererUserId
          });
          
          console.log(`📊 Found ${vehicles.length} vehicles owned by offerer out of ${counterVehicleIds.length} requested`);
          
          if (vehicles.length !== counterVehicleIds.length) {
            console.log(`❌ Vehicle validation failed - some vehicles don't belong to offerer`);
            return res.status(400).json({ message: 'Some counter vehicles do not belong to the original offerer' });
          }

          // Check if any vehicles are auctioned
          const auctionedVehicles = vehicles.filter(v => v.isAuctioned);
          if (auctionedVehicles.length > 0) {
            console.log(`❌ Some vehicles are auctioned:`, auctionedVehicles.map(v => v._id));
            return res.status(400).json({ 
              message: 'Some counter vehicles are currently in auction and cannot be traded' 
            });
          }
          console.log(`✅ Original receiver vehicle validation passed`);
        } else {
          console.log(`🔍 Original offerer counter-countering - validating vehicles belong to current user`);
          // Original offerer is counter-countering - they're selecting from their own vehicles
          const vehicles = await Vehicle.find({
            _id: { $in: counterVehicleIds },
            ownerId: req.user.id
          });
          
          console.log(`📊 Found ${vehicles.length} vehicles owned by current user out of ${counterVehicleIds.length} requested`);
          
          if (vehicles.length !== counterVehicleIds.length) {
            console.log(`❌ Vehicle validation failed - some vehicles don't belong to current user`);
            return res.status(400).json({ message: 'Some counter vehicles do not belong to you' });
          }

          // Check if any vehicles are auctioned
          const auctionedVehicles = vehicles.filter(v => v.isAuctioned);
          if (auctionedVehicles.length > 0) {
            console.log(`❌ Some vehicles are auctioned:`, auctionedVehicles.map(v => v._id));
            return res.status(400).json({ 
              message: 'Some counter vehicles are currently in auction and cannot be traded' 
            });
          }
          console.log(`✅ Original offerer vehicle validation passed`);
        }
      } else {
        console.log(`ℹ️ No vehicles in counter offer`);
      }

      // Update the appropriate fields based on who is countering
      if (isOriginalOfferer) {
        console.log(`🔄 Updating offerer fields for counter-counter`);
        // Original offerer is counter-countering - update their offer
        trade.offererCashAmount = counterCashAmount;
        trade.offererVehicleIds = counterVehicleIds;
      } else {
        console.log(`🔄 Updating receiver fields for counter`);
        // Original receiver is countering - update their counter
        trade.receiverCashAmount = counterCashAmount;
        trade.receiverVehicleIds = counterVehicleIds;
      }

      trade.counterMessage = counterMessage;
      trade.lastCounteredBy = req.user.id; // Set who made the last counter
      console.log(`✅ Counter offer processing complete`);
    }

    console.log(`🔄 Updating trade status to: ${status}`);
    // Update trade
    trade.status = status;
    trade.updatedAt = new Date();

    // Add to trade history
    const historyEntry = {
      action: status,
      userId: req.user.id,
      timestamp: new Date(),
      offererCashAmount: trade.offererCashAmount,
      offererVehicleIds: trade.offererVehicleIds,
      receiverCashAmount: trade.receiverCashAmount,
      receiverVehicleIds: trade.receiverVehicleIds,
      message: status === 'countered' ? trade.counterMessage : undefined
    };

    trade.tradeHistory.push(historyEntry);

    // If trade is accepted, remove all involved vehicles from listings and mark as in trade
    if (status === 'accepted') {
      console.log(`🔄 Trade ${trade._id} accepted - removing vehicles from listings`);
      
      // Get all vehicle IDs involved in the trade
      const allVehicleIds = [
        ...trade.offererVehicleIds,
        ...(trade.receiverVehicleIds || [])
      ];

      if (allVehicleIds.length > 0) {
        // Deactivate listings for all involved vehicles (only if they are currently listed)
        const deactivatedListings = await Listing.updateMany(
          { vehicleId: { $in: allVehicleIds }, isActive: true },
          { 
            isActive: false,
            deactivatedAt: new Date(),
            deactivatedReason: 'In accepted trade'
          }
        );

        console.log(`🚫 Deactivated ${deactivatedListings.modifiedCount} listings for vehicles in accepted trade`);

        // Update vehicle flags - mark as in trade and remove listing flags
        await Vehicle.updateMany(
          { _id: { $in: allVehicleIds } },
          { 
            isListed: false,
            listingId: null,
            isInTrade: true,
            tradeId: trade._id
          }
        );

        console.log(`🔄 Updated ${allVehicleIds.length} vehicles - removed listing flags and marked as in trade`);
      }

      // Cancel all other pending/active trades for this listing since it's now accepted
      const cancelledTrades = await Trade.updateMany(
        {
          listingId: trade.listingId,
          _id: { $ne: trade._id },
          status: { $in: ['pending', 'countered'] }
        },
        {
          status: 'cancelled',
          updatedAt: new Date()
        }
      );
      
      if (cancelledTrades.modifiedCount > 0) {
        console.log(`🚫 Cancelled ${cancelledTrades.modifiedCount} other trades for accepted listing ${trade.listingId}`);
      }
    }

    // If trade is completed, transfer vehicle ownership and mark listing as sold
    if (status === 'completed') {
      console.log(`🔄 Completing trade ${trade._id} - transferring ownership`);
      
      // Transfer vehicle ownership
      if (trade.offererVehicleIds.length > 0) {
        await Vehicle.updateMany(
          { _id: { $in: trade.offererVehicleIds } },
          { 
            ownerId: trade.receiverUserId,
            isListed: false,
            isAuctioned: false,
            listingId: null,
            isInTrade: false,
            tradeId: null
          }
        );
        console.log(`🔄 Transferred ${trade.offererVehicleIds.length} vehicles from offerer to receiver`);
      }

      if (trade.receiverVehicleIds && trade.receiverVehicleIds.length > 0) {
        await Vehicle.updateMany(
          { _id: { $in: trade.receiverVehicleIds } },
          { 
            ownerId: trade.offererUserId,
            isListed: false,
            isAuctioned: false,
            listingId: null,
            isInTrade: false,
            tradeId: null
          }
        );
        console.log(`🔄 Transferred ${trade.receiverVehicleIds.length} vehicles from receiver to offerer`);
      }

      // Mark the original listing as sold
      const listing = await Listing.findById(trade.listingId);
      if (listing) {
        listing.isActive = false;
        listing.soldAt = new Date();
        listing.soldTo = trade.offererUserId;
        listing.soldPrice = trade.offererCashAmount + 
          (await Vehicle.find({ _id: { $in: trade.offererVehicleIds } }))
            .reduce((sum, v) => sum + (v.customPrice || v.estimatedValue), 0);
        await listing.save();
        console.log(`✅ Marked listing ${listing._id} as sold due to completed trade ${trade._id}`);
      }

      trade.completedAt = new Date();
    }

    // If trade is cancelled, handle same as rejected (keep vehicles listed)
    if (status === 'cancelled') {
      console.log(`✅ Trade ${trade._id} cancelled - vehicles remain in their current state for relisting`);
      
      await trade.save();
      
      // Return the trade with minimal population for better performance
      const populatedTrade = await Trade.findById(trade._id)
        .populate('offererUserId', 'username email')
        .populate('receiverUserId', 'username email')
        .lean();

      // Convert _id to id for frontend compatibility
      const tradeWithId = {
        ...populatedTrade,
        id: populatedTrade._id.toString(),
        _id: undefined
      };

      return res.json(tradeWithId);
    }

    // Handle declined trades - mark as declined and restore vehicle availability
    if (status === 'declined') {
      console.log(`🔄 Trade ${trade._id} declined - restoring vehicle availability`);
      
      // Get all vehicle IDs involved in the trade
      const allVehicleIds = [
        ...trade.offererVehicleIds,
        ...(trade.receiverVehicleIds || [])
      ];

      if (allVehicleIds.length > 0) {
        // Clear trade flags from vehicles - they can now be relisted
        await Vehicle.updateMany(
          { _id: { $in: allVehicleIds } },
          { 
            isInTrade: false,
            tradeId: null
          }
        );
        console.log(`🔄 Cleared trade flags from ${allVehicleIds.length} vehicles - they can now be relisted`);
      }

      trade.completedAt = new Date();
    }

    // For rejected and cancelled trades, vehicles should remain in their current state (no action needed)
    if (['rejected', 'cancelled'].includes(status)) {
      console.log(`✅ Trade ${trade._id} ${status} - vehicles remain in their current state for future trades`);
    }

    console.log(`💾 Saving trade to database...`);
    await trade.save();
    console.log(`✅ Trade saved successfully`);

    console.log(`🔍 Fetching updated trade with population...`);
    // Return the trade with minimal population for better performance
    const populatedTrade = await Trade.findById(trade._id)
      .populate('offererUserId', 'username email')
      .populate('receiverUserId', 'username email')
      .lean();

    // Convert _id to id for frontend compatibility
    const tradeWithId = {
      ...populatedTrade,
      id: populatedTrade._id.toString(),
      _id: undefined
    };

    // 🔗 WEBSOCKET: Broadcast trade update to both users
    if (req.app.locals.webSocket) {
      const socket = req.app.locals.webSocket;
      socket.broadcastToUser(trade.offererUserId._id.toString(), {
        type: 'TRADE_UPDATED',
        data: trade
      });
      socket.broadcastToUser(trade.receiverUserId._id.toString(), {
        type: 'TRADE_UPDATED',
        data: trade
      });
      console.log(`🔗 Broadcasted TRADE_UPDATED to ${trade.offererUserId._id} and ${trade.receiverUserId._id}`);
    }

    console.log(`📤 Sending response with trade ID: ${tradeWithId.id}`);
    res.json(tradeWithId);
  } catch (error) {
    console.error('Error updating trade:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete a trade (by either party if pending/countered)
router.delete('/:id', auth, async (req, res) => {
  try {
    const trade = await Trade.findById(req.params.id);
    
    if (!trade) {
      return res.status(404).json({ message: 'Trade not found' });
    }

    // Allow both offerer and receiver to delete (needed for counter offers)
    const isOfferer = trade.offererUserId.toString() === req.user.id;
    const isReceiver = trade.receiverUserId.toString() === req.user.id;
    
    if (!isOfferer && !isReceiver) {
      return res.status(403).json({ message: 'Only parties involved in the trade can delete it' });
    }

    // Only allow deletion of pending or countered trades
    if (!['pending', 'countered'].includes(trade.status)) {
      return res.status(400).json({ message: 'Can only delete pending or countered trades' });
    }

    // Don't clear vehicle flags when deleting trade (vehicles remain in their current state)
    console.log(`🗑️ Deleting trade ${trade._id} - vehicles remain in their current state`);

    await Trade.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Trade deleted successfully' });
  } catch (error) {
    console.error('Error deleting trade:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;