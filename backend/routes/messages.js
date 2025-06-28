const express = require('express');
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all messages for the authenticated user with pagination
router.get('/my', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    const messages = await Message.find({
      $or: [
        { senderId: req.user.id },
        { receiverId: req.user.id }
      ]
    })
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .populate('senderId', 'username email avatar')
    .populate('receiverId', 'username email avatar')
    .lean(); // Use lean() for better performance

    // Convert MongoDB ObjectIds to strings for frontend consistency
    const formattedMessages = messages.map(msg => ({
      ...msg,
      id: msg._id.toString(),
      senderId: typeof msg.senderId === 'object' ? {
        ...msg.senderId,
        id: msg.senderId._id.toString()
      } : msg.senderId,
      receiverId: typeof msg.receiverId === 'object' ? {
        ...msg.receiverId,
        id: msg.receiverId._id.toString()
      } : msg.receiverId,
      timestamp: msg.timestamp.toISOString()
    }));

    res.json(formattedMessages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get messages for a specific conversation
router.get('/conversation/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Validate that the other user exists
    const otherUser = await User.findById(userId);
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const messages = await Message.find({
      $or: [
        { senderId: req.user.id, receiverId: userId },
        { senderId: userId, receiverId: req.user.id }
      ]
    })
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .populate('senderId', 'username email avatar')
    .populate('receiverId', 'username email avatar')
    .lean();

    // Format messages for frontend
    const formattedMessages = messages.map(msg => ({
      ...msg,
      id: msg._id.toString(),
      senderId: typeof msg.senderId === 'object' ? {
        ...msg.senderId,
        id: msg.senderId._id.toString()
      } : msg.senderId,
      receiverId: typeof msg.receiverId === 'object' ? {
        ...msg.receiverId,
        id: msg.receiverId._id.toString()
      } : msg.receiverId,
      timestamp: msg.timestamp.toISOString()
    })).reverse(); // Reverse to get chronological order

    res.json(formattedMessages);
  } catch (error) {
    console.error('Error fetching conversation messages:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get conversations list with last message and unread count
router.get('/conversations', auth, async (req, res) => {
  try {
    // Aggregate to get conversation data efficiently
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: req.user._id },
            { receiverId: req.user._id }
          ]
        }
      },
      {
        $addFields: {
          otherUserId: {
            $cond: {
              if: { $eq: ['$senderId', req.user._id] },
              then: '$receiverId',
              else: '$senderId'
            }
          }
        }
      },
      {
        $sort: { timestamp: -1 }
      },
      {
        $group: {
          _id: '$otherUserId',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: {
                if: {
                  $and: [
                    { $eq: ['$receiverId', req.user._id] },
                    { $eq: ['$read', false] }
                  ]
                },
                then: 1,
                else: 0
              }
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'otherUser'
        }
      },
      {
        $unwind: '$otherUser'
      },
      {
        $project: {
          id: { $concat: [{ $toString: '$_id' }, '-', { $toString: req.user._id }] },
          participants: [req.user._id, '$_id'],
          lastMessage: '$lastMessage',
          unreadCount: '$unreadCount',
          updatedAt: '$lastMessage.timestamp',
          otherUser: {
            id: { $toString: '$otherUser._id' },
            username: '$otherUser.username',
            avatar: '$otherUser.avatar'
          }
        }
      },
      {
        $sort: { updatedAt: -1 }
      }
    ]);

    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send a new message
router.post('/', auth, async (req, res) => {
  try {
    const {
      receiverId,
      content,
      tradeId,
      listingId
    } = req.body;

    // Validate required fields
    if (!receiverId || !content || !content.trim()) {
      return res.status(400).json({ message: 'Receiver ID and content are required' });
    }

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    // Check if user is trying to message themselves
    if (req.user.id === receiverId) {
      return res.status(400).json({ message: 'Cannot send message to yourself' });
    }

    // Create the message
    const message = new Message({
      senderId: req.user.id,
      receiverId,
      content: content.trim(),
      tradeId: tradeId || undefined,
      listingId: listingId || undefined,
      read: false
    });

    await message.save();

    // Return formatted message without population for speed
    const formattedMessage = {
      id: message._id.toString(),
      senderId: req.user.id,
      receiverId,
      content: message.content,
      timestamp: message.timestamp.toISOString(),
      read: message.read,
      tradeId: message.tradeId,
      listingId: message.listingId
    };

    // 🔗 WEBSOCKET: Broadcast new message to receiver
    if (req.app.locals.webSocket) {
      req.app.locals.webSocket.broadcastToUser(receiverId, {
        type: 'MESSAGE_RECEIVED',
        data: formattedMessage,
        timestamp: new Date().toISOString()
      });
    }

    res.status(201).json(formattedMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark messages in a conversation as read
router.post('/conversation/:userId/read', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Mark all unread messages from this user as read
    const result = await Message.updateMany(
      {
        senderId: userId,
        receiverId: req.user.id,
        read: false
      },
      { 
        read: true,
        readAt: new Date()
      }
    );

    res.json({ 
      message: 'Messages marked as read', 
      count: result.modifiedCount 
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Legacy route for backward compatibility
router.post('/:conversationId/read', auth, async (req, res) => {
  try {
    // Extract user IDs from conversation ID (format: userId1-userId2)
    const { conversationId } = req.params;
    const userIds = conversationId.split('-');
    const otherUserId = userIds.find(id => id !== req.user.id);

    if (!otherUserId) {
      return res.status(400).json({ message: 'Invalid conversation ID' });
    }

    // Mark all unread messages from the other user as read
    const result = await Message.updateMany(
      {
        senderId: otherUserId,
        receiverId: req.user.id,
        read: false
      },
      { 
        read: true,
        readAt: new Date()
      }
    );

    res.json({ 
      message: 'Messages marked as read', 
      count: result.modifiedCount 
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get unread message count
router.get('/unread/count', auth, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiverId: req.user.id,
      read: false
    });

    res.json({ count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete a message (only sender can delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only sender can delete
    if (message.senderId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the sender can delete a message' });
    }

    await Message.findByIdAndDelete(req.params.id);
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 
 
 