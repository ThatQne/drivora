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
  history: [{
    type: {
      type: String,
      enum: ['price_change', 'title_update', 'description_update', 'problems_update', 'features_update', 'tags_update'],
      required: true
    },
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
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
  },
  updatedAt: {
    type: Date,
    default: Date.now
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
    throw new Error('Cannot renew listing yet. Must wait 12 hours.');
  }
  
  // Update timestamps to move listing to top
  const now = new Date();
  this.lastRenewed = now;
  this.canRenewAfter = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12 hours
  this.updatedAt = now; // This will move it to the top in "newest" sort
  return this.save();
};

// Pre-save middleware to track changes
listingSchema.pre('save', async function(next) {
  // Set original price on first save
  if (this.isNew && this.price && !this.originalPrice) {
    this.originalPrice = this.price;
    this.history = [{
      type: 'price_change',
      oldValue: null,
      newValue: this.price,
      changedAt: new Date()
    }];
  }
  
  // Track changes on updates
  if (!this.isNew) {
    // Get the original document from database to compare changes
    const original = await this.constructor.findById(this._id);
    if (!original) return next();
    
    if (this.isModified('price') && original.price !== this.price) {
      this.history.push({
        type: 'price_change',
        oldValue: original.price,
        newValue: this.price,
        changedAt: new Date()
      });
    }
    
    if (this.isModified('title') && original.title !== this.title) {
      this.history.push({
        type: 'title_update',
        oldValue: original.title,
        newValue: this.title,
        changedAt: new Date()
      });
  }
  
    if (this.isModified('description') && original.description !== this.description) {
      this.history.push({
        type: 'description_update',
        oldValue: original.description,
        newValue: this.description,
        changedAt: new Date()
      });
    }
    
    if (this.isModified('problems') && JSON.stringify(original.problems) !== JSON.stringify(this.problems)) {
      this.history.push({
        type: 'problems_update',
        oldValue: original.problems,
        newValue: this.problems,
        changedAt: new Date()
      });
    }
    
    if (this.isModified('additionalFeatures') && JSON.stringify(original.additionalFeatures) !== JSON.stringify(this.additionalFeatures)) {
      this.history.push({
        type: 'features_update',
        oldValue: original.additionalFeatures,
        newValue: this.additionalFeatures,
        changedAt: new Date()
      });
    }
    
    if (this.isModified('tags') && JSON.stringify(original.tags) !== JSON.stringify(this.tags)) {
      this.history.push({
        type: 'tags_update',
        oldValue: original.tags,
        newValue: this.tags,
        changedAt: new Date()
      });
    }
    
    // Update lastEditedAt if any field was modified
    const modifiedPaths = this.modifiedPaths();
    if (modifiedPaths.length > 0) {
    this.lastEditedAt = new Date();
    }
  }
  
  next();
});

// Ensure virtual fields are serialized
listingSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Listing', listingSchema); 