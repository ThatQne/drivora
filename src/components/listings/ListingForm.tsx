import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, List, DollarSign, Tag, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { Vehicle, Listing } from '../../types/index.ts';

interface ListingFormProps {
  vehicle: Vehicle;
  listing?: Listing;
  onClose: () => void;
}

export function ListingForm({ vehicle, listing, onClose }: ListingFormProps) {
  const { addListing, updateListing, state } = useApp();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: listing?.title || `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    description: listing?.description || '',
    price: listing?.price || vehicle.customPrice || vehicle.estimatedValue,
    problems: listing?.problems || [] as string[],
    additionalFeatures: listing?.additionalFeatures || [] as string[],
    tags: listing?.tags || [] as string[],
  });

  const [newProblem, setNewProblem] = useState('');
  const [newFeature, setNewFeature] = useState('');
  const [newTag, setNewTag] = useState('');

  // Common tags for vehicles
  const commonTags = [
    'Low Mileage', 'One Owner', 'Garage Kept', 'Service Records', 'No Accidents',
    'Recently Serviced', 'New Tires', 'Clean Title', 'Non-Smoker', 'Highway Miles',
    'City Car', 'Weekend Car', 'Daily Driver', 'Modified', 'Stock', 'Restored',
    'Classic', 'Collectible', 'Rare', 'Limited Edition'
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' ? Number(value) : value
    }));
  };

  const addProblem = () => {
    if (newProblem.trim()) {
      setFormData(prev => ({
        ...prev,
        problems: [...prev.problems, newProblem.trim()]
      }));
      setNewProblem('');
    }
  };

  const removeProblem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      problems: prev.problems.filter((_, i) => i !== index)
    }));
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData(prev => ({
        ...prev,
        additionalFeatures: [...prev.additionalFeatures, newFeature.trim()]
      }));
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      additionalFeatures: prev.additionalFeatures.filter((_, i) => i !== index)
    }));
  };

  const addTag = (tag: string) => {
    if (!formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const addCustomTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!state.currentUser) {
        throw new Error('User not authenticated');
      }

      const now = new Date().toISOString();

      if (listing) {
        // Editing existing listing - preserve renewal timing
        const listingData = {
          ...formData,
          vehicleId: vehicle.id,
          sellerId: state.currentUser.id,
          isActive: true,
          views: listing.views,
          lastRenewed: listing.lastRenewed, // Keep original renewal time
          canRenewAfter: listing.canRenewAfter, // Keep original renewal cooldown
        };
        updateListing({ ...listing, ...listingData, updatedAt: now });
      } else {
        // Creating new listing - set initial renewal timing
        const canRenewAfter = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(); // 12 hours from now
        const listingData = {
          ...formData,
          vehicleId: vehicle.id,
          sellerId: state.currentUser.id,
          isActive: true,
          views: 0,
          lastRenewed: now,
          canRenewAfter,
        };
        addListing(listingData);
      }

      onClose();
    } catch (error) {
      console.error('Failed to save listing:', error);
      alert('Failed to save listing. Please try again.');
    } finally {
      setLoading(false);
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
        className="glass-effect rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <List className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-primary-100">
                {listing ? 'Edit Listing' : 'Create Listing'}
              </h2>
              <p className="text-primary-300">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-primary-800/50 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-primary-300" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary-100">Basic Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-primary-300 mb-2">
                Listing Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="input-field"
                placeholder="e.g., 2020 Toyota Camry - Excellent Condition"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="input-field resize-none"
                placeholder="Describe your vehicle's condition, history, and any notable features..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-300 mb-2">
                Asking Price *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-400" />
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  className="input-field pl-10"
                  min="0"
                  required
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary-100">Tags</h3>
            
            {/* Common Tags */}
            <div>
              <label className="block text-sm font-medium text-primary-300 mb-2">
                Select Common Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {commonTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addTag(tag)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      formData.tags.includes(tag)
                        ? 'bg-blue-500 text-white'
                        : 'bg-primary-800/30 text-primary-300 hover:bg-primary-700/30'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Tag Input */}
            <div>
              <label className="block text-sm font-medium text-primary-300 mb-2">
                Add Custom Tag
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="input-field flex-1"
                  placeholder="Enter custom tag"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
                />
                <button
                  type="button"
                  onClick={addCustomTag}
                  className="btn-secondary flex items-center space-x-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Selected Tags */}
            {formData.tags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-primary-300 mb-2">
                  Selected Tags
                </label>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-1 bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm"
                    >
                      <Tag className="w-3 h-3" />
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(index)}
                        className="hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Problems */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary-100">Known Issues (Optional)</h3>
            
            <div className="flex space-x-2">
              <input
                type="text"
                value={newProblem}
                onChange={(e) => setNewProblem(e.target.value)}
                className="input-field flex-1"
                placeholder="Describe any known problems"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addProblem())}
              />
              <button
                type="button"
                onClick={addProblem}
                className="btn-secondary flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>

            {formData.problems.length > 0 && (
              <div className="space-y-2">
                {formData.problems.map((problem, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3"
                  >
                    <span className="text-yellow-300">{problem}</span>
                    <button
                      type="button"
                      onClick={() => removeProblem(index)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Additional Features */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary-100">Additional Features (Optional)</h3>
            
            <div className="flex space-x-2">
              <input
                type="text"
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                className="input-field flex-1"
                placeholder="e.g., Backup Camera, Heated Seats, etc."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
              />
              <button
                type="button"
                onClick={addFeature}
                className="btn-secondary flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>

            {formData.additionalFeatures.length > 0 && (
              <div className="space-y-2">
                {formData.additionalFeatures.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-lg p-3"
                  >
                    <span className="text-green-300">{feature}</span>
                    <button
                      type="button"
                      onClick={() => removeFeature(index)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex space-x-3 pt-6 border-t border-primary-700/30">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-primary disabled:opacity-50"
            >
              {loading ? 'Saving...' : listing ? 'Update Listing' : 'Create Listing'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
} 