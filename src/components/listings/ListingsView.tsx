import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Eye, 
  Heart, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Car, 
  User, 
  MessageCircle, 
  Phone,
  Clock,
  ChevronLeft,
  ChevronRight,
  Image
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { Listing, Vehicle } from '../../types/index.ts';
import { ListingDetailView } from './ListingDetailView.tsx';
import { SellerProfileView } from '../profile/SellerProfileView.tsx';
import { TradeOfferModal } from '../trades/TradeOfferModal.tsx';
import { MessageButton } from '../messages/MessageButton';

export function ListingsView() {
  const { state, incrementListingViews, loadAllListings, getUserProfile } = useApp();
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [selectedSeller, setSelectedSeller] = useState<any>(null);
  const [showTradeOffer, setShowTradeOffer] = useState(false);
  const [tradeOfferListing, setTradeOfferListing] = useState<any>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filterBy, setFilterBy] = useState('all');
  const [priceRange, setPriceRange] = useState([0, 200000]);
  const [yearRange, setYearRange] = useState([1990, new Date().getFullYear()]);
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Update loading state when listings are loaded
  useEffect(() => {
    if (state.allListings.length > 0) {
      setIsLoading(false);
    }
  }, [state.allListings.length]);

  // Memoize listings processing to avoid re-computation on every render
  const listingsWithVehicles = useMemo(() => {
    const result = state.allListings
      .filter(listing => listing.isActive)
      .map(listing => {
        // First try to use populated vehicle data from backend
        let vehicle = (listing as any).vehicle;
        
        // If not populated, try to find vehicle in local state
        if (!vehicle) {
          vehicle = state.vehicles.find(v => v.id === listing.vehicleId);
        }
        
        // First try to use populated seller data from backend
        let seller = (listing as any).seller;
        
        // If not populated, try to find seller in users or use current user as fallback
        if (!seller) {
          seller = state.users.find(u => u.id === listing.sellerId) || state.currentUser || {
            id: listing.sellerId,
            username: 'Unknown User',
            email: 'contact@example.com',
            password: '',
            createdAt: new Date().toISOString(),
            location: 'Location not specified'
          };
        }
        
        return {
          ...listing,
          vehicle,
          seller
        };
      })
      .filter(item => item.vehicle && item.seller); // Only include listings with valid vehicles and sellers

    return result;
  }, [state.allListings, state.vehicles, state.users, state.currentUser]);

  // Memoize filtered listings to avoid re-filtering on every render
  const filteredListings = useMemo(() => {
    return listingsWithVehicles.filter(listing => {
      if (!listing.vehicle) return false;
      
      const matchesSearch = listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           listing.vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           listing.vehicle.model.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesPrice = (!priceRange[0] || listing.price >= priceRange[0]) &&
                          (!priceRange[1] || listing.price <= priceRange[1]);
      
      return matchesSearch && matchesPrice;
    });
  }, [listingsWithVehicles, searchTerm, priceRange]);

  // Memoize sorted listings
  const sortedListings = useMemo(() => {
    return [...filteredListings].sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'mileage':
          return (a.vehicle?.mileage || 0) - (b.vehicle?.mileage || 0);
        case 'year':
          return (b.vehicle?.year || 0) - (a.vehicle?.year || 0);
        default: // newest
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [filteredListings, sortBy]);

  // Memoize makes list
  const makes = useMemo(() => {
    return Array.from(new Set(listingsWithVehicles.map(l => l.vehicle?.make).filter(Boolean))).sort();
  }, [listingsWithVehicles]);

  const handleContactSeller = (listing: any) => {
    // TODO: Implement messaging functionality
    alert(`Contact seller: ${listing.seller.username}`);
  };

  const handleTradeOffer = (listing: any) => {
    setTradeOfferListing(listing);
    setShowTradeOffer(true);
  };

  const handleListingClick = (listing: any) => {
    incrementListingViews(listing.id);
    setSelectedListing(listing);
  };

  const handleSellerClick = (seller: any) => {
    setSelectedSeller(seller);
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

  // Show seller profile if selected
  if (selectedSeller) {
    return (
      <SellerProfileView
        sellerId={selectedSeller.id}
        onBack={() => setSelectedSeller(null)}
        onListingClick={(listing) => {
          // Navigate back to listings view
          setSelectedSeller(null);
          // Open the specific listing
          handleListingClick(listing);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-primary-100">Vehicle Listings</h1>
        <p className="text-primary-300 mt-1">
          Browse and search through available vehicles
        </p>
      </div>

      {/* Search and Filters */}
      <div className="glass-effect rounded-xl p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-400" />
            <input
              type="text"
              placeholder="Search by make, model, or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          {/* Filter Toggle */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center space-x-2 ${showFilters ? 'bg-primary-100/20' : ''}`}
          >
            <Filter className="w-5 h-5" />
            <span>Filters</span>
          </motion.button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-primary-700/30"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Make Filter */}
              <div>
                <label className="block text-sm font-medium text-primary-300 mb-2">
                  Make
                </label>
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value)}
                  className="input-field"
                >
                  <option value="all">All Makes</option>
                  {makes.map(make => (
                    <option key={make} value={make}>{make}</option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-primary-300 mb-2">
                  Min Price
                </label>
                <input
                  type="number"
                  placeholder="$0"
                  value={priceRange[0]}
                  onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-300 mb-2">
                  Max Price
                </label>
                <input
                  type="number"
                  placeholder="No limit"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                  className="input-field"
                />
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-primary-300 mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="input-field"
                >
                  <option value="newest">Newest First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="mileage">Lowest Mileage</option>
                  <option value="year">Newest Year</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Loading State */}
      {isLoading ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="w-24 h-24 bg-primary-800/50 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Car className="w-12 h-12 text-primary-400" />
          </div>
          <h3 className="text-xl font-semibold text-primary-200 mb-2">Loading listings...</h3>
          <p className="text-primary-400">Please wait while we fetch the latest vehicle listings</p>
        </motion.div>
      ) : (
        <>
          {/* Listings Grid */}
          {sortedListings.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="w-24 h-24 bg-primary-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Car className="w-12 h-12 text-primary-400" />
              </div>
              <h3 className="text-xl font-semibold text-primary-200 mb-2">No listings found</h3>
              <p className="text-primary-400 mb-6">
                {state.allListings.length === 0 
                  ? "No vehicles are currently listed for sale"
                  : "Try adjusting your search criteria"
                }
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnimatePresence>
                {sortedListings.map((listing, index) => (
                  <motion.div
                    key={listing.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    className="glass-effect rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer"
                    onClick={() => handleListingClick(listing)}
                  >
                    {/* Vehicle Image */}
                    <div className="relative w-full h-48 bg-gradient-to-br from-primary-800/30 to-primary-700/30 overflow-hidden">
                      {listing.vehicle?.images && listing.vehicle.images.length > 0 ? (
                        <>
                          <img
                            src={listing.vehicle.images[0]}
                            alt={`${listing.vehicle.year} ${listing.vehicle.make} ${listing.vehicle.model}`}
                            className="w-full h-full object-cover"
                          />
                          
                          {/* Image Count Badge - Only show if multiple images */}
                          {listing.vehicle.images.length > 1 && (
                            <div className="absolute bottom-3 right-3 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
                              <Image className="w-3 h-3 inline mr-1" />
                              {listing.vehicle.images.length}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Car className="w-16 h-16 text-primary-600/50" />
                        </div>
                      )}
                    </div>

                    {/* Price Badge */}
                    <div className="absolute top-3 right-3 bg-green-500/90 text-white px-3 py-1 rounded-full font-bold">
                      {listing.priceChanged && listing.previousPrice ? (
                        <div className="flex flex-col items-end">
                          <span className="text-xs line-through opacity-75">
                            ${listing.previousPrice.toLocaleString()}
                          </span>
                          <span>${listing.price.toLocaleString()}</span>
                        </div>
                      ) : (
                        <span>${listing.price.toLocaleString()}</span>
                      )}
                    </div>

                    <div className="p-6">
                      {/* Listing Title */}
                      <h3 className="text-xl font-bold text-primary-100 mb-2 line-clamp-2">
                        {listing.title}
                      </h3>

                      {/* Vehicle Details */}
                      {listing.vehicle && (
                        <div className="flex items-center justify-between text-sm text-primary-400 mb-4">
                          <div className="flex items-center space-x-4">
                            <span>{listing.vehicle.year}</span>
                            <span>•</span>
                            <span>{listing.vehicle.mileage.toLocaleString()} mi</span>
                            <span>•</span>
                            <span className="capitalize">{listing.vehicle.transmission}</span>
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      {listing.tags && listing.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {listing.tags.slice(0, 3).map((tag, tagIndex) => (
                            <span
                              key={tagIndex}
                              className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-xs border border-blue-500/30"
                            >
                              {tag}
                            </span>
                          ))}
                          {listing.tags.length > 3 && (
                            <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-xs border border-blue-500/30">
                              +{listing.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Known Issues - Column Layout with Bubbles */}
                      {listing.problems && listing.problems.length > 0 && (
                        <div className="mb-4">
                          <p className="text-yellow-400 text-xs font-medium mb-2">Known Issues:</p>
                          <div className="flex flex-col gap-2">
                            {listing.problems.slice(0, 2).map((problem, problemIndex) => (
                              <span
                                key={problemIndex}
                                className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-xs border border-yellow-500/30 self-start"
                              >
                                {problem}
                              </span>
                            ))}
                            {listing.problems.length > 2 && (
                              <span className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-xs border border-yellow-500/30 self-start">
                                +{listing.problems.length - 2} more issues
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Footer - Simplified */}
                      <div className="flex items-center justify-between pt-4 border-t border-primary-700/30">
                        {/* Seller Info */}
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSellerClick(listing.seller);
                          }}
                          className="flex items-center space-x-2 hover:bg-primary-800/30 rounded-lg p-2 -m-2 transition-colors"
                        >
                          <div className="w-8 h-8 bg-primary-800/50 rounded-full flex items-center justify-center overflow-hidden">
                            {listing.seller?.avatar ? (
                              <img
                                src={listing.seller.avatar}
                                alt={listing.seller.username}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-4 h-4 text-primary-300" />
                            )}
                          </div>
                          <div className="text-left">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-primary-200 hover:text-primary-100 transition-colors">
                                @{listing.seller.username}
                              </p>
                              {/* Seller Rating with Circles */}
                              <div className="flex items-center space-x-1">
                                {listing.seller?.rating ? (
                                  <>
                                    <div className="flex items-center space-x-0.5">
                                      {[1, 2, 3, 4, 5].map((circle) => (
                                        <div
                                          key={circle}
                                          className={`w-2 h-2 rounded-full ${
                                            circle <= Math.round(listing.seller.rating)
                                              ? 'bg-yellow-400'
                                              : 'bg-primary-600'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                    <span className="text-xs text-primary-300">
                                      ({listing.seller.reviewCount || 0} review{(listing.seller.reviewCount || 0) !== 1 ? 's' : ''})
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-xs text-primary-400">No reviews</span>
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-primary-400">
                              <p>Posted {formatTimeAgo(listing.createdAt)}</p>
                              {listing.lastEditedAt && (
                                <p className="text-yellow-400">
                                  Edited {formatTimeAgo(listing.lastEditedAt)}
                                </p>
                              )}
                            </div>
                          </div>
                        </motion.button>

                        {/* Views Only */}
                        <div className="flex items-center space-x-1 text-primary-400">
                          <Eye className="w-4 h-4" />
                          <span className="text-xs">{listing.views}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      {/* Listing Detail Modal */}
      <AnimatePresence>
        {selectedListing && (
          <ListingDetailView
            listing={selectedListing}
            vehicle={selectedListing.vehicle}
            seller={selectedListing.seller}
            onClose={() => setSelectedListing(null)}
            onContact={handleContactSeller}
            onTrade={handleTradeOffer}
          />
        )}
      </AnimatePresence>

      {/* Trade Offer Modal */}
      <AnimatePresence>
        {showTradeOffer && (
          <TradeOfferModal
            onClose={() => {
              setShowTradeOffer(false);
              setTradeOfferListing(null);
            }}
            selectedListing={tradeOfferListing}
          />
        )}
      </AnimatePresence>
    </div>
  );
} 