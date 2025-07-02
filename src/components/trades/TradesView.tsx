import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeftRight, 
  Car, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle, 
  MessageCircle,
  User,
  Eye,
  Calendar,
  Filter,
  Search,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { Trade, Listing, Vehicle, User as UserType } from '../../types/index.ts';
import { TradeDetailModal } from './TradeDetailModal.tsx';
import { TradeOfferModal } from './TradeOfferModal.tsx';

export function TradesView() {
  const { state, loadAllListings, reloadTrades, showSuccess, showError, showInfo } = useApp();
  const [activeTab, setActiveTab] = useState<'outbound' | 'inbound' | 'pending' | 'completed'>('outbound');
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showCounterOffer, setShowCounterOffer] = useState(false);
  const [counterOfferTrade, setCounterOfferTrade] = useState<Trade | null>(null);

  // Force reload trades when component mounts to trigger cleanup
  useEffect(() => {
    const loadTradesAndListings = async () => {
      console.log('🔄 TradesView mounted, reloading trades to trigger cleanup...');
      try {
      await reloadTrades();
        // Removed the info notification to prevent spam
        showInfo('Trades Updated', 'Refreshed your trade offers');
      // Also ensure we have listing data
      if (state.allListings.length === 0) {
        await loadAllListings();
        }
      } catch (error) {
        showError('Failed to Load Trades', 'Unable to refresh trade data');
      }
    };

    loadTradesAndListings();
  }, []); // Only run once on mount

  // Separate outbound, inbound, and completed trades
  const outboundTrades = useMemo(() => {
    const filtered = state.trades.filter(trade => {
      const offererId = typeof trade.offererUserId === 'string' 
        ? trade.offererUserId 
        : (trade.offererUserId as any)?._id || (trade.offererUserId as any)?.id;
      const receiverId = typeof trade.receiverUserId === 'string' 
        ? trade.receiverUserId 
        : (trade.receiverUserId as any)?._id || (trade.receiverUserId as any)?.id;
      
      // For countered trades, determine who made the most recent action
      if (trade.status === 'countered') {
        // Check the most recent history entry to see who made the counter
        const lastAction = trade.tradeHistory?.[trade.tradeHistory.length - 1];
        if (lastAction && lastAction.action === 'countered') {
          // The person who made the counter is the one with the "outbound" action
          return lastAction.userId === state.currentUser?.id;
        }
        
        // Fallback: if no history, check if user is offerer (original trade direction)
        return offererId === state.currentUser?.id;
      }
      
      // For all other trades, standard logic - user is offerer
      return offererId === state.currentUser?.id && 
             trade.status !== 'cancelled' && 
             trade.status !== 'accepted' && 
             trade.status !== 'pending_acceptance' && 
             trade.status !== 'completed' && 
             trade.status !== 'declined';
    });
    
    return filtered;
  }, [state.trades, state.currentUser?.id]);

  const inboundTrades = useMemo(() => {
    const filtered = state.trades.filter(trade => {
      const offererId = typeof trade.offererUserId === 'string' 
        ? trade.offererUserId 
        : (trade.offererUserId as any)?._id || (trade.offererUserId as any)?.id;
      const receiverId = typeof trade.receiverUserId === 'string' 
        ? trade.receiverUserId 
        : (trade.receiverUserId as any)?._id || (trade.receiverUserId as any)?.id;
      
      // For countered trades, determine who made the most recent action
      if (trade.status === 'countered') {
        // Check the most recent history entry to see who made the counter
        const lastAction = trade.tradeHistory?.[trade.tradeHistory.length - 1];
        if (lastAction && lastAction.action === 'countered') {
          // The person who made the counter has it as outbound, so the other person has it as inbound
          return lastAction.userId !== state.currentUser?.id;
        }
        
        // Fallback: if no history, check if user is receiver (original trade direction)
        return receiverId === state.currentUser?.id;
      }
      
      // For all other trades, standard logic - user is receiver
      return receiverId === state.currentUser?.id && 
             trade.status !== 'cancelled' && 
             trade.status !== 'accepted' && 
             trade.status !== 'pending_acceptance' && 
             trade.status !== 'completed' && 
             trade.status !== 'declined';
    });
    
    return filtered;
  }, [state.trades, state.currentUser?.id]);

  const completedTrades = useMemo(() => {
    const filtered = state.trades.filter(trade => {
      const offererId = typeof trade.offererUserId === 'string' 
        ? trade.offererUserId 
        : (trade.offererUserId as any)?._id || (trade.offererUserId as any)?.id;
      const receiverId = typeof trade.receiverUserId === 'string' 
        ? trade.receiverUserId 
        : (trade.receiverUserId as any)?._id || (trade.receiverUserId as any)?.id;
      
      return (offererId === state.currentUser?.id || receiverId === state.currentUser?.id) && 
             (trade.status === 'completed' || trade.status === 'declined');
    });
    
    return filtered;
  }, [state.trades, state.currentUser?.id]);

  const pendingTrades = useMemo(() => {
    const filtered = state.trades.filter(trade => {
      const offererId = typeof trade.offererUserId === 'string' 
        ? trade.offererUserId 
        : (trade.offererUserId as any)?._id || (trade.offererUserId as any)?.id;
      const receiverId = typeof trade.receiverUserId === 'string' 
        ? trade.receiverUserId 
        : (trade.receiverUserId as any)?._id || (trade.receiverUserId as any)?.id;
      
      const isInvolved = offererId === state.currentUser?.id || receiverId === state.currentUser?.id;
      
      // Include both new pending_acceptance trades and legacy accepted trades
      return isInvolved && (trade.status === 'pending_acceptance' || trade.status === 'accepted');
    });
    
    return filtered;
  }, [state.trades, state.currentUser?.id]);

  const currentTrades = activeTab === 'outbound' ? outboundTrades : 
                       activeTab === 'inbound' ? inboundTrades : 
                       activeTab === 'pending' ? pendingTrades : 
                       completedTrades;

  // Filter trades based on search and status
  const filteredTrades = useMemo(() => {
    return currentTrades.filter(trade => {
      // Handle populated listing objects
      const listingId = typeof trade.listingId === 'string' 
        ? trade.listingId 
        : (trade.listingId as any)?._id || (trade.listingId as any)?.id;
      
      const listing = state.allListings.find(l => l.id === listingId);
      
      // Handle populated user objects
      let otherUser: UserType | undefined;
      if (activeTab === 'outbound') {
        // For outbound trades, we want the receiver
        if (typeof trade.receiverUserId === 'object' && (trade.receiverUserId as any).username) {
          otherUser = trade.receiverUserId as any;
        } else {
          const receiverId = typeof trade.receiverUserId === 'string' ? trade.receiverUserId : (trade.receiverUserId as any)?._id || (trade.receiverUserId as any)?.id;
          otherUser = state.users.find(u => u.id === receiverId) || {
            id: receiverId,
            username: 'Unknown User',
            email: '',
            password: '',
            createdAt: '',
            location: ''
          };
        }
      } else if (activeTab === 'inbound') {
        // For inbound trades, we want the offerer
        if (typeof trade.offererUserId === 'object' && (trade.offererUserId as any).username) {
          otherUser = trade.offererUserId as any;
        } else {
          const offererId = typeof trade.offererUserId === 'string' ? trade.offererUserId : (trade.offererUserId as any)?._id || (trade.offererUserId as any)?.id;
          otherUser = state.users.find(u => u.id === offererId) || {
            id: offererId,
            username: 'Unknown User',
            email: '',
            password: '',
            createdAt: '',
            location: ''
          };
        }
      }
      
      const matchesSearch = !searchTerm || 
        listing?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        otherUser?.username.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || trade.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [currentTrades, searchTerm, statusFilter, state.allListings, state.users, activeTab]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400';
      case 'accepted': return 'text-green-400';
      case 'pending_acceptance': return 'text-blue-400';
      case 'rejected': return 'text-red-400';
      case 'completed': return 'text-green-500';
      case 'declined': return 'text-red-500';
      case 'cancelled': return 'text-gray-400';
      case 'countered': return 'text-purple-400';
      default: return 'text-primary-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'accepted': return <CheckCircle className="w-4 h-4" />;
      case 'pending_acceptance': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'declined': return <XCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      case 'countered': return <ArrowLeftRight className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

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

  const handleTradeClick = (trade: Trade) => {
    setSelectedTrade(trade);
  };

  const handleCounterOffer = (trade: Trade) => {
    setCounterOfferTrade(trade);
    setShowCounterOffer(true);
    setSelectedTrade(null);
  };

  const renderTradeCard = (trade: Trade, isOutbound: boolean) => {
    // Handle both populated listing objects and string IDs
    let listing;
    if (typeof trade.listingId === 'object' && trade.listingId) {
      // listingId is already a populated listing object
      listing = trade.listingId;
    } else {
      // listingId is a string, find it in allListings
      const listingId = typeof trade.listingId === 'string' 
        ? trade.listingId 
        : (trade.listingId as any)?._id || (trade.listingId as any)?.id;
      listing = state.allListings.find(l => l.id === listingId);
    }
    
    if (!listing) {
      console.log('🔍 Listing not found for trade:', trade.id, 'listingId:', trade.listingId);
      return (
        <div key={trade.id} className="glass-effect rounded-xl p-4 border border-red-500/30">
          <p className="text-red-400">Listing not found</p>
          <p className="text-xs text-red-300">Trade ID: {trade.id}</p>
          <p className="text-xs text-red-300">Listing ID: {JSON.stringify(trade.listingId)}</p>
        </div>
      );
    }

    // Extract user info properly (handle both populated objects and IDs)
    let otherUser: UserType | undefined;
    if (isOutbound) {
      // For outbound trades, we want the receiver
      if (typeof trade.receiverUserId === 'object' && (trade.receiverUserId as any).username) {
        otherUser = trade.receiverUserId as any;
      } else {
        const receiverId = typeof trade.receiverUserId === 'string' ? trade.receiverUserId : (trade.receiverUserId as any)?._id || (trade.receiverUserId as any)?.id;
        otherUser = state.users.find(u => u.id === receiverId) || {
          id: receiverId,
          username: 'Unknown User',
          email: '',
          password: '',
          createdAt: '',
          location: ''
        };
      }
    } else {
      // For inbound trades, we want the offerer
      if (typeof trade.offererUserId === 'object' && (trade.offererUserId as any).username) {
        otherUser = trade.offererUserId as any;
      } else {
        const offererId = typeof trade.offererUserId === 'string' ? trade.offererUserId : (trade.offererUserId as any)?._id || (trade.offererUserId as any)?.id;
        otherUser = state.users.find(u => u.id === offererId) || {
          id: offererId,
          username: 'Unknown User',
          email: '',
          password: '',
          createdAt: '',
          location: ''
        };
      }
    }

    // Get vehicles involved in the trade
    // Use preserved vehicle objects from AppContext transformation, fallback to state.vehicles
    const getVehicleFromId = (vehicleId: string): Vehicle | null => {
      return state.vehicles.find(v => v.id === vehicleId) || null;
    };

    // For offerer vehicles, use preserved objects if available, otherwise lookup by ID
    const offererVehicles = (trade as any).offererVehicleObjects || 
      trade.offererVehicleIds.map(getVehicleFromId).filter(Boolean);

    // For receiver vehicles, use preserved objects if available, otherwise lookup by ID  
    const receiverVehicles = (trade as any).receiverVehicleObjects || 
      (trade.receiverVehicleIds || []).map(getVehicleFromId).filter(Boolean);

    // Get vehicles to display and calculate values based on trade status and direction
    let displayVehicles, displayCashAmount, displayTotalValue, vehicleCount;
    
    if (trade.status === 'countered') {
      // For countered trades, show the most recent counter offer
      // Check who made the most recent counter from trade history
      const lastAction = trade.tradeHistory?.[trade.tradeHistory.length - 1];
      const lastCounterUserId = lastAction?.userId;
      
      // If the original offerer made the most recent counter, show their updated offer
      const originalOffererId = typeof trade.offererUserId === 'string' 
        ? trade.offererUserId 
        : (trade.offererUserId as any)?._id || (trade.offererUserId as any)?.id;
      
      if (lastCounterUserId === originalOffererId) {
        // Original offerer made the counter-counter, show their updated terms
        displayVehicles = offererVehicles;
        displayCashAmount = trade.offererCashAmount;
        displayTotalValue = displayCashAmount + offererVehicles.reduce((sum, v) => sum + (v?.customPrice || v?.estimatedValue || 0), 0);
        vehicleCount = trade.offererVehicleIds.length;
      } else {
        // Original receiver made the counter, show their counter terms
        displayVehicles = receiverVehicles;
        displayCashAmount = trade.receiverCashAmount || 0;
        displayTotalValue = displayCashAmount + receiverVehicles.reduce((sum, v) => sum + (v?.customPrice || v?.estimatedValue || 0), 0);
        vehicleCount = (trade.receiverVehicleIds || []).length;
      }
    } else if (['accepted', 'pending_acceptance', 'completed'].includes(trade.status)) {
      // For pending/accepted/completed trades, show the final agreed-upon terms
      // Check if there was a counter offer by looking at trade history
      const counterActions = trade.tradeHistory?.filter(h => h.action === 'countered') || [];
      
      if (counterActions.length > 0) {
        // This trade was countered before being accepted, show the final counter terms
        const lastCounter = counterActions[counterActions.length - 1];
        const lastCounterUserId = lastCounter.userId;
        
        const originalOffererId = typeof trade.offererUserId === 'string' 
          ? trade.offererUserId 
          : (trade.offererUserId as any)?._id || (trade.offererUserId as any)?.id;
        
        if (lastCounterUserId === originalOffererId) {
          // Final counter was by original offerer, show their updated terms
          displayVehicles = offererVehicles;
          displayCashAmount = trade.offererCashAmount;
          displayTotalValue = displayCashAmount + offererVehicles.reduce((sum, v) => sum + (v?.customPrice || v?.estimatedValue || 0), 0);
          vehicleCount = trade.offererVehicleIds.length;
        } else {
          // Final counter was by original receiver, show their counter terms
          displayVehicles = receiverVehicles;
          displayCashAmount = trade.receiverCashAmount || 0;
          displayTotalValue = displayCashAmount + receiverVehicles.reduce((sum, v) => sum + (v?.customPrice || v?.estimatedValue || 0), 0);
          vehicleCount = (trade.receiverVehicleIds || []).length;
        }
      } else {
        // No counters, show original offer terms
        displayVehicles = offererVehicles;
        displayCashAmount = trade.offererCashAmount;
        displayTotalValue = displayCashAmount + offererVehicles.reduce((sum, v) => sum + (v?.customPrice || v?.estimatedValue || 0), 0);
        vehicleCount = trade.offererVehicleIds.length;
      }
    } else {
      // For all other trades (pending, rejected, cancelled), show the original offer (offerer's terms)
      displayVehicles = offererVehicles;
      displayCashAmount = trade.offererCashAmount;
      displayTotalValue = displayCashAmount + offererVehicles.reduce((sum, v) => sum + (v?.customPrice || v?.estimatedValue || 0), 0);
      vehicleCount = trade.offererVehicleIds.length;
    }

    return (
      <motion.div
        key={trade.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-effect rounded-xl p-6 hover:bg-primary-800/20 transition-all cursor-pointer"
        onClick={() => setSelectedTrade(trade)}
      >
        <div className="flex space-x-4">
          {/* Listing Image */}
          <div className="w-20 h-20 bg-primary-800/30 rounded-lg flex items-center justify-center flex-shrink-0">
            {(() => {
              // Get vehicle from populated listing or find it in state
              const populatedVehicle = (listing as any).vehicle;
              const vehicle = populatedVehicle || state.vehicles.find(v => v.id === listing.vehicleId);
              const vehicleImage = vehicle?.images?.[0];
              
              return vehicleImage ? (
                <img
                  src={vehicleImage}
                  alt={listing.title}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <Car className="w-8 h-8 text-primary-400" />
              );
            })()}
          </div>

          <div className="flex-1">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-primary-100">{listing.title}</h3>
              <div className={`flex items-center space-x-1 ${getStatusColor(trade.status)}`}>
                {getStatusIcon(trade.status)}
                              <span className="text-sm font-medium capitalize">
                {trade.status === 'pending_acceptance' ? 'Pending' : 
                 trade.status === 'countered' ? 'Countered' : trade.status}
              </span>
              </div>
            </div>

            {/* Trade Summary */}
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-primary-300">
                  {/* For countered trades, show clearer labels */}
                  {trade.status === 'countered' ? 
                    (isOutbound ? 'Your Counter:' : 'Their Counter:') :
                    (isOutbound ? 'Your Offer:' : 'Their Offer:')
                  }
                </span>
                <span className="text-green-400 font-medium">
                  ${displayTotalValue.toLocaleString()}
                </span>
              </div>

              {/* Show vehicles in the trade */}
              {vehicleCount > 0 && (
                <div className="text-sm text-primary-300">
                  <span>{vehicleCount} vehicle{vehicleCount !== 1 ? 's' : ''} included</span>
                  {displayVehicles.length > 0 && (
                    <div className="mt-1 text-xs">
                      {displayVehicles.slice(0, 2).map((vehicle, index) => (
                        <span key={vehicle?.id} className="text-primary-400">
                          {vehicle?.year} {vehicle?.make} {vehicle?.model}
                          {index < Math.min(displayVehicles.length, 2) - 1 && ', '}
                        </span>
                      ))}
                      {displayVehicles.length > 2 && (
                        <span className="text-primary-400"> +{displayVehicles.length - 2} more</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Other User Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-primary-800/50 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-primary-300" />
                </div>
                <span className="text-sm text-primary-300">
                  {isOutbound ? 'To:' : 'From:'} @{otherUser?.username || 'Unknown User'}
                </span>
              </div>
              <span className="text-xs text-primary-400">
                {formatTimeAgo(trade.updatedAt)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-primary-100">Trade Management</h1>
          <p className="text-primary-300 mt-1">Manage your vehicle trade offers</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-primary-800/30 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('outbound')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'outbound'
              ? 'bg-primary-100/20 text-primary-100'
              : 'text-primary-300 hover:text-primary-200'
          }`}
        >
          Outbound ({outboundTrades.length})
        </button>
        <button
          onClick={() => setActiveTab('inbound')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'inbound'
              ? 'bg-primary-100/20 text-primary-100'
              : 'text-primary-300 hover:text-primary-200'
          }`}
        >
          Inbound ({inboundTrades.length})
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'pending'
              ? 'bg-primary-100/20 text-primary-100'
              : 'text-primary-300 hover:text-primary-200'
          }`}
        >
          Pending ({pendingTrades.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'completed'
              ? 'bg-primary-100/20 text-primary-100'
              : 'text-primary-300 hover:text-primary-200'
          }`}
        >
          Completed ({completedTrades.length})
        </button>
      </div>

      {/* Search and Filters */}
      <div className="glass-effect rounded-xl p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-400" />
            <input
              type="text"
              placeholder="Search by listing title or username..."
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary-300 mb-2">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input-field"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="countered">Countered</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Trades List */}
      <div className="space-y-4">
        {filteredTrades.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 bg-primary-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <ArrowLeftRight className="w-12 h-12 text-primary-400" />
            </div>
            <h3 className="text-xl font-semibold text-primary-200 mb-2">
              No {activeTab} trades found
            </h3>
            <p className="text-primary-400 mb-6">
              {activeTab === 'outbound' 
                ? "You haven't made any trade offers yet. Go to Listings to make trade offers on vehicles you're interested in."
                : activeTab === 'inbound'
                  ? "You haven't received any trade offers yet"
                  : "No completed trades found"
              }
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filteredTrades.map((trade) => renderTradeCard(trade, activeTab === 'outbound'))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Trade Detail Modal */}
      <AnimatePresence>
        {selectedTrade && (
          <TradeDetailModal
            trade={selectedTrade}
            isOutbound={(() => {
              const offererId = typeof selectedTrade.offererUserId === 'string' 
                ? selectedTrade.offererUserId 
                : (selectedTrade.offererUserId as any)?._id || (selectedTrade.offererUserId as any)?.id;
              const receiverId = typeof selectedTrade.receiverUserId === 'string' 
                ? selectedTrade.receiverUserId 
                : (selectedTrade.receiverUserId as any)?._id || (selectedTrade.receiverUserId as any)?.id;
              
              // For countered trades, check who made the most recent counter from trade history
              if (selectedTrade.status === 'countered') {
                const lastAction = selectedTrade.tradeHistory?.[selectedTrade.tradeHistory.length - 1];
                if (lastAction && lastAction.action === 'countered') {
                  // The person who made the most recent counter has it as outbound
                  return lastAction.userId === state.currentUser?.id;
                }
                
                // Fallback: if no history, check if user is receiver (original trade direction)
                return receiverId === state.currentUser?.id;
              }
              
              // For all other trades, standard logic - outbound if current user is offerer
              return offererId === state.currentUser?.id;
            })()}
            onClose={() => setSelectedTrade(null)}
            onCounterOffer={handleCounterOffer}
          />
        )}
      </AnimatePresence>

      {/* Counter Offer Modal */}
      <AnimatePresence>
        {showCounterOffer && counterOfferTrade && (
          <TradeOfferModal
            onClose={() => {
              setShowCounterOffer(false);
              setCounterOfferTrade(null);
            }}
            existingTrade={counterOfferTrade}
          />
        )}
      </AnimatePresence>
    </div>
  );
}