import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Car, 
  DollarSign, 
  MessageCircle, 
  Check, 
  XCircle, 
  ArrowLeftRight,
  User,
  Calendar,
  AlertTriangle,
  Edit
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { Trade, TradeHistoryItem, Vehicle } from '../../types/index.ts';
import { MessageStarter } from '../messages/MessageStarter.tsx';

interface TradeDetailModalProps {
  trade: Trade;
  isOutbound: boolean;
  onClose: () => void;
  onCounterOffer?: (trade: Trade) => void;
}

export function TradeDetailModal({ trade, isOutbound, onClose, onCounterOffer }: TradeDetailModalProps) {
  const { state, updateTrade, sendMessage } = useApp();
  const [loading, setLoading] = useState(false);
  const [messageText, setMessageText] = useState('');

  const [showMessageStarter, setShowMessageStarter] = useState(false);

  const listing = state.allListings.find(l => l.id === trade.listingId);
  const targetVehicle = listing ? (listing as any).vehicle || state.vehicles.find(v => v.id === listing.vehicleId) : null;
  
  // Extract user IDs properly (handle both string IDs and populated objects)
  const otherUserId = isOutbound 
    ? (typeof trade.receiverUserId === 'string' ? trade.receiverUserId : (trade.receiverUserId as any)?._id || (trade.receiverUserId as any)?.id)
    : (typeof trade.offererUserId === 'string' ? trade.offererUserId : (trade.offererUserId as any)?._id || (trade.offererUserId as any)?.id);
  
  const otherUser = state.users.find(u => u.id === otherUserId);

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

  // Debug logging
  console.log('🚗 TradeDetailModal Debug:', {
    tradeId: trade.id,
    isOutbound,
    offererVehicleIds: trade.offererVehicleIds,
    receiverVehicleIds: trade.receiverVehicleIds,
    offererVehicles: offererVehicles.map(v => v?.id),
    receiverVehicles: receiverVehicles.map(v => v?.id),
    totalVehiclesInState: state.vehicles.length,
    currentUserId: state.currentUser?.id,
    offererUserId: typeof trade.offererUserId === 'string' ? trade.offererUserId : (trade.offererUserId as any)?._id || (trade.offererUserId as any)?.id,
    receiverUserId: typeof trade.receiverUserId === 'string' ? trade.receiverUserId : (trade.receiverUserId as any)?._id || (trade.receiverUserId as any)?.id
  });

  // Calculate total values
  const offererValue = trade.offererCashAmount + 
    offererVehicles.reduce((sum, v) => sum + (v?.customPrice || v?.estimatedValue || 0), 0);

  const receiverValue = (trade.receiverCashAmount || 0) + 
    receiverVehicles.reduce((sum, v) => sum + (v?.customPrice || v?.estimatedValue || 0), 0);

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

  const handleAcceptTrade = async () => {
    setLoading(true);
    try {
      // Simple status update - let the backend handle the logic
      const updatedTrade = {
        ...trade,
        status: 'accepted' as const,
        updatedAt: new Date().toISOString(),
      };
      
      await updateTrade(updatedTrade);
      onClose();
    } catch (error) {
      console.error('Error accepting trade:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectTrade = async () => {
    setLoading(true);
    try {
      const updatedTrade = {
        ...trade,
        status: 'rejected' as const,
        updatedAt: new Date().toISOString(),
        tradeHistory: [
          ...trade.tradeHistory,
          {
            id: `history_${Date.now()}`,
            action: 'rejected' as const,
            userId: state.currentUser!.id,
            timestamp: new Date().toISOString(),
            offererCashAmount: trade.offererCashAmount,
            offererVehicleIds: trade.offererVehicleIds,
            receiverCashAmount: trade.receiverCashAmount,
            receiverVehicleIds: trade.receiverVehicleIds
          }
        ]
      };
      await updateTrade(updatedTrade);
      onClose();
    } catch (error) {
      console.error('Error rejecting trade:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTrade = async () => {
    setLoading(true);
    try {
      const updatedTrade = {
        ...trade,
        status: 'cancelled' as const,
        updatedAt: new Date().toISOString(),
        tradeHistory: [
          ...trade.tradeHistory,
          {
            id: `history_${Date.now()}`,
            action: 'cancelled' as const,
            userId: state.currentUser!.id,
            timestamp: new Date().toISOString(),
            offererCashAmount: trade.offererCashAmount,
            offererVehicleIds: trade.offererVehicleIds,
            receiverCashAmount: trade.receiverCashAmount,
            receiverVehicleIds: trade.receiverVehicleIds
          }
        ]
      };
      await updateTrade(updatedTrade);
      onClose();
    } catch (error) {
      console.error('Error cancelling trade:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    setLoading(true);
    try {
      await sendMessage({
        senderId: state.currentUser!.id,
        receiverId: otherUserId,
        tradeId: trade.id,
        content: messageText
      });
      setMessageText('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTrade = async () => {
    setLoading(true);
    try {
      const updatedTrade = {
        ...trade,
        status: 'completed' as const,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tradeHistory: [
          ...trade.tradeHistory,
          {
            id: `history_${Date.now()}`,
            action: 'completed' as const,
            userId: state.currentUser!.id,
            timestamp: new Date().toISOString(),
            offererCashAmount: trade.offererCashAmount,
            offererVehicleIds: trade.offererVehicleIds,
            receiverCashAmount: trade.receiverCashAmount,
            receiverVehicleIds: trade.receiverVehicleIds
          }
        ]
      };
      await updateTrade(updatedTrade);
      onClose();
    } catch (error) {
      console.error('Error completing trade:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineTrade = async () => {
    setLoading(true);
    try {
      const updatedTrade = {
        ...trade,
        status: 'declined' as const,
        updatedAt: new Date().toISOString(),
        tradeHistory: [
          ...trade.tradeHistory,
          {
            id: `history_${Date.now()}`,
            action: 'declined' as const,
            userId: state.currentUser!.id,
            timestamp: new Date().toISOString(),
            offererCashAmount: trade.offererCashAmount,
            offererVehicleIds: trade.offererVehicleIds,
            receiverCashAmount: trade.receiverCashAmount,
            receiverVehicleIds: trade.receiverVehicleIds
          }
        ]
      };
      await updateTrade(updatedTrade);
      onClose();
    } catch (error) {
      console.error('Error declining trade:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCounterOffer = () => {
    if (onCounterOffer) {
      onCounterOffer(trade);
    }
    onClose();
  };

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
            <h1 className="text-2xl font-bold text-primary-100">Trade Details</h1>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`text-sm font-medium capitalize ${getStatusColor(trade.status)}`}>
                {trade.status === 'pending_acceptance' ? 'Pending Completion' : trade.status}
              </span>
              <span className="text-primary-400">•</span>
              <span className="text-sm text-primary-400">{formatTimeAgo(trade.updatedAt)}</span>
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
          {/* Left Column - Trade Details */}
          <div className="space-y-6">
            {/* Target Listing */}
            {listing && (
              <div>
                <h3 className="text-lg font-semibold text-primary-100 mb-4">Target Listing</h3>
                <div className="glass-effect rounded-xl p-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-primary-800/30 rounded-lg flex items-center justify-center">
                      {targetVehicle?.images?.[0] ? (
                        <img
                          src={targetVehicle.images[0]}
                          alt={listing.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Car className="w-8 h-8 text-primary-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-primary-100">{listing.title}</h4>
                      <p className="text-sm text-primary-300">
                        {targetVehicle && `${targetVehicle.year} ${targetVehicle.make} ${targetVehicle.model}`}
                      </p>
                      <p className="text-green-400 font-bold">
                        ${listing.price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Current Active Offer */}
            <div>
              <h3 className="text-lg font-semibold text-primary-100 mb-4">
                {trade.status === 'countered' 
                  ? (isOutbound ? 'Your Counter Offer' : 'Their Counter Offer')
                  : (isOutbound ? 'Your Offer' : 'Their Offer')
                }
              </h3>
              <div className={`glass-effect rounded-xl p-4 space-y-4 ${
                trade.status === 'countered' ? 'border border-purple-500/30' : ''
              }`}>
                {/* Determine which offer to show */}
                {(() => {
                  // For countered trades, show the most recent counter offer
                  // Check who made the most recent counter from trade history
                  let displayVehicles, displayCashAmount, displayTotalValue, displayMessage;
                  
                  if (trade.status === 'countered') {
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
                      displayTotalValue = offererValue;
                    } else {
                      // Original receiver made the counter, show their counter terms
                      displayVehicles = receiverVehicles;
                      displayCashAmount = trade.receiverCashAmount || 0;
                      displayTotalValue = receiverValue;
                    }
                    displayMessage = trade.counterMessage;
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
                        displayTotalValue = offererValue;
                      } else {
                        // Final counter was by original receiver, show their counter terms
                        displayVehicles = receiverVehicles;
                        displayCashAmount = trade.receiverCashAmount || 0;
                        displayTotalValue = receiverValue;
                      }
                      displayMessage = trade.counterMessage;
                    } else {
                      // No counters, show original offer terms
                      displayVehicles = offererVehicles;
                      displayCashAmount = trade.offererCashAmount;
                      displayTotalValue = offererValue;
                      displayMessage = trade.message;
                    }
                  } else {
                    // For all other trades (pending, rejected, cancelled), show the original offer (offerer's terms)
                    displayVehicles = offererVehicles;
                    displayCashAmount = trade.offererCashAmount;
                    displayTotalValue = offererValue;
                    displayMessage = trade.message;
                  }

                  return (
                    <>
                      {/* Vehicles */}
                      {displayVehicles.length > 0 && (
                        <div>
                          <h4 className="font-medium text-primary-200 mb-2">
                            Vehicles ({displayVehicles.length})
                          </h4>
                          <div className="space-y-2">
                            {displayVehicles.map((vehicle) => (
                              <div key={vehicle?.id} className={`flex items-center space-x-3 rounded-lg p-3 ${
                                trade.status === 'countered' ? 'bg-purple-500/10' : 'bg-primary-800/20'
                              }`}>
                                <div className="w-10 h-10 bg-primary-800/30 rounded-lg flex items-center justify-center">
                                  {vehicle?.images?.[0] ? (
                                    <img
                                      src={vehicle.images[0]}
                                      alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                                      className="w-full h-full object-cover rounded-lg"
                                    />
                                  ) : (
                                    <Car className="w-5 h-5 text-primary-400" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-primary-100">
                                    {vehicle?.year} {vehicle?.make} {vehicle?.model}
                                  </p>
                                  <p className="text-sm text-primary-300">
                                    {vehicle?.mileage.toLocaleString()} mi
                                  </p>
                                </div>
                                <p className={`font-medium ${
                                  trade.status === 'countered' ? 'text-purple-400' : 'text-green-400'
                                }`}>
                                  ${(vehicle?.customPrice || vehicle?.estimatedValue || 0).toLocaleString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Cash */}
                      {displayCashAmount !== 0 && (
                        <div className={`flex items-center justify-between rounded-lg p-3 ${
                          trade.status === 'countered' ? 'bg-purple-500/10' : 'bg-primary-800/20'
                        }`}>
                          <div className="flex items-center space-x-2">
                            <DollarSign className={`w-5 h-5 ${
                              trade.status === 'countered' ? 'text-purple-400' : 'text-green-400'
                            }`} />
                            <span className="text-primary-200">Cash</span>
                          </div>
                          <span className={`font-bold ${displayCashAmount >= 0 ? 
                            (trade.status === 'countered' ? 'text-purple-400' : 'text-green-400') : 
                            'text-red-400'
                          }`}>
                            {displayCashAmount >= 0 ? '+' : ''}${displayCashAmount.toLocaleString()}
                          </span>
                        </div>
                      )}

                      {/* Total */}
                      <div className="border-t border-primary-700/30 pt-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-primary-100">Total Value:</span>
                          <span className={`font-bold text-lg ${
                            trade.status === 'countered' ? 'text-purple-400' : 'text-green-400'
                          }`}>
                            ${displayTotalValue.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Message */}
                      {displayMessage && (
                        <div className="border-t border-primary-700/30 pt-3">
                          <p className="text-sm text-primary-300 mb-1">Message:</p>
                          <p className="text-primary-100 italic">"{displayMessage}"</p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>


          </div>

          {/* Right Column - Actions & Communication */}
          <div className="space-y-6">
            {/* Other User Info */}
            <div>
              <h3 className="text-lg font-semibold text-primary-100 mb-4">
                {isOutbound ? 'Receiver' : 'Offerer'}
              </h3>
              <div className="glass-effect rounded-xl p-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary-800/50 rounded-full flex items-center justify-center">
                    {otherUser?.avatar ? (
                      <img
                        src={otherUser.avatar}
                        alt={otherUser.username}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <User className="w-6 h-6 text-primary-300" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-primary-100">@{otherUser?.username || 'Unknown'}</h4>
                    <div className="flex items-center space-x-2 text-sm text-primary-300">
                      {otherUser?.rating ? (
                        <>
                          <span>{otherUser.rating.toFixed(1)} ⭐</span>
                          <span>({otherUser.reviewCount || 0} reviews)</span>
                        </>
                      ) : (
                        <span>No reviews yet</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            {(trade.status === 'pending' || trade.status === 'countered') && (
              <div>
                <h3 className="text-lg font-semibold text-primary-100 mb-4">Actions</h3>
                <div className="space-y-3">
                  {isOutbound ? (
                    // Outbound trade actions (you made the offer/counter)
                    <button
                      onClick={handleCancelTrade}
                      disabled={loading}
                      className="btn-secondary w-full flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-5 h-5" />
                      Cancel {trade.status === 'countered' ? 'Counter Offer' : 'Trade Offer'}
                    </button>
                  ) : (
                    // Inbound trade actions (you received the offer/counter)
                    <>
                      <button
                        onClick={handleAcceptTrade}
                        disabled={loading}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                      >
                        <Check className="w-5 h-5" />
                        Accept {trade.status === 'countered' ? 'Counter Offer' : 'Trade'}
                      </button>
                      <button
                        onClick={handleCounterOffer}
                        className="btn-secondary w-full flex items-center justify-center gap-2"
                      >
                        <ArrowLeftRight className="w-5 h-5" />
                        {trade.status === 'countered' ? 'Counter Back' : 'Counter Offer'}
                      </button>
                      <button
                        onClick={handleRejectTrade}
                        disabled={loading}
                        className="btn-secondary w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-300"
                      >
                        <XCircle className="w-5 h-5" />
                        Reject {trade.status === 'countered' ? 'Counter Offer' : 'Trade'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Completion Actions for Accepted/Pending Acceptance Trades */}
            {(trade.status === 'accepted' || trade.status === 'pending_acceptance') && (
              <div>
                <h3 className="text-lg font-semibold text-primary-100 mb-4">Trade Completion</h3>
                <div className="glass-effect rounded-xl p-4 space-y-4">
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                    <p className="text-sm text-blue-300">
                      <strong>Trade Accepted!</strong> Both parties have agreed to the terms. 
                      Coordinate with the other party to complete the physical exchange, 
                      then mark the trade as completed or declined.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <button
                      onClick={handleCompleteTrade}
                      disabled={loading}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      <Check className="w-5 h-5" />
                      Mark as Completed
                    </button>
                    <button
                      onClick={handleDeclineTrade}
                      disabled={loading}
                      className="btn-secondary w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-300"
                    >
                      <XCircle className="w-5 h-5" />
                      Mark as Declined
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Message */}
            {otherUser && (
              <div>
                <h3 className="text-lg font-semibold text-primary-100 mb-4">Communication</h3>
                <div className="glass-effect rounded-xl p-4">
                  <button
                    onClick={() => setShowMessageStarter(true)}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Message @{otherUser.username}
                  </button>
                  <p className="text-xs text-primary-400 mt-2 text-center">
                    Start a conversation about this trade
                  </p>
                </div>
              </div>
            )}

            {/* Trade History */}
            <div>
              <h3 className="text-lg font-semibold text-primary-100 mb-4">Trade History</h3>
              <div className="glass-effect rounded-xl p-4">
                <div className="space-y-3">
                  {trade.tradeHistory.map((item, index) => {
                    // Enhanced user lookup - check for both trade participants and all loaded users
                    let user = state.users.find(u => u.id === item.userId);
                    
                    // If not found in loaded users, try to identify from trade participants
                    if (!user) {
                      const offererUserId = typeof trade.offererUserId === 'string' 
                        ? trade.offererUserId 
                        : (trade.offererUserId as any)?._id || (trade.offererUserId as any)?.id;
                      const receiverUserId = typeof trade.receiverUserId === 'string' 
                        ? trade.receiverUserId 
                        : (trade.receiverUserId as any)?._id || (trade.receiverUserId as any)?.id;
                      
                      if (item.userId === offererUserId) {
                        // Try to get offerer user from populated object or state
                        user = typeof trade.offererUserId === 'object' && trade.offererUserId 
                          ? { ...trade.offererUserId as any, id: offererUserId }
                          : state.users.find(u => u.id === offererUserId);
                      } else if (item.userId === receiverUserId) {
                        // Try to get receiver user from populated object or state
                        user = typeof trade.receiverUserId === 'object' && trade.receiverUserId 
                          ? { ...trade.receiverUserId as any, id: receiverUserId }
                          : state.users.find(u => u.id === receiverUserId);
                      }
                    }
                    
                    // Final fallback - use current user if it's them
                    if (!user && item.userId === state.currentUser?.id) {
                      user = state.currentUser;
                    }

                    const displayName = user?.username || 'Unknown User';

                    return (
                      <div key={item.id || index} className="flex items-start space-x-3">
                        <div className="w-6 h-6 bg-primary-800/50 rounded-full flex items-center justify-center mt-1">
                          <Calendar className="w-3 h-3 text-primary-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-primary-200">
                            <span className="font-medium">@{displayName}</span>
                            <span className="text-primary-400 ml-1">
                              {item.action === 'created' && 'created the trade offer'}
                              {item.action === 'countered' && 'made a counter offer'}
                              {item.action === 'accepted' && 'accepted the trade'}
                              {item.action === 'rejected' && 'rejected the trade'}
                              {item.action === 'cancelled' && 'cancelled the trade'}
                              {item.action === 'completed' && 'completed the trade'}
                            </span>
                          </p>
                          <p className="text-xs text-primary-400">
                            {formatTimeAgo(item.timestamp)}
                          </p>
                          {item.message && (
                            <p className="text-sm text-primary-300 mt-1 italic">
                              "{item.message}"
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Message Starter Modal */}
      <AnimatePresence>
        {showMessageStarter && otherUser && (
          <MessageStarter
            targetUser={otherUser}
            tradeId={trade.id}
            initialMessage={`Hi! I wanted to discuss our trade for the ${targetVehicle?.year} ${targetVehicle?.make} ${targetVehicle?.model}.`}
            onClose={() => setShowMessageStarter(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
} 