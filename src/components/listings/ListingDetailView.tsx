import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Car, Calendar, Gauge, DollarSign, User, MessageCircle, ArrowLeftRight, Eye, MapPin, Phone, ChevronLeft, ChevronRight, Copy, Check } from 'lucide-react';
import { Listing, Vehicle, User as UserType } from '../../types/index.ts';
import { useApp } from '../../context/AppContext.tsx';
import { MessageButton } from '../messages/MessageButton.tsx';
import { ImageModal } from '../common/ImageModal.tsx';

interface ListingDetailViewProps {
  listing: Listing;
  vehicle: Vehicle;
  seller: UserType;
  onClose: () => void;
  onContact: (listing: Listing) => void;
  onTrade: (listing: Listing) => void;
  onSellerClick?: (seller: UserType) => void;
}

export function ListingDetailView({ listing, vehicle, seller, onClose, onContact, onTrade, onSellerClick }: ListingDetailViewProps) {
  const { state, showSuccess, showError } = useApp();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [vinCopied, setVinCopied] = useState(false);

  // Check if current user is the seller to prevent self-trading/contacting
  const isOwnListing = state.currentUser?.id === listing.sellerId;

  const nextImage = () => {
    if (vehicle.images && vehicle.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % vehicle.images.length);
    }
  };

  const prevImage = () => {
    if (vehicle.images && vehicle.images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + vehicle.images.length) % vehicle.images.length);
    }
  };

  const handleImageClick = () => {
    setImageModalOpen(true);
  };

  const handleCopyVin = async () => {
    try {
      await navigator.clipboard.writeText(vehicle.vin);
      setVinCopied(true);
      setTimeout(() => setVinCopied(false), 2000);
      showSuccess('VIN Copied!', `VIN ${vehicle.vin} copied to clipboard`, 3000);
    } catch (err) {
      console.error('Failed to copy VIN:', err);
      showError('Copy Failed', 'Unable to copy VIN to clipboard', 4000);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      const now = new Date();
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateString);
        return 'Unknown';
      }
      
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h ago`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d ago`;
      if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;
      
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'Unknown';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="glass-effect rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-primary-700/30">
          <div>
            <h1 className="text-2xl font-bold text-primary-100">{listing.title}</h1>
            <p className="text-primary-300">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </p>
            <div className="flex items-center space-x-4 text-sm text-primary-400 mt-2">
              <div className="flex items-center space-x-1">
                <Eye className="w-4 h-4" />
                <span>{listing.views} views</span>
              </div>
              <span>•</span>
              <div>
                <span>ID: {listing.id.slice(-8)}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-primary-800/50 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-primary-300" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          {/* Left Column - Images and Basic Info */}
          <div className="space-y-6">
            {/* Image Gallery */}
            <div className="relative">
              <div className="w-full h-80 bg-gradient-to-br from-primary-800/30 to-primary-700/30 rounded-xl overflow-hidden">
                {vehicle.images && vehicle.images.length > 0 ? (
                  <img
                    src={vehicle.images[currentImageIndex]}
                    alt={listing.title}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={handleImageClick}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Car className="w-20 h-20 text-primary-400" />
                  </div>
                )}
              </div>

              {/* Image Navigation */}
              {vehicle.images && vehicle.images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                    {currentImageIndex + 1} / {vehicle.images.length}
                  </div>
                </>
              )}

              {/* Price Badge */}
              <div className="absolute top-3 right-3 bg-green-500/90 text-white px-4 py-2 rounded-full font-bold text-lg">
                {listing.priceChanged && listing.previousPrice ? (
                  <div className="flex flex-col items-end">
                    <span className="text-sm line-through opacity-75">
                      ${listing.previousPrice.toLocaleString()}
                    </span>
                    <span>${listing.price.toLocaleString()}</span>
                  </div>
                ) : (
                  <span>${listing.price.toLocaleString()}</span>
                )}
              </div>
            </div>

            {/* Image Thumbnails */}
            {vehicle.images && vehicle.images.length > 1 && (
              <div className="flex space-x-2 overflow-x-auto">
                {vehicle.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      index === currentImageIndex ? 'border-blue-500' : 'border-primary-700/30'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${listing.title} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              {isOwnListing ? (
                <div className="flex-1 glass-effect rounded-lg px-4 py-3 text-center">
                  <p className="text-primary-400 text-sm">This is your own listing</p>
                </div>
              ) : (
                <>
                  <MessageButton
                    targetUser={seller}
                    listingId={listing.id}
                    initialMessage={`Hi! I'm interested in your ${vehicle.year} ${vehicle.make} ${vehicle.model} listing.`}
                    variant="primary"
                    className="flex-1"
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onTrade(listing)}
                    className="flex-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-lg px-4 py-3 flex items-center justify-center space-x-2 transition-colors"
                  >
                    <ArrowLeftRight className="w-5 h-5" />
                    <span>Make Trade Offer</span>
                  </motion.button>
                </>
              )}
            </div>

            {/* Vehicle Details */}
            <div className="glass-effect rounded-xl p-4">
              <h3 className="text-lg font-semibold text-primary-100 mb-4">Vehicle Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-primary-400" />
                  <div>
                    <p className="text-sm text-primary-400">Year</p>
                    <p className="font-medium text-primary-200">{vehicle.year}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Gauge className="w-5 h-5 text-primary-400" />
                  <div>
                    <p className="text-sm text-primary-400">Mileage</p>
                    <p className="font-medium text-primary-200">{vehicle.mileage.toLocaleString()} mi</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Car className="w-5 h-5 text-primary-400" />
                  <div>
                    <p className="text-sm text-primary-400">Transmission</p>
                    <p className="font-medium text-primary-200 capitalize">{vehicle.transmission}</p>
                  </div>
                </div>

                <div className="col-span-2 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                  <Car className="w-5 h-5 text-primary-400" />
                  <div>
                    <p className="text-sm text-primary-400">VIN</p>
                    <p className="font-medium text-primary-200 font-mono">{vehicle.vin}</p>
                  </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCopyVin}
                    className="p-2 hover:bg-primary-800/50 rounded-lg transition-colors"
                    title="Copy VIN"
                  >
                    {vinCopied ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <Copy className="w-5 h-5 text-primary-400" />
                    )}
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Seller Information */}
            <div className="glass-effect rounded-xl p-4 hover:shadow-xl transition-all duration-300">
              <h3 className="text-lg font-semibold text-primary-100 mb-3">Seller Information</h3>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSellerClick && onSellerClick(seller)}
                className="w-full text-left hover:bg-primary-800/30 rounded-lg p-2 -m-2 transition-colors group"
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-primary-800/50 rounded-full flex items-center justify-center overflow-hidden">
                    {seller.avatar ? (
                      <img
                        src={seller.avatar}
                        alt={seller.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-primary-300" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-primary-200 group-hover:text-blue-300 transition-colors">@{seller.username}</p>
                    <div className="text-sm text-primary-400">
                      <p>Listed {formatTimeAgo(listing.createdAt)}</p>
                      {listing.lastEditedAt && (
                        <p className="text-yellow-400">
                          Last edited {formatTimeAgo(listing.lastEditedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Contact Info */}
                <div className="space-y-2">
                  {seller.phone && (
                    <div className="flex items-center space-x-2 text-sm text-primary-300">
                      <Phone className="w-4 h-4" />
                      <span>{seller.phone}</span>
                    </div>
                  )}
                  {seller.location && (
                    <div className="flex items-center space-x-2 text-sm text-primary-300">
                      <MapPin className="w-4 h-4" />
                      <span>{seller.location}</span>
                    </div>
                  )}
                </div>
              </motion.button>
            </div>
          </div>

          {/* Right Column - Details and Actions */}
          <div className="space-y-6">
            {/* Description */}
            {listing.description && (
              <div className="glass-effect rounded-xl p-4">
                <h3 className="text-lg font-semibold text-primary-100 mb-3">Description</h3>
                <p className="text-primary-300 leading-relaxed whitespace-pre-wrap">
                  {listing.description}
                </p>
              </div>
            )}

            {/* Tags */}
            {listing.tags && listing.tags.length > 0 && (
              <div className="glass-effect rounded-xl p-4">
                <h3 className="text-lg font-semibold text-primary-100 mb-3">Features & Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {listing.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm border border-blue-500/30"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Known Issues */}
            {listing.problems && listing.problems.length > 0 && (
              <div className="glass-effect rounded-xl p-4">
                <h3 className="text-lg font-semibold text-primary-100 mb-3">Known Issues</h3>
                <div className="flex flex-col gap-2">
                  {listing.problems.map((problem, index) => (
                    <span
                      key={index}
                      className="bg-yellow-500/20 text-yellow-300 px-3 py-2 rounded-full text-sm border border-yellow-500/30"
                    >
                      {problem}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Features */}
            {listing.additionalFeatures && listing.additionalFeatures.length > 0 && (
              <div className="glass-effect rounded-xl p-4">
                <h3 className="text-lg font-semibold text-primary-100 mb-3">Additional Features</h3>
                <div className="flex flex-wrap gap-2">
                  {listing.additionalFeatures.map((feature, index) => (
                    <span
                      key={index}
                      className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm border border-green-500/30"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Price History */}
            {listing.priceHistory && listing.priceHistory.length > 1 && (
              <div className="glass-effect rounded-xl p-4">
                <h3 className="text-lg font-semibold text-primary-100 mb-3">Price History</h3>
                <div className="space-y-2">
                  {listing.priceHistory.slice().reverse().map((priceEntry, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-2 rounded-lg ${
                        index === 0 ? 'bg-green-500/10 border border-green-500/20' : 'bg-primary-800/20'
                      }`}
                    >
                      <span className={`font-medium ${index === 0 ? 'text-green-400' : 'text-primary-300'}`}>
                        ${priceEntry.price.toLocaleString()}
                      </span>
                      <span className="text-xs text-primary-400">
                        {index === 0 ? 'Current' : formatTimeAgo(priceEntry.changedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Listing History */}
            {listing.history && listing.history.length > 0 && (
            <div className="glass-effect rounded-xl p-4">
                <h3 className="text-lg font-semibold text-primary-100 mb-3">Listing History</h3>
                <div className="space-y-2">
                  {listing.history.slice().reverse().map((historyEntry, index) => {
                    let displayText = '';
                    let displayValue = '';
                    
                    switch (historyEntry.type) {
                      case 'price_change':
                        displayText = 'Price changed';
                        displayValue = `$${historyEntry.newValue.toLocaleString()}`;
                        break;
                      case 'title_update':
                        displayText = 'Title updated';
                        displayValue = historyEntry.newValue;
                        break;
                      case 'description_update':
                        displayText = 'Description updated';
                        displayValue = 'View changes';
                        break;
                      case 'problems_update':
                        displayText = 'Problems updated';
                        displayValue = `${historyEntry.newValue.length} items`;
                        break;
                      case 'features_update':
                        displayText = 'Features updated';
                        displayValue = `${historyEntry.newValue.length} items`;
                        break;
                      case 'tags_update':
                        displayText = 'Tags updated';
                        displayValue = `${historyEntry.newValue.length} tags`;
                        break;
                    }
                    
                    return (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-2 rounded-lg ${
                          index === 0 ? 'bg-green-500/10 border border-green-500/20' : 'bg-primary-800/20'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className={`font-medium ${index === 0 ? 'text-green-400' : 'text-primary-300'}`}>
                            {displayText}
                          </span>
                          <span className="text-xs text-primary-400">
                            {displayValue}
                          </span>
                  </div>
                        <span className="text-xs text-primary-400">
                          {index === 0 ? 'Latest' : formatTimeAgo(historyEntry.changedAt)}
                        </span>
                  </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Image Modal - Render outside the modal container */}
      <ImageModal
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        images={vehicle.images || []}
        currentIndex={currentImageIndex}
        onNavigate={setCurrentImageIndex}
        title={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
      />
    </motion.div>
  );
} 