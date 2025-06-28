const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  originalPrice: {
    type: Number,
    min: 0
  },
  priceHistory: [{
    price: {
      type: Number,
      required: true,
      min: 0
    },
    changedAt: {
      type: Date,
      default: Date.now
    }
  }],
  lastEditedAt: {
    type: Date
  },
  problems: [{
    type: String,
    trim: true
  }],
  additionalFeatures: [{
    type: String,
    trim: true
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  views: {
    type: Number,
    default: 0,
    min: 0
  },
  lastRenewed: {
    type: Date,
    default: Date.now
  },
  canRenewAfter: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours from now
    }
  },
  featured: {
    type: Boolean,
    default: false
  },
  soldAt: {
    type: Date
  },
  soldTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  soldPrice: {
    type: Number,
    min: 0
  },
  deactivatedAt: {
    type: Date
  },
  deactivatedReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for better performance
listingSchema.index({ sellerId: 1 });
listingSchema.index({ vehicleId: 1 });
listingSchema.index({ isActive: 1 });
listingSchema.index({ price: 1 });
listingSchema.index({ createdAt: -1 });
listingSchema.index({ lastRenewed: -1 });
listingSchema.index({ tags: 1 });

// Text search index
listingSchema.index({
  title: 'text',
  description: 'text',
  tags: 'text'
});

// Virtual for time since last renewal
listingSchema.virtual('canRenew').get(function() {
  return new Date() >= this.canRenewAfter;
});

// Virtual for days since created
listingSchema.virtual('daysOld').get(function() {
  return Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual to check if price has changed
listingSchema.virtual('priceChanged').get(function() {
  return this.originalPrice && this.price !== this.originalPrice;
});

// Virtual to get previous price (most recent before current)
listingSchema.virtual('previousPrice').get(function() {
  if (this.priceHistory && this.priceHistory.length > 1) {
    return this.priceHistory[this.priceHistory.length - 2].price;
  }
  return null;
});

// Method to increment views
listingSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Method to renew listing
listingSchema.methods.renew = function() {
  if (!this.canRenew) {
    throw new Error('Cannot renew listing yet. Must wait 24 hours.');
  }
  
  this.lastRenewed = new Date();
  this.canRenewAfter = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return this.save();
};

// Pre-save middleware to track price changes and set original price
listingSchema.pre('save', function(next) {
  // Set original price on first save
  if (this.isNew && this.price && !this.originalPrice) {
    this.originalPrice = this.price;
    this.priceHistory = [{ price: this.price, changedAt: new Date() }];
  }
  
  // Track price changes on updates
  if (!this.isNew && this.isModified('price')) {
    this.priceHistory.push({ price: this.price, changedAt: new Date() });
    this.lastEditedAt = new Date();
  }
  
  // Track other field changes
  if (!this.isNew && (this.isModified('title') || this.isModified('description') || 
                      this.isModified('problems') || this.isModified('additionalFeatures') || 
                      this.isModified('tags'))) {
    this.lastEditedAt = new Date();
  }
  
  next();
});

// Ensure virtual fields are serialized
listingSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Listing', listingSchema); 