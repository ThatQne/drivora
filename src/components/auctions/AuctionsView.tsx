import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Gavel, Clock, Eye, TrendingUp, DollarSign, Car, Calendar, MapPin } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { Auction, Vehicle, Bid } from '../../types/index.ts';

export function AuctionsView() {
  const { state } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('ending-soon');
  const [showFilters, setShowFilters] = useState(false);

  // Mock auctions data - in real app this would come from API
  const [auctions] = useState<Array<Auction & { vehicle: Vehicle; seller: { username: string; location: string } }>>([
    {
      id: '1',
      vehicleId: '1',
      sellerId: '1',
      title: '2019 BMW M3 - Track Ready Beast',
      description: 'High-performance sedan with track modifications. Well-maintained with service records.',
      startingBid: 35000,
      buyNowPrice: 52000,
      currentBid: 42500,
      highestBidderId: 'bidder1',
      bids: [
        { id: '1', auctionId: '1', bidderId: 'bidder1', amount: 42500, timestamp: new Date().toISOString() },
        { id: '2', auctionId: '1', bidderId: 'bidder2', amount: 41000, timestamp: new Date(Date.now() - 3600000).toISOString() }
      ],
      startTime: new Date(Date.now() - 86400000 * 2).toISOString(),
      endTime: new Date(Date.now() + 86400000 * 1).toISOString(), // Ends in 1 day
      isActive: true,
      views: 156,
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date().toISOString(),
      vehicle: {
        id: '1',
        ownerId: '1',
        make: 'BMW',
        model: 'M3',
        year: 2019,
        mileage: 28000,
        transmission: 'manual',
        estimatedValue: 48000,
        images: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      seller: {
        username: 'track_enthusiast',
        location: 'Phoenix, AZ'
      }
    },
    {
      id: '2',
      vehicleId: '2',
      sellerId: '2',
      title: '1995 Toyota Supra Turbo - JDM Legend',
      description: 'Iconic sports car in excellent condition. Original paint, well-maintained engine.',
      startingBid: 60000,
      currentBid: 78500,
      highestBidderId: 'collector1',
      bids: [
        { id: '3', auctionId: '2', bidderId: 'collector1', amount: 78500, timestamp: new Date(Date.now() - 1800000).toISOString() },
        { id: '4', auctionId: '2', bidderId: 'jdm_fan', amount: 75000, timestamp: new Date(Date.now() - 7200000).toISOString() }
      ],
      startTime: new Date(Date.now() - 86400000 * 5).toISOString(),
      endTime: new Date(Date.now() + 86400000 * 2).toISOString(), // Ends in 2 days
      isActive: true,
      views: 423,
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 1800000).toISOString(),
      vehicle: {
        id: '2',
        ownerId: '2',
        make: 'Toyota',
        model: 'Supra',
        year: 1995,
        mileage: 45000,
        transmission: 'manual',
        estimatedValue: 85000,
        images: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      seller: {
        username: 'classic_collector',
        location: 'Miami, FL'
      }
    },
    {
      id: '3',
      vehicleId: '3',
      sellerId: '3',
      title: '2021 Ford Mustang GT - Modern Muscle',
      description: 'Low mileage performance car with premium package. Garage kept.',
      startingBid: 28000,
      buyNowPrice: 38000,
      currentBid: 32000,
      highestBidderId: 'muscle_fan',
      bids: [
        { id: '5', auctionId: '3', bidderId: 'muscle_fan', amount: 32000, timestamp: new Date(Date.now() - 900000).toISOString() }
      ],
      startTime: new Date(Date.now() - 86400000 * 1).toISOString(),
      endTime: new Date(Date.now() + 86400000 * 6).toISOString(), // Ends in 6 days
      isActive: true,
      views: 89,
      createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
      updatedAt: new Date(Date.now() - 900000).toISOString(),
      vehicle: {
        id: '3',
        ownerId: '3',
        make: 'Ford',
        model: 'Mustang',
        year: 2021,
        mileage: 12000,
        transmission: 'automatic',
        estimatedValue: 35000,
        images: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      seller: {
        username: 'garage_keeper',
        location: 'Dallas, TX'
      }
    }
  ]);

  // Calculate time remaining for each auction
  const getTimeRemaining = (endTime: string) => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const timeLeft = end - now;

    if (timeLeft <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };

    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, expired: false };
  };

  const filteredAuctions = auctions.filter(auction => {
    const matchesSearch = auction.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         auction.vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         auction.vehicle.model.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || 
                           (selectedCategory === 'ending-soon' && getTimeRemaining(auction.endTime).days < 1) ||
                           (selectedCategory === 'buy-now' && auction.buyNowPrice) ||
                           (selectedCategory === 'no-reserve' && !auction.buyNowPrice);
    
    return matchesSearch && matchesCategory && auction.isActive;
  });

  const sortedAuctions = [...filteredAuctions].sort((a, b) => {
    switch (sortBy) {
      case 'ending-soon':
        return new Date(a.endTime).getTime() - new Date(b.endTime).getTime();
      case 'highest-bid':
        return b.currentBid - a.currentBid;
      case 'most-viewed':
        return b.views - a.views;
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default:
        return new Date(a.endTime).getTime() - new Date(b.endTime).getTime();
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary-100">Vehicle Auctions</h1>
          <p className="text-primary-300 mt-1">
            Bid on vehicles or buy instantly
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary-100">{filteredAuctions.length}</p>
          <p className="text-sm text-primary-300">active auctions</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="glass-effect rounded-xl p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-400" />
            <input
              type="text"
              placeholder="Search auctions..."
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-primary-300 mb-2">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="input-field"
                >
                  <option value="all">All Auctions</option>
                  <option value="ending-soon">Ending Soon</option>
                  <option value="buy-now">Buy It Now</option>
                  <option value="no-reserve">No Reserve</option>
                </select>
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
                  <option value="ending-soon">Ending Soon</option>
                  <option value="highest-bid">Highest Bid</option>
                  <option value="most-viewed">Most Viewed</option>
                  <option value="newest">Newest</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Auctions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredAuctions.map((auction, index) => {
          const timeRemaining = getTimeRemaining(auction.endTime);
          const isEndingSoon = timeRemaining.days === 0 && timeRemaining.hours < 12;
          
          return (
            <motion.div
              key={auction.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-effect rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group"
            >
              {/* Image Placeholder */}
              <div className="h-48 bg-gradient-to-br from-primary-700 to-primary-800 flex items-center justify-center relative overflow-hidden">
                <Car className="w-16 h-16 text-primary-400" />
                <div className="absolute top-3 left-3 flex space-x-2">
                  <div className="flex items-center space-x-1 bg-black/50 rounded-full px-2 py-1">
                    <Eye className="w-3 h-3 text-white" />
                    <span className="text-xs text-white">{auction.views}</span>
                  </div>
                  {auction.buyNowPrice && (
                    <div className="bg-green-500/80 rounded-full px-2 py-1">
                      <span className="text-xs text-white font-medium">Buy Now</span>
                    </div>
                  )}
                </div>
                <div className="absolute top-3 right-3">
                  <div className={`flex items-center space-x-1 rounded-full px-2 py-1 ${
                    isEndingSoon ? 'bg-red-500/80' : 'bg-blue-500/80'
                  }`}>
                    <Clock className="w-3 h-3 text-white" />
                    <span className="text-xs text-white font-medium">
                      {timeRemaining.days > 0 ? `${timeRemaining.days}d` : 
                       timeRemaining.hours > 0 ? `${timeRemaining.hours}h` : 
                       `${timeRemaining.minutes}m`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-lg text-primary-100 group-hover:text-primary-50 transition-colors">
                    {auction.vehicle.year} {auction.vehicle.make} {auction.vehicle.model}
                  </h3>
                  <Gavel className="w-5 h-5 text-primary-400" />
                </div>

                <p className="text-primary-300 text-sm mb-4 line-clamp-2">
                  {auction.description}
                </p>

                {/* Time Remaining */}
                <div className="mb-4 p-3 bg-primary-800/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-primary-200">Time Remaining</span>
                    <span className={`text-sm font-medium ${isEndingSoon ? 'text-red-400' : 'text-primary-200'}`}>
                      {timeRemaining.expired ? 'Ended' : 
                       `${timeRemaining.days}d ${timeRemaining.hours}h ${timeRemaining.minutes}m`}
                    </span>
                  </div>
                  <div className="w-full bg-primary-700/50 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isEndingSoon ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                      style={{ 
                        width: `${Math.max(10, 100 - ((new Date().getTime() - new Date(auction.startTime).getTime()) / 
                        (new Date(auction.endTime).getTime() - new Date(auction.startTime).getTime()) * 100))}%` 
                      }}
                    />
                  </div>
                </div>

                {/* Vehicle Info */}
                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div className="flex items-center space-x-2 text-primary-300">
                    <Calendar className="w-4 h-4" />
                    <span>{auction.vehicle.year}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-primary-300">
                    <Car className="w-4 h-4" />
                    <span>{auction.vehicle.mileage.toLocaleString()} mi</span>
                  </div>
                </div>

                {/* Bidding Info */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-primary-300">Current Bid</span>
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="w-4 h-4 text-green-400" />
                      <span className="text-lg font-bold text-green-400">
                        ${auction.currentBid.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  
                  {auction.buyNowPrice && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-primary-300">Buy It Now</span>
                      <span className="text-lg font-bold text-blue-400">
                        ${auction.buyNowPrice.toLocaleString()}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-primary-400">Bids: {auction.bids.length}</span>
                    <span className="text-primary-400">Starting: ${auction.startingBid.toLocaleString()}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 mb-4">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    className="w-full btn-primary flex items-center justify-center space-x-2"
                  >
                    <Gavel className="w-4 h-4" />
                    <span>Place Bid</span>
                  </motion.button>
                  
                  {auction.buyNowPrice && (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      className="w-full btn-secondary flex items-center justify-center space-x-2"
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>Buy Now</span>
                    </motion.button>
                  )}
                </div>

                {/* Seller Info */}
                <div className="flex items-center justify-between pt-3 border-t border-primary-700/30">
                  <div>
                    <p className="text-sm font-medium text-primary-200">{auction.seller.username}</p>
                    <div className="flex items-center space-x-1 text-xs text-primary-400">
                      <MapPin className="w-3 h-3" />
                      <span>{auction.seller.location}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-primary-400">Ends</p>
                    <p className="text-sm font-medium text-primary-200">
                      {new Date(auction.endTime).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredAuctions.length === 0 && (
        <div className="text-center py-16">
          <Gavel className="w-16 h-16 text-primary-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-primary-200 mb-2">No auctions found</h3>
          <p className="text-primary-400">
            Check back later for new auctions
          </p>
        </div>
      )}
    </div>
  );
} 
 
 