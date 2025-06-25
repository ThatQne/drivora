import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Car, Loader, Upload, Trash2, GripVertical, Image } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { CarValuationService } from '../../services/carValuationService.ts';
import { Vehicle } from '../../types/index.ts';
import { ImageModal } from '../common/ImageModal.tsx';

interface VehicleFormProps {
  vehicle?: Vehicle;
  onClose: () => void;
}

export function VehicleForm({ vehicle, onClose }: VehicleFormProps) {
  const { addVehicle, updateVehicle, state } = useApp();
  const [loading, setLoading] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [formData, setFormData] = useState({
    make: vehicle?.make || '',
    model: vehicle?.model || '',
    year: vehicle?.year?.toString() || '',
    mileage: vehicle?.mileage?.toString() || '',
    transmission: vehicle?.transmission || 'automatic' as const,
    vin: vehicle?.vin || '',
    images: vehicle?.images || [] as string[],
  });

  const [makes] = useState(CarValuationService.getPopularMakes());
  const [models, setModels] = useState(CarValuationService.getModelsForMake(formData.make));

  useEffect(() => {
    setModels(CarValuationService.getModelsForMake(formData.make));
  }, [formData.make]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, imageUrl]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    setFormData(prev => {
      const newImages = [...prev.images];
      const [movedImage] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, movedImage);
      return {
        ...prev,
        images: newImages
      };
    });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (dragIndex !== dropIndex) {
      moveImage(dragIndex, dropIndex);
    }
  };

  const handleImageClick = (index: number) => {
    setCurrentImageIndex(index);
    setImageModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!state.currentUser) {
        throw new Error('User not authenticated');
      }

      // Calculate estimated value for reference
      let estimatedValue = 0;
      if (formData.make && formData.model && formData.year) {
        estimatedValue = CarValuationService.getQuickEstimate(
          formData.make, 
          formData.model, 
          Number(formData.year)
        );
      }

      const vehicleData = {
        make: formData.make,
        model: formData.model,
        transmission: formData.transmission,
        vin: formData.vin,
        year: formData.year ? Number(formData.year) : new Date().getFullYear(),
        mileage: formData.mileage ? Number(formData.mileage) : 0,
        estimatedValue,
        images: formData.images,
      };

      if (vehicle) {
        await updateVehicle({ ...vehicle, ...vehicleData });
      } else {
        await addVehicle(vehicleData);
      }

      onClose();
    } catch (error) {
      console.error('Failed to save vehicle:', error);
      alert('Failed to save vehicle. Please try again.');
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
        className="glass-effect rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-primary-100">
                {vehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
              </h2>
              <p className="text-primary-300">
                {vehicle ? 'Update your vehicle information' : 'Add a vehicle to your garage'}
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                Make *
              </label>
              <select
                name="make"
                value={formData.make}
                onChange={handleChange}
                className="input-field"
                required
              >
                <option value="">Select Make</option>
                {makes.map(make => (
                  <option key={make} value={make}>{make}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                Model *
              </label>
              <select
                name="model"
                value={formData.model}
                onChange={handleChange}
                className="input-field"
                required
                disabled={!formData.make}
              >
                <option value="">Select Model</option>
                {models.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Year *
              </label>
              <input
                type="number"
                name="year"
                value={formData.year}
                onChange={handleChange}
                className="input-field"
                min="1900"
                max={new Date().getFullYear() + 1}
                placeholder={`e.g., ${new Date().getFullYear()}`}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Mileage *
              </label>
              <input
                type="number"
                name="mileage"
                value={formData.mileage}
                onChange={handleChange}
                className="input-field"
                min="0"
                placeholder="e.g., 50000"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                Transmission
              </label>
              <select
                name="transmission"
                value={formData.transmission}
                onChange={handleChange}
                className="input-field"
              >
                <option value="automatic">Automatic</option>
                <option value="manual">Manual</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                VIN *
              </label>
              <input
                type="text"
                name="vin"
                value={formData.vin}
                onChange={handleChange}
                className="input-field"
                placeholder="Vehicle Identification Number"
                required
                maxLength={17}
                minLength={17}
              />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border-primary)', paddingTop: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '1rem' }}>
              Images
            </h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                Upload Vehicle Images
              </label>
              <div style={{
                border: '2px dashed var(--color-border-primary)',
                borderRadius: '0.5rem',
                padding: '2rem',
                textAlign: 'center',
                background: 'var(--color-bg-glass-light)',
                cursor: 'pointer'
              }}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                  id="image-upload"
                />
                <label htmlFor="image-upload" style={{ cursor: 'pointer' }}>
                  <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--color-text-secondary)' }} />
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                    Click to upload images or drag and drop
                  </p>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    PNG, JPG, GIF up to 10MB each
                  </p>
                </label>
              </div>
            </div>

            {formData.images.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <Image className="w-4 h-4 text-blue-400" />
                  <p className="text-sm text-blue-400">
                    First image will be the main thumbnail. Drag to reorder.
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  {formData.images.map((image, index) => (
                    <div 
                      key={index} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                      style={{ 
                        position: 'relative', 
                        borderRadius: '0.5rem', 
                        overflow: 'hidden',
                        cursor: 'grab',
                        border: index === 0 ? '2px solid #3b82f6' : '2px solid transparent',
                        transition: 'border-color 0.2s'
                      }}
                      className="group hover:scale-105 transition-transform"
                    >
                      {/* Main Thumbnail Badge */}
                      {index === 0 && (
                        <div className="absolute top-2 left-2 bg-blue-500/80 backdrop-blur-sm border border-blue-400/50 text-white px-2 py-1 rounded text-xs font-medium z-10">
                          Main
                        </div>
                      )}
                      
                      <img
                        src={image}
                        alt={`Vehicle ${index + 1}`}
                        style={{ width: '100%', height: '140px', objectFit: 'cover' }}
                        onClick={() => handleImageClick(index)}
                        className="cursor-pointer"
                      />
                      
                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-black/70 hover:bg-red-600/80 border-none rounded-full w-6 h-6 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-200 z-20"
                      >
                        <Trash2 className="w-3 h-3 text-white" />
                      </button>
                      
                      {/* Image Number */}
                      <div className="absolute bottom-1 left-1 bg-black/70 text-white px-2 py-1 rounded text-xs">
                        {index + 1}
                      </div>
                      
                      {/* Drag Handle */}
                      <div className="absolute bottom-2 right-2 bg-black/70 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <GripVertical className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex space-x-3 pt-6">
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
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </div>
              ) : (
                <span>{vehicle ? 'Update Vehicle' : 'Add Vehicle'}</span>
              )}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Image Modal - Render outside the modal container */}
      <ImageModal
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        images={formData.images}
        currentIndex={currentImageIndex}
        onNavigate={setCurrentImageIndex}
        title={`${formData.make} ${formData.model} Images`}
      />
    </motion.div>
  );
} 