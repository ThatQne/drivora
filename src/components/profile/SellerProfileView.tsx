import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Star, 
  MapPin, 
  Calendar, 
  Phone, 
  Mail, 
  User, 
  Car, 
  Eye,
  DollarSign,
  Gavel,
  List,
  Award,
  TrendingUp,
  MessageCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { Listing, Auction, Review, Sale, Vehicle, User as UserType } from '../../types/index.ts';

interface SellerProfileViewProps {
  sellerId: string;
  onBack: () => void;
  onListingClick?: (listing: Listing) => void;
}

export function SellerProfileView({ sellerId, onBack, onListingClick }: SellerProfileViewProps) {
  const { state, getUserProfile } = useApp();
  const [activeTab, setActiveTab] = useState<'listings' | 'auctions' | 'reviews' | 'sales'>('listings');
  const [loading, setLoading] = useState(true);
  
  // Debug seller lookup
  console.log('SellerProfileView - sellerId:', sellerId);
  console.log('SellerProfileView - available users:', state.users.map(u => ({ id: u.id, username: u.username })));
  console.log('SellerProfileView - current user:', state.currentUser ? { id: state.currentUser.id, username: state.currentUser.username } : null);
  
  // Try multiple ways to find the seller
  let seller = getUserProfile(sellerId);
  
  // If not found, try to find in allListings populated seller data
  if (!seller) {
    console.log('Seller not found in users, checking listings...');
    const listingWithSeller = state.allListings.find(listing => {
      const listingSellerId = typeof listing.sellerId === 'object' ? 
        (listing.sellerId as any).id || (listing.sellerId as any)._id :
        listing.sellerId;
      return listingSellerId === sellerId;
    });
    
    if (listingWithSeller && (listingWithSeller as any).seller) {
      seller = (listingWithSeller as any).seller;
      console.log('Found seller in listing data:', seller);
    }
  }
  
  // If still not found and sellerId matches current user, use current user
  if (!seller && state.currentUser && state.currentUser.id === sellerId) {
    seller = state.currentUser;
    console.log('Using current user as seller');
  }

  // Get seller's data
  const sellerListings = useMemo(() => {
    return state.allListings.filter(listing => {
      const listingSellerId = typeof listing.sellerId === 'object' ? 
        (listing.sellerId as any).id || (listing.sellerId as any)._id :
        listing.sellerId;
      return listingSellerId === sellerId && listing.isActive;
    });
  }, [state.allListings, sellerId]);

  const sellerAuctions = useMemo(() => {
    return state.auctions.filter(auction => {
      const auctionSellerId = typeof auction.sellerId === 'object' ? 
        (auction.sellerId as any).id || (auction.sellerId as any)._id :
        auction.sellerId;
      return auctionSellerId === sellerId && auction.isActive;
    });
  }, [state.auctions, sellerId]);

  const sellerReviews = useMemo(() => {
    return state.reviews.filter(review => {
      const revieweeId = typeof review.revieweeId === 'object' ? 
        (review.revieweeId as any).id || (review.revieweeId as any)._id :
        review.revieweeId;
      return revieweeId === sellerId;
    });
  }, [state.reviews, sellerId]);

  // Mock sales data - in real app this would come from API
  const sellerSales = useMemo((): Sale[] => {
    // For now, we'll create mock completed sales based on inactive listings
    const completedListings = state.allListings.filter(listing => {
      const listingSellerId = typeof listing.sellerId === 'object' ? 
        (listing.sellerId as any).id || (listing.sellerId as any)._id :
        listing.sellerId;
      return listingSellerId === sellerId && 
        !listing.isActive && 
        listing.soldAt && 
        listing.soldTo;
    });

    return completedListings.map(listing => ({
      id: `sale_${listing.id}`,
      sellerId: listing.sellerId,
      buyerId: listing.soldTo!,
      vehicleId: listing.vehicleId,
      listingId: listing.id,
      type: 'listing' as const,
      finalPrice: listing.soldPrice || listing.price,
      completedAt: listing.soldAt!,
      vehicle: state.vehicles.find(v => v.id === listing.vehicleId)
    }));
  }, [state.allListings, state.vehicles, sellerId]);

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (!seller) {
    return (
      <div className="space-y-6">
        <button
          onClick={onBack}
          className="btn-secondary flex items-center space-x-2"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Listings</span>
        </button>
        
        <div className="glass-effect rounded-xl p-8 text-center">
          <User className="w-16 h-16 mx-auto mb-4 text-primary-400" />
          <h2 className="text-xl font-bold text-primary-100 mb-2">Seller Not Found</h2>
          <p className="text-primary-300">The seller profile could not be loaded.</p>
        </div>
      </div>
    );
  }

  const formatTimeAgo = (dateString: string) => {
    try {
      const now = new Date();
      const date = new Date(dateString);
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
      return 'Unknown';
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'text-yellow-400 fill-current'
                : 'text-primary-600'
            }`}
          />
        ))}
      </div>
    );
  };

  const renderListings = () => (
    <div className="space-y-4">
      {sellerListings.length === 0 ? (
        <div className="text-center py-8">
          <Car className="w-12 h-12 mx-auto mb-4 text-primary-400" />
          <p className="text-primary-300">No active listings</p>
        </div>
      ) : (
        sellerListings.map((listing) => {
          const vehicle = state.vehicles.find(v => v.id === listing.vehicleId) ||
                         (listing as any).vehicle;
          return (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              className="glass-effect rounded-xl p-4 hover:bg-primary-800/20 transition-all duration-200 cursor-pointer group"
              onClick={() => {
                if (onListingClick) {
                  // Ensure the listing has populated vehicle and seller data
                  const enrichedListing = {
                    ...listing,
                    vehicle: vehicle || (listing as any).vehicle,
                    seller: seller
                  };
                  onListingClick(enrichedListing);
                }
              }}
            >
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-primary-800/30 rounded-lg flex items-center justify-center relative overflow-hidden">
                  {vehicle?.images?.[0] ? (
                    <img
                      src={vehicle.images[0]}
                      alt={listing.title}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Car className="w-8 h-8 text-primary-400" />
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <span className="text-white text-xs font-medium">View</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-primary-100 group-hover:text-blue-300 transition-colors">
                    {listing.title}
                  </h4>
                  <p className="text-sm text-primary-300">
                    {vehicle && `${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                  </p>
                  <div className="flex items-center space-x-4 mt-1">
                    <span className="text-green-400 font-bold">
                      ${listing.price.toLocaleString()}
                    </span>
                    <div className="flex items-center space-x-1 text-primary-400">
                      <Eye className="w-4 h-4" />
                      <span className="text-xs">{listing.views}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-primary-400">
                    Listed {formatTimeAgo(listing.createdAt)}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })
      )}
    </div>
  );

  const renderAuctions = () => (
    <div className="space-y-4">
      {sellerAuctions.length === 0 ? (
        <div className="text-center py-8">
          <Gavel className="w-12 h-12 mx-auto mb-4 text-primary-400" />
          <p className="text-primary-300">No active auctions</p>
        </div>
      ) : (
        sellerAuctions.map((auction) => {
          const vehicle = state.vehicles.find(v => v.id === auction.vehicleId);
          const timeLeft = new Date(auction.endTime).getTime() - new Date().getTime();
          const isEnded = timeLeft <= 0;
          
          return (
            <motion.div
              key={auction.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-effect rounded-xl p-4 hover:bg-primary-800/10 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-primary-800/30 rounded-lg flex items-center justify-center">
                  <Gavel className="w-8 h-8 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-primary-100">{auction.title}</h4>
                  <p className="text-sm text-primary-300">
                    {vehicle && `${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                  </p>
                  <div className="flex items-center space-x-4 mt-1">
                    <span className="text-purple-400 font-bold">
                      Current: ${auction.currentBid.toLocaleString()}
                    </span>
                    <span className="text-xs text-primary-400">
                      {auction.bids.length} bid{auction.bids.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xs ${isEnded ? 'text-red-400' : 'text-green-400'}`}>
                    {isEnded ? 'Ended' : 'Active'}
                  </p>
                  <p className="text-xs text-primary-400">
                    {formatTimeAgo(auction.createdAt)}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })
      )}
    </div>
  );

  const renderReviews = () => (
    <div className="space-y-4">
      {sellerReviews.length === 0 ? (
        <div className="text-center py-8">
          <MessageCircle className="w-12 h-12 mx-auto mb-4 text-primary-400" />
          <p className="text-primary-300">No reviews yet</p>
        </div>
      ) : (
        sellerReviews.map((review) => {
          const reviewer = state.users.find(u => u.id === review.reviewerId);
          return (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-effect rounded-xl p-4"
            >
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-primary-800/50 rounded-full flex items-center justify-center">
                  {reviewer?.avatar ? (
                    <img
                      src={reviewer.avatar}
                      alt={reviewer.username}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <User className="w-5 h-5 text-primary-300" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="font-medium text-primary-200">
                      {reviewer?.username || 'Unknown User'}
                    </span>
                    {renderStars(review.rating)}
                    <span className="text-xs text-primary-400">
                      {formatTimeAgo(review.createdAt)}
                    </span>
                  </div>
                  <p className="text-primary-300 text-sm leading-relaxed">
                    {review.comment}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })
      )}
    </div>
  );

  const renderSales = () => (
    <div className="space-y-4">
      {sellerSales.length === 0 ? (
        <div className="text-center py-8">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 text-primary-400" />
          <p className="text-primary-300">No completed sales</p>
        </div>
      ) : (
        sellerSales.map((sale) => {
          const buyer = state.users.find(u => u.id === sale.buyerId);
          return (
            <motion.div
              key={sale.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-effect rounded-xl p-4"
            >
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Award className="w-8 h-8 text-green-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-primary-100">
                    {sale.vehicle && `${sale.vehicle.year} ${sale.vehicle.make} ${sale.vehicle.model}`}
                  </h4>
                  <p className="text-sm text-primary-300">
                    Sold to {buyer?.username || 'Unknown Buyer'}
                  </p>
                  <div className="flex items-center space-x-4 mt-1">
                    <span className="text-green-400 font-bold">
                      ${sale.finalPrice.toLocaleString()}
                    </span>
                    <span className="text-xs text-primary-400 capitalize">
                      {sale.type} sale
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-primary-400">
                    Completed {formatTimeAgo(sale.completedAt)}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })
      )}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Back Button */}
      <button
        onClick={onBack}
        className="btn-secondary flex items-center space-x-2"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Listings</span>
      </button>

      {/* Profile Header */}
      <div className="glass-effect rounded-xl p-6">
        <div className="flex items-start space-x-6">
          {/* Avatar */}
          <div className="w-20 h-20 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
            {seller.avatar ? (
              <img src={seller.avatar} alt={seller.username} className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-white" />
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold text-primary-100">
                {seller.firstName && seller.lastName 
                  ? `${seller.firstName} ${seller.lastName}`
                  : `@${seller.username}`
                }
              </h1>
              {seller.rating && seller.rating > 0 ? (
                <div className="flex items-center space-x-1">
                  <Star className="w-5 h-5 text-yellow-400 fill-current" />
                  <span className="text-primary-100 font-medium">{seller.rating.toFixed(1)}</span>
                  <span className="text-primary-300">({seller.reviewCount || 0} reviews)</span>
                </div>
              ) : (
                <span className="text-primary-400 text-sm">No reviews yet</span>
              )}
            </div>

            <div className="space-y-2">
              {seller.location && (
                <div className="flex items-center space-x-2 text-primary-300">
                  <MapPin className="w-4 h-4" />
                  <span>{seller.location}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-2 text-primary-300">
                <Calendar className="w-4 h-4" />
                <span>Member since {new Date(seller.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 pt-6 border-t border-primary-700/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-100">{sellerListings.length}</div>
              <div className="text-sm text-primary-400">Active Listings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-100">{sellerAuctions.length}</div>
              <div className="text-sm text-primary-400">Active Auctions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-100">{sellerSales.length}</div>
              <div className="text-sm text-primary-400">Completed Sales</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-100">{sellerReviews.length}</div>
              <div className="text-sm text-primary-400">Reviews</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-effect rounded-xl p-2">
        <div className="flex space-x-1">
          {[
            { id: 'listings', label: 'Active Listings', icon: List, count: sellerListings.length },
            { id: 'auctions', label: 'Active Auctions', icon: Gavel, count: sellerAuctions.length },
            { id: 'reviews', label: 'Reviews', icon: MessageCircle, count: sellerReviews.length },
            { id: 'sales', label: 'Sales History', icon: TrendingUp, count: sellerSales.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-100/20 text-primary-100'
                  : 'text-primary-400 hover:text-primary-200 hover:bg-primary-800/20'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              {tab.count > 0 && (
                <span className="bg-primary-100/20 text-primary-100 text-xs px-2 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="glass-effect rounded-xl p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'listings' && renderListings()}
            {activeTab === 'auctions' && renderAuctions()}
            {activeTab === 'reviews' && renderReviews()}
            {activeTab === 'sales' && renderSales()}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
} 