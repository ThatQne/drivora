import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Car, 
  DollarSign, 
  Plus, 
  Minus, 
  Search, 
  Check,
  MessageCircle,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { Listing, Vehicle, Trade } from '../../types/index.ts';

interface TradeOfferModalProps {
  onClose: () => void;
  selectedListing?: Listing | null;
  existingTrade?: Trade | null; // For counter-offers
}

export function TradeOfferModal({ onClose, selectedListing, existingTrade }: TradeOfferModalProps) {
  const { state, addTrade, updateTrade, reloadTrades, deleteTrade, getUserVehicles } = useApp();
  const [step, setStep] = useState<'select-listing' | 'build-offer'>(
    selectedListing || existingTrade ? 'build-offer' : 'select-listing'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [targetListing, setTargetListing] = useState<Listing | null>(selectedListing || null);
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>(() => {
    if (existingTrade) {
      // Determine if current user is the original listing owner
      const listingOwnerId = selectedListing?.sellerId;
      const isOriginalReceiver = state.currentUser?.id === listingOwnerId;
      
      if (isOriginalReceiver) {
        // Original receiver countering - pre-select the offerer's vehicles as reference
        return existingTrade.offererVehicleIds;
      } else {
        // Original offerer or subsequent counter - don't pre-select, let them choose their own
        return [];
      }
    }
    return [];
  });
  const [cashAmount, setCashAmount] = useState(() => {
    if (existingTrade) {
      // Determine if current user is the original listing owner
      const listingOwnerId = selectedListing?.sellerId;
      const isOriginalReceiver = state.currentUser?.id === listingOwnerId;
      
      if (isOriginalReceiver) {
        // Original receiver countering - start with the most recent offer amount as reference
        if (existingTrade.status === 'countered' && existingTrade.receiverCashAmount !== undefined) {
          return existingTrade.receiverCashAmount;
        } else {
          return existingTrade.offererCashAmount;
        }
      } else {
        // Original offerer or subsequent counter - use most recent offer as reference
        if (existingTrade.status === 'countered' && existingTrade.receiverCashAmount !== undefined) {
          return existingTrade.receiverCashAmount;
        } else {
          return existingTrade.offererCashAmount;
        }
      }
    }
    return 0;
  });
  const [message, setMessage] = useState(existingTrade?.message || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cashDirection, setCashDirection] = useState<'add' | 'request'>(
    existingTrade ? 
      (existingTrade.offererCashAmount >= 0 ? 'add' : 'request') : 
      'add'
  );

  const [offererVehicles, setOffererVehicles] = useState<Vehicle[]>([]);
  const [loadingOffererVehicles, setLoadingOffererVehicles] = useState(false);

  // Initialize target listing from existing trade
  useEffect(() => {
    if (existingTrade && !targetListing) {
      // Find the listing from the existing trade
      const listing = state.allListings.find(l => l.id === existingTrade.listingId);
      if (listing) {
        setTargetListing(listing);
      }
    }
  }, [existingTrade, targetListing, state.allListings]);

  // Fetch offerer's vehicles when original receiver is countering
  useEffect(() => {
    const fetchOffererVehicles = async () => {
      if (existingTrade && targetListing) {
        const listingOwnerId = targetListing.sellerId;
        const isOriginalReceiver = state.currentUser?.id === listingOwnerId;
        
        if (isOriginalReceiver) {
          // Get the offerer's user ID
          const offererId = typeof existingTrade.offererUserId === 'string' 
            ? existingTrade.offererUserId 
            : (existingTrade.offererUserId as any)?._id || (existingTrade.offererUserId as any)?.id;
          
          if (offererId) {
            setLoadingOffererVehicles(true);
            try {
              const vehicles = await getUserVehicles(offererId);
              setOffererVehicles(vehicles);
            } catch (error) {
              console.error('Error fetching offerer vehicles:', error);
            } finally {
              setLoadingOffererVehicles(false);
            }
          }
        }
      }
    };

    fetchOffererVehicles();
  }, [existingTrade, targetListing, state.currentUser?.id, getUserVehicles]);

  // Available vehicles (user's own vehicles that are NOT auctioned)
  const availableVehicles = useMemo(() => {
    if (existingTrade) {
      // Determine the original listing owner (receiver) vs original offerer
      // We need to check the trade history to find the original roles
      const originalTradeEntry = existingTrade.tradeHistory.find(entry => entry.action === 'created');
      const originalOffererId = originalTradeEntry?.userId;
      
      // If we can't find the original trade entry, fall back to checking listing ownership
      const listingOwnerId = targetListing?.sellerId;
      const isOriginalReceiver = state.currentUser?.id === listingOwnerId;
      
      if (isOriginalReceiver) {
        // Original receiver (listing owner) - show ALL offerer's vehicles to choose what they want
        return loadingOffererVehicles ? [] : offererVehicles.filter((vehicle: Vehicle) => !vehicle.isAuctioned);
      } else {
        // Original offerer or subsequent counter - show your own vehicles
        return state.vehicles.filter(vehicle => 
          !vehicle.isAuctioned && vehicle.ownerId === state.currentUser?.id
        );
      }
    } else {
      // For new trades, show user's own vehicles
      return state.vehicles.filter(vehicle => 
        !vehicle.isAuctioned && vehicle.ownerId === state.currentUser?.id
      );
    }
  }, [state.vehicles, state.currentUser?.id, existingTrade, targetListing, offererVehicles, loadingOffererVehicles]);

  // Available listings to trade for (exclude user's own listings)
  const availableListings = useMemo(() => {
    return state.allListings.filter(listing => 
      listing.isActive && listing.sellerId !== state.currentUser?.id &&
      (!searchTerm || listing.title.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [state.allListings, state.currentUser?.id, searchTerm]);

  // Calculate total offer value
  const totalOfferValue = useMemo(() => {
    const vehicleValue = selectedVehicles.reduce((sum, vId) => {
      const vehicle = availableVehicles.find(v => v.id === vId);
      return sum + (vehicle?.customPrice || vehicle?.estimatedValue || 0);
    }, 0);
    return vehicleValue + cashAmount;
  }, [selectedVehicles, cashAmount, availableVehicles]);

  const handleVehicleToggle = (vehicleId: string) => {
    setSelectedVehicles(prev => 
      prev.includes(vehicleId) 
        ? prev.filter(id => id !== vehicleId)
        : [...prev, vehicleId]
    );
  };

  const handleSubmitTrade = async () => {
    if (!targetListing) return;

    setLoading(true);
    setError(null); // Clear any previous errors
    try {
      if (existingTrade) {
        // Unified counter system - send only the required counter fields
        const counterData = {
          status: 'countered' as const,
          counterVehicleIds: selectedVehicles,
          counterCashAmount: cashAmount,
          counterMessage: message
        };
        
        await updateTrade(existingTrade.id, counterData);
        await reloadTrades(); // Ensure state is refreshed
      } else {
        // This is a new trade offer
        const tradeData = {
          listingId: targetListing.id,
          offererUserId: state.currentUser!.id,
          receiverUserId: targetListing.sellerId,
          status: 'pending' as const,
          offererCashAmount: cashAmount,
          offererVehicleIds: selectedVehicles,
          message,
          tradeHistory: [{
            id: `history_${Date.now()}`,
            action: 'created' as const,
            userId: state.currentUser!.id,
            timestamp: new Date().toISOString(),
            offererCashAmount: cashAmount,
            offererVehicleIds: selectedVehicles,
            message
          }]
        };
        await addTrade(tradeData);
      }
      
      onClose();
    } catch (error: any) {
      console.error('Error creating trade:', error);
      
      // Handle specific error cases
      if (error.response?.data?.message) {
        const errorMessage = error.response.data.message;
        if (errorMessage.includes('already have an active trade')) {
          setError('You already have an active trade for this listing. Please cancel or complete your existing trade first.');
        } else if (errorMessage.includes('not found or inactive')) {
          setError('This listing is no longer available or has been sold.');
        } else {
          setError(errorMessage);
        }
      } else {
        setError('Failed to create trade. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderListingSelection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary-100 mb-2">Select a Listing to Trade For</h2>
        <p className="text-primary-300">Choose which vehicle you'd like to make a trade offer on</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-400" />
        <input
          type="text"
          placeholder="Search listings..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {/* Listings Grid */}
      <div className="max-h-96 overflow-y-auto space-y-3">
        {availableListings.length === 0 ? (
          <div className="text-center py-8">
            <Car className="w-12 h-12 mx-auto mb-4 text-primary-400" />
            <p className="text-primary-300">No available listings found</p>
          </div>
        ) : (
          availableListings.map((listing) => {
            const vehicle = (listing as any).vehicle || state.vehicles.find(v => v.id === listing.vehicleId);
            const seller = (listing as any).seller || state.users.find(u => u.id === listing.sellerId);
            
            return (
              <motion.div
                key={listing.id}
                whileHover={{ scale: 1.02 }}
                className="glass-effect rounded-xl p-4 cursor-pointer hover:bg-primary-800/20 transition-all"
                onClick={() => {
                  setTargetListing(listing);
                  setStep('build-offer');
                }}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-primary-800/30 rounded-lg flex items-center justify-center">
                    {vehicle?.images?.[0] ? (
                      <img
                        src={vehicle.images[0]}
                        alt={listing.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Car className="w-8 h-8 text-primary-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-primary-100">{listing.title}</h3>
                    <p className="text-sm text-primary-300">
                      {vehicle && `${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-green-400 font-bold">
                        ${listing.price.toLocaleString()}
                      </span>
                      <span className="text-sm text-primary-400">
                        by @{seller?.username || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-primary-400" />
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );

  const renderOfferBuilder = () => {
    const targetVehicle = (targetListing as any)?.vehicle || state.vehicles.find(v => v.id === targetListing?.vehicleId);
    const targetSeller = (targetListing as any)?.seller || state.users.find(u => u.id === targetListing?.sellerId);

    return (
      <div className="space-y-6">
        <div>
          <button
            onClick={() => setStep('select-listing')}
            className="text-blue-400 hover:text-blue-300 text-sm mb-4"
          >
            ← Back to listing selection
          </button>
          <h2 className="text-2xl font-bold text-primary-100 mb-2">
            {existingTrade ? 'Make Counter Offer' : 'Build Your Trade Offer'}
          </h2>
          <p className="text-primary-300">
            {existingTrade 
              ? 'Modify their offer and send your counter proposal'
              : 'Select vehicles and cash to offer for this listing'
            }
          </p>
        </div>

        {/* Target Listing Summary */}
        {targetListing && (
          <div className="glass-effect rounded-xl p-4 border border-blue-500/30">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-primary-800/30 rounded-lg flex items-center justify-center">
                {targetVehicle?.images?.[0] ? (
                  <img
                    src={targetVehicle.images[0]}
                    alt={targetListing.title}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <Car className="w-8 h-8 text-primary-400" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-primary-100">{targetListing.title}</h3>
                <p className="text-sm text-primary-300">
                  {targetVehicle && `${targetVehicle.year} ${targetVehicle.make} ${targetVehicle.model}`}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-green-400 font-bold">
                    ${targetListing.price.toLocaleString()}
                  </span>
                  <span className="text-sm text-primary-400">
                    by @{targetSeller?.username || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Your Vehicles */}
        <div>
          <h3 className="text-lg font-semibold text-primary-100 mb-4">
            {existingTrade ? (
              (() => {
                const listingOwnerId = targetListing?.sellerId;
                const isOriginalReceiver = state.currentUser?.id === listingOwnerId;
                
                if (isOriginalReceiver) {
                  return 'Select What You Want in Exchange';
                } else {
                  return 'Your Vehicles (Counter Offer)';
                }
              })()
            ) : 'Your Vehicles'}
          </h3>
          {availableVehicles.length === 0 ? (
            <div className="glass-effect rounded-xl p-6 text-center">
              <Car className="w-12 h-12 mx-auto mb-4 text-primary-400" />
              <p className="text-primary-300">
                {loadingOffererVehicles ? 'Loading available vehicles...' : 'No available vehicles to trade'}
              </p>
              <p className="text-sm text-primary-400 mt-1">
                {loadingOffererVehicles 
                  ? 'Please wait while we fetch the available vehicles'
                  : 'You can only trade vehicles that are not currently in auction'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableVehicles.map((vehicle) => (
                <motion.div
                  key={vehicle.id}
                  whileTap={{ scale: 0.98 }}
                  className={`glass-effect rounded-xl p-4 cursor-pointer transition-all ${
                    selectedVehicles.includes(vehicle.id)
                      ? 'border-2 border-blue-500 bg-blue-500/10'
                      : 'border border-primary-700/30 hover:border-primary-600/50'
                  }`}
                  onClick={() => handleVehicleToggle(vehicle.id)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary-800/30 rounded-lg flex items-center justify-center relative">
                      {vehicle.images?.[0] ? (
                        <img
                          src={vehicle.images[0]}
                          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Car className="w-6 h-6 text-primary-400" />
                      )}
                      {selectedVehicles.includes(vehicle.id) && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-primary-100">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h4>
                      <p className="text-sm text-primary-300">
                        {vehicle.mileage.toLocaleString()} mi
                      </p>
                      <p className="text-green-400 font-medium">
                        ${(vehicle.customPrice || vehicle.estimatedValue).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Cash Amount */}
        <div>
          <h3 className="text-lg font-semibold text-primary-100 mb-4">Cash Component</h3>
          <div className="glass-effect rounded-xl p-4">
            <div className="space-y-4">
              {/* Cash Direction Selector */}
              <div className="flex space-x-4">
                <button
                  onClick={() => setCashAmount(Math.abs(cashAmount))}
                  className={`flex-1 p-3 rounded-lg border transition-all ${
                    cashAmount >= 0
                      ? 'border-green-500 bg-green-500/20 text-green-300'
                      : 'border-primary-600 bg-primary-800/30 text-primary-300'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <Plus className="w-4 h-4" />
                    <span className="font-medium">
                      {existingTrade ? (
                        // For counter offers, determine labels based on original trade context
                        (() => {
                          const originalOffererId = typeof existingTrade.offererUserId === 'string' 
                            ? existingTrade.offererUserId 
                            : (existingTrade.offererUserId as any)?._id || (existingTrade.offererUserId as any)?.id;
                          const isOriginalReceiver = originalOffererId !== state.currentUser?.id;
                          
                          if (isOriginalReceiver) {
                            // Original receiver countering: if original offerer added cash, say "They add cash"
                            return existingTrade.offererCashAmount >= 0 ? 'They add cash' : 'I\'ll add cash';
                          } else {
                            // Original offerer counter-countering: use their perspective
                            return 'I\'ll add cash';
                          }
                        })()
                      ) : 'I\'ll add cash'}
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => setCashAmount(-Math.abs(cashAmount || 1000))}
                  className={`flex-1 p-3 rounded-lg border transition-all ${
                    cashAmount < 0
                      ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                      : 'border-primary-600 bg-primary-800/30 text-primary-300'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <Minus className="w-4 h-4" />
                    <span className="font-medium">
                      {existingTrade ? (
                        // For counter offers, determine labels based on original trade context
                        (() => {
                          const originalOffererId = typeof existingTrade.offererUserId === 'string' 
                            ? existingTrade.offererUserId 
                            : (existingTrade.offererUserId as any)?._id || (existingTrade.offererUserId as any)?.id;
                          const isOriginalReceiver = originalOffererId !== state.currentUser?.id;
                          
                          if (isOriginalReceiver) {
                            // Original receiver countering: if original offerer added cash, say "I'll add cash"  
                            return existingTrade.offererCashAmount >= 0 ? 'I\'ll add cash' : 'They add cash';
                          } else {
                            // Original offerer counter-countering: use their perspective
                            return 'They add cash';
                          }
                        })()
                      ) : 'They add cash'}
                    </span>
                  </div>
                </button>
              </div>

              {/* Cash Amount Input */}
              <div className="flex items-center space-x-4">
                <DollarSign className={`w-6 h-6 ${cashAmount >= 0 ? 'text-green-400' : 'text-blue-400'}`} />
                <div className="flex-1">
                  <input
                    type="number"
                    value={Math.abs(cashAmount) === 0 ? '' : Math.abs(cashAmount)}
                    onChange={(e) => {
                      const value = Number(e.target.value) || 0;
                      setCashAmount(cashAmount < 0 ? -value : value);
                    }}
                    placeholder="0"
                    className="input-field text-lg font-bold"
                  />
                  <p className="text-sm text-primary-400 mt-1">
                    {cashAmount > 0 
                      ? (() => {
                          if (existingTrade) {
                            const originalOffererId = typeof existingTrade.offererUserId === 'string' 
                              ? existingTrade.offererUserId 
                              : (existingTrade.offererUserId as any)?._id || (existingTrade.offererUserId as any)?.id;
                            const isOriginalReceiver = originalOffererId !== state.currentUser?.id;
                            
                            if (isOriginalReceiver) {
                              // Original receiver countering
                              if (existingTrade.offererCashAmount >= 0) {
                                return `They're offering $${cashAmount.toLocaleString()} in addition to vehicles`;
                              } else {
                                return `You're offering $${cashAmount.toLocaleString()} in addition to vehicles`;
                              }
                            } else {
                              // Original offerer counter-countering
                              return `You're offering $${cashAmount.toLocaleString()} in addition to vehicles`;
                            }
                          } else {
                            return `You're offering $${cashAmount.toLocaleString()} in addition to vehicles`;
                          }
                        })()
                      : cashAmount < 0 
                      ? (() => {
                          if (existingTrade) {
                            const originalOffererId = typeof existingTrade.offererUserId === 'string' 
                              ? existingTrade.offererUserId 
                              : (existingTrade.offererUserId as any)?._id || (existingTrade.offererUserId as any)?.id;
                            const isOriginalReceiver = originalOffererId !== state.currentUser?.id;
                            
                            if (isOriginalReceiver) {
                              // Original receiver countering
                              if (existingTrade.offererCashAmount >= 0) {
                                return `You're requesting $${Math.abs(cashAmount).toLocaleString()} from them`;
                              } else {
                                return `They're offering $${Math.abs(cashAmount).toLocaleString()} to you`;
                              }
                            } else {
                              // Original offerer counter-countering
                              return `You're requesting $${Math.abs(cashAmount).toLocaleString()} from them`;
                            }
                          } else {
                            return `You're requesting $${Math.abs(cashAmount).toLocaleString()} from the other party`;
                          }
                        })()
                      : "No cash involved in this trade"
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Message */}
        <div>
          <h3 className="text-lg font-semibold text-primary-100 mb-4">Message (Optional)</h3>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a personal message to your trade offer..."
            className="input-field h-24 resize-none"
          />
        </div>

        {/* Offer Summary */}
        <div className="glass-effect rounded-xl p-4 border border-green-500/30">
          <h3 className="text-lg font-semibold text-primary-100 mb-4">Trade Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-primary-300">Vehicles ({selectedVehicles.length}):</span>
              <span className="text-primary-100 font-medium">
                ${selectedVehicles.reduce((sum, vId) => {
                  const vehicle = availableVehicles.find(v => v.id === vId);
                  return sum + (vehicle?.customPrice || vehicle?.estimatedValue || 0);
                }, 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-primary-300">Cash:</span>
              <span className={`font-medium ${cashAmount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {cashAmount >= 0 ? '+' : ''}${cashAmount.toLocaleString()}
              </span>
            </div>
            <div className="border-t border-primary-700/30 pt-2">
              <div className="flex justify-between">
                <span className="text-primary-100 font-semibold">Total Offer Value:</span>
                <span className="text-green-400 font-bold text-lg">
                  ${totalOfferValue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        {error && (
          <div className="glass-effect rounded-xl p-4 border border-red-500/30 bg-red-500/10">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-300">{error}</p>
            </div>
          </div>
        )}
        
        <div className="flex space-x-4">
          <button
            onClick={onClose}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmitTrade}
            disabled={loading || (selectedVehicles.length === 0 && cashAmount === 0)}
            className="btn-primary flex-1"
          >
            {loading ? 'Sending...' : existingTrade ? 'Send Counter Offer' : 'Send Trade Offer'}
          </button>
        </div>
      </div>
    );
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
        className="glass-effect rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-primary-700/30">
          <h1 className="text-2xl font-bold text-primary-100">
            {existingTrade ? 'Counter Trade Offer' : 
             step === 'select-listing' ? 'Make Trade Offer' : 'Build Your Offer'}
          </h1>
          <button
            onClick={onClose}
            className="p-2 hover:bg-primary-800/50 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-primary-300" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'select-listing' ? renderListingSelection() : renderOfferBuilder()}
        </div>
      </motion.div>
    </motion.div>
  );
}