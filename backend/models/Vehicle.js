const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  make: {
    type: String,
    required: true,
    trim: true
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  year: {
    type: Number,
    required: true,
    min: 1900,
    max: new Date().getFullYear() + 1
  },
  vin: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  mileage: {
    type: Number,
    required: true,
    min: 0
  },
  transmission: {
    type: String,
    required: true,
    enum: ['manual', 'automatic']
  },
  estimatedValue: {
    type: Number,
    required: true,
    min: 0
  },
  customPrice: {
    type: Number,
    min: 0
  },
  images: [{
    type: String // Cloudinary URLs
  }],
  isListed: {
    type: Boolean,
    default: false
  },
  isAuctioned: {
    type: Boolean,
    default: false
  },
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing'
  },
  auctionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Auction'
  }
}, {
  timestamps: true
});

// Indexes for better performance
vehicleSchema.index({ ownerId: 1 });
vehicleSchema.index({ make: 1, model: 1 });
vehicleSchema.index({ year: 1 });
vehicleSchema.index({ isListed: 1 });
vehicleSchema.index({ isAuctioned: 1 });

// Virtual for full vehicle name
vehicleSchema.virtual('fullName').get(function() {
  return `${this.year} ${this.make} ${this.model}`;
});

// Ensure virtual fields are serialized
vehicleSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Vehicle', vehicleSchema); 
 
 