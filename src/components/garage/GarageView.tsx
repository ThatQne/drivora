import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Car, Edit, Trash2, DollarSign, Calendar, Gauge, List, Gavel, RefreshCw, X, Image } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { Vehicle } from '../../types/index.ts';
import { VehicleForm } from './VehicleForm.tsx';
import { ListingForm } from '../listings/ListingForm.tsx';
import { SkeletonGrid } from '../common/SkeletonCard.tsx';

export function GarageView() {
  const { state, addVehicle, updateVehicle, deleteVehicle, deleteListing, renewListing, loadAllListings, getVehiclesCount } = useApp();
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [listingVehicle, setListingVehicle] = useState<Vehicle | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filterBy, setFilterBy] = useState('all');
  const [vehicleCount, setVehicleCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load vehicle count first, then actual vehicles
  useEffect(() => {
    const loadVehicleData = async () => {
      try {
        // Get count first for skeleton loading
        const count = await getVehiclesCount();
        setVehicleCount(count);
        
        // If we have vehicles in state, we're done loading
        if (state.vehicles.length > 0) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error loading vehicle count:', error);
        setIsLoading(false);
      }
    };

    loadVehicleData();
  }, [getVehiclesCount]);

  // Update loading state when vehicles are loaded
  useEffect(() => {
    if (state.vehicles.length > 0 || (vehicleCount !== null && vehicleCount === 0)) {
      setIsLoading(false);
    }
  }, [state.vehicles.length, vehicleCount]);

  // Ensure listings are loaded when garage mounts
  useEffect(() => {
    if (state.allListings.length === 0) {
      console.log('🔄 GarageView: Loading listings to check vehicle listing status...');
      loadAllListings();
    }
  }, [state.allListings.length, loadAllListings]);

  // Helper function to dynamically check if a vehicle is listed
  const isVehicleListed = (vehicle: Vehicle) => {
    const userListing = state.listings.find(l => l.vehicleId === vehicle.id && l.isActive);
    const allListing = state.allListings.find(l => l.vehicleId === vehicle.id && l.isActive && l.sellerId === state.currentUser?.id);
    return !!(userListing || allListing);
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    if (window.confirm('Are you sure you want to delete this vehicle?')) {
      deleteVehicle(vehicleId);
    }
  };

  const handleCreateListing = (vehicle: Vehicle) => {
    setListingVehicle(vehicle);
  };

  const handleCreateAuction = (vehicle: Vehicle) => {
    // TODO: Implement auction creation
    alert('Auction creation coming soon!');
  };

  const handleRenewListing = (vehicle: Vehicle) => {
    // Check both user listings and all listings to find the active listing
    const userListing = state.listings.find(l => l.vehicleId === vehicle.id && l.isActive);
    const allListing = state.allListings.find(l => l.vehicleId === vehicle.id && l.isActive && l.sellerId === state.currentUser?.id);
    const listing = userListing || allListing;
    
    console.log('🔍 GarageView: Renew listing check for vehicle:', vehicle.id);
    console.log('📊 User listings count:', state.listings.length);
    console.log('📊 All listings count:', state.allListings.length);
    console.log('🎯 Found user listing:', !!userListing);
    console.log('🎯 Found all listing:', !!allListing);
    console.log('✅ Final listing:', !!listing);
    
    if (!listing) {
      alert('No active listing found for this vehicle.');
      return;
    }

    // Check if listing can be renewed (12-hour cooldown)
    if (listing.canRenewAfter) {
      const canRenewTime = new Date(listing.canRenewAfter).getTime();
      const currentTime = new Date().getTime();
      
      if (currentTime < canRenewTime) {
        const hoursLeft = Math.ceil((canRenewTime - currentTime) / (1000 * 60 * 60));
        alert(`You can renew this listing in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}.`);
        return;
      }
    }

    if (window.confirm('Renew this listing? This will refresh its position and reset the 12-hour renewal timer.')) {
      renewListing(listing.id);
      alert('Listing renewed successfully!');
    }
  };

  const handleRemoveListing = (vehicle: Vehicle) => {
    // Check both user listings and all listings to find the active listing
    const userListing = state.listings.find(l => l.vehicleId === vehicle.id && l.isActive);
    const allListing = state.allListings.find(l => l.vehicleId === vehicle.id && l.isActive && l.sellerId === state.currentUser?.id);
    const listing = userListing || allListing;
    
    console.log('🔍 GarageView: Remove listing check for vehicle:', vehicle.id);
    console.log('🎯 Found listing:', !!listing);
    
    if (listing && window.confirm('Are you sure you want to remove this listing?')) {
      deleteListing(listing.id);
    }
  };

  const handleRemoveAuction = (vehicle: Vehicle) => {
    const auction = state.auctions.find(a => a.vehicleId === vehicle.id && a.isActive);
    if (!auction) return;

    // Check if auction was created within the last 10 minutes
    const createdTime = new Date(auction.createdAt).getTime();
    const currentTime = new Date().getTime();
    const timeDifference = (currentTime - createdTime) / (1000 * 60); // in minutes

    if (timeDifference > 10) {
      alert('Auction cannot be removed after 10 minutes of creation.');
      return;
    }

    if (window.confirm('Are you sure you want to remove this auction?')) {
      // TODO: Implement auction removal
      alert('Auction removal coming soon!');
    }
  };

  const canRemoveAuction = (vehicle: Vehicle) => {
    const auction = state.auctions.find(a => a.vehicleId === vehicle.id && a.isActive);
    if (!auction) return false;

    const createdTime = new Date(auction.createdAt).getTime();
    const currentTime = new Date().getTime();
    const timeDifference = (currentTime - createdTime) / (1000 * 60); // in minutes

    return timeDifference <= 10;
  };

  const canRenewListing = (vehicle: Vehicle) => {
    // Check both user listings and all listings to find the active listing
    const userListing = state.listings.find(l => l.vehicleId === vehicle.id && l.isActive);
    const allListing = state.allListings.find(l => l.vehicleId === vehicle.id && l.isActive && l.sellerId === state.currentUser?.id);
    const listing = userListing || allListing;
    
    if (!listing || !listing.canRenewAfter) return true; // If no renewal time set, allow renewal

    const canRenewTime = new Date(listing.canRenewAfter).getTime();
    const currentTime = new Date().getTime();
    
    return currentTime >= canRenewTime;
  };

  const getRenewalTimeLeft = (vehicle: Vehicle) => {
    // Check both user listings and all listings to find the active listing
    const userListing = state.listings.find(l => l.vehicleId === vehicle.id && l.isActive);
    const allListing = state.allListings.find(l => l.vehicleId === vehicle.id && l.isActive && l.sellerId === state.currentUser?.id);
    const listing = userListing || allListing;
    
    if (!listing || !listing.canRenewAfter) return null;

    const canRenewTime = new Date(listing.canRenewAfter).getTime();
    const currentTime = new Date().getTime();
    
    if (currentTime >= canRenewTime) return null;

    const hoursLeft = Math.ceil((canRenewTime - currentTime) / (1000 * 60 * 60));
    return hoursLeft;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary-100">My Garage</h1>
          <p className="text-primary-300 mt-1">Manage your vehicle inventory</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Add Vehicle</span>
        </motion.button>
      </div>

      {/* Vehicle Grid */}
      {isLoading && vehicleCount !== null && vehicleCount > 0 ? (
        <SkeletonGrid count={vehicleCount} variant="vehicle" />
      ) : state.vehicles.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="w-24 h-24 bg-primary-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Car className="w-12 h-12 text-primary-400" />
          </div>
          <h3 className="text-xl font-semibold text-primary-200 mb-2">No vehicles yet</h3>
          <p className="text-primary-400 mb-6">Add your first vehicle to get started</p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddForm(true)}
            className="btn-primary"
          >
            Add Your First Vehicle
          </motion.button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {state.vehicles.map((vehicle, index) => (
              <motion.div
                key={vehicle.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.1 }}
                className="glass-effect rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300"
              >
                {/* Vehicle Image */}
                <div className="w-full h-48 bg-gradient-to-br from-primary-800/30 to-primary-700/30 flex items-center justify-center border-b border-primary-600/20 relative">
                  {vehicle.images && vehicle.images.length > 0 ? (
                    <>
                      <img
                        src={vehicle.images[0]}
                        alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Image Count Badge */}
                      {vehicle.images.length > 1 && (
                        <div className="absolute bottom-3 right-3 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium flex items-center space-x-1">
                          <Image className="w-3 h-3" />
                          <span>{vehicle.images.length}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <Car className="w-16 h-16 text-primary-400" />
                  )}
                  
                  {/* Status Badge */}
                  {vehicle.isInTrade ? (
                    <div className="absolute top-3 left-3 bg-orange-500/90 text-white px-2 py-1 rounded-full text-xs font-medium">
                      In Trade
                    </div>
                  ) : isVehicleListed(vehicle) ? (
                    <div className="absolute top-3 left-3 bg-blue-500/90 text-white px-2 py-1 rounded-full text-xs font-medium">
                      Listed
                    </div>
                  ) : vehicle.isAuctioned ? (
                    <div className="absolute top-3 left-3 bg-purple-500/90 text-white px-2 py-1 rounded-full text-xs font-medium">
                      Auctioned
                    </div>
                  ) : null}
                </div>

                <div className="p-6">
                  {/* Vehicle Info */}
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-xl font-bold text-primary-100">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h3>
                      <p className="text-primary-300 capitalize">{vehicle.transmission}</p>
                    </div>

                    <div className="flex items-center justify-between text-sm text-primary-400">
                      <div className="flex items-center space-x-1">
                        <Gauge className="w-4 h-4" />
                        <span>{vehicle.mileage.toLocaleString()} mi</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{vehicle.year}</span>
                      </div>
                    </div>



                    {/* Action Buttons */}
                    <div className="space-y-2 pt-2">
                      {/* Edit and Delete Row */}
                      <div className="flex space-x-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedVehicle(vehicle)}
                          className="flex-1 btn-secondary flex items-center justify-center space-x-1"
                        >
                          <Edit className="w-4 h-4" />
                          <span>Edit</span>
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleDeleteVehicle(vehicle.id)}
                          className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-red-500/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>

                      {/* Listing/Auction Controls */}
                      {vehicle.isInTrade ? (
                        <div className="flex space-x-2">
                          <div className="flex-1 text-center py-2 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                            <span className="text-sm text-orange-400">In Active Trade</span>
                          </div>
                        </div>
                      ) : !isVehicleListed(vehicle) && !vehicle.isAuctioned ? (
                        <div className="flex space-x-2">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleCreateListing(vehicle)}
                            className="flex-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg px-3 py-2 flex items-center justify-center space-x-1 text-sm transition-colors"
                          >
                            <List className="w-4 h-4" />
                            <span>List</span>
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleCreateAuction(vehicle)}
                            className="flex-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-lg px-3 py-2 flex items-center justify-center space-x-1 text-sm transition-colors"
                          >
                            <Gavel className="w-4 h-4" />
                            <span>Auction</span>
                          </motion.button>
                        </div>
                      ) : isVehicleListed(vehicle) ? (
                        <div className="space-y-2">
                          <div className="flex space-x-2">
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleCreateListing(vehicle)}
                              className="flex-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg px-3 py-2 flex items-center justify-center space-x-1 text-sm transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                              <span>Edit</span>
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: canRenewListing(vehicle) ? 1.02 : 1 }}
                              whileTap={{ scale: canRenewListing(vehicle) ? 0.98 : 1 }}
                              onClick={() => handleRenewListing(vehicle)}
                              disabled={!canRenewListing(vehicle)}
                              className={`flex-1 border rounded-lg px-3 py-2 flex items-center justify-center space-x-1 text-sm transition-colors ${
                                canRenewListing(vehicle)
                                  ? 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/20'
                                  : 'bg-gray-500/10 text-gray-400 border-gray-500/20 cursor-not-allowed'
                              }`}
                            >
                              <RefreshCw className="w-4 h-4" />
                              <span>Renew</span>
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleRemoveListing(vehicle)}
                              className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </motion.button>
                          </div>
                          {!canRenewListing(vehicle) && (
                            <p className="text-xs text-gray-400 text-center">
                              Can renew in {getRenewalTimeLeft(vehicle)} hour{getRenewalTimeLeft(vehicle) !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      ) : vehicle.isAuctioned ? (
                        <div className="flex space-x-2">
                          <div className="flex-1 text-center py-2">
                            <span className="text-sm text-purple-400">Currently Auctioned</span>
                          </div>
                          {canRemoveAuction(vehicle) && (
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleRemoveAuction(vehicle)}
                              className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </motion.button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Vehicle Form Modal */}
      <AnimatePresence>
        {showAddForm && (
          <VehicleForm
            onClose={() => setShowAddForm(false)}
          />
        )}
        {selectedVehicle && (
          <VehicleForm
            vehicle={selectedVehicle}
            onClose={() => setSelectedVehicle(null)}
          />
        )}
        {listingVehicle && (
          <ListingForm
            vehicle={listingVehicle}
            listing={
              state.listings.find(l => l.vehicleId === listingVehicle.id && l.isActive) ||
              state.allListings.find(l => l.vehicleId === listingVehicle.id && l.isActive && l.sellerId === state.currentUser?.id)
            }
            onClose={() => setListingVehicle(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
} 