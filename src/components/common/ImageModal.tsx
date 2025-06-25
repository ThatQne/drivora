import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  currentIndex: number;
  onNavigate?: (index: number) => void;
  title?: string;
}

export const ImageModal: React.FC<ImageModalProps> = ({
  isOpen,
  onClose,
  images,
  currentIndex,
  onNavigate,
  title
}) => {
  const [imageLoading, setImageLoading] = useState(true);
  
  const currentImage = images[currentIndex];

  useEffect(() => {
    if (currentImage) {
      setImageLoading(true);
    }
  }, [currentImage]);

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) return;
    
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
      onNavigate?.(currentIndex - 1);
    } else if (e.key === 'ArrowRight' && currentIndex < images.length - 1) {
      onNavigate?.(currentIndex + 1);
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, images.length, onClose, onNavigate]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex flex-col"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        {/* Top Bar - Absolutely positioned elements */}
        <div className="absolute top-0 left-0 right-0 p-6 z-30">
          {/* Image Counter - Truly Centered */}
          <div className="flex justify-center">
            {images.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: 0.1 }}
                className="bg-black/60 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-full text-sm font-medium"
              >
                {currentIndex + 1} of {images.length}
              </motion.div>
            )}
          </div>

          {/* Close Button - Absolutely positioned top right */}
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ delay: 0.1 }}
            onClick={onClose}
            className="absolute top-6 right-6 w-12 h-12 bg-black/60 hover:bg-black/80 border border-white/20 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-md hover:scale-110"
          >
            <X className="w-6 h-6 text-white" />
          </motion.button>
        </div>

        {/* Main Image Container - Centered */}
        <div className="flex-1 flex items-center justify-center px-20 pb-6 pt-20">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            {/* Loading Spinner */}
            {imageLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
              </motion.div>
            )}

            <motion.img
              key={currentImage}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: imageLoading ? 0 : 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              src={currentImage}
              alt={`Image ${currentIndex + 1}`}
              onLoad={handleImageLoad}
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
              style={{ 
                maxWidth: 'calc(100vw - 10rem)', 
                maxHeight: 'calc(100vh - 16rem)',
                objectFit: 'contain'
              }}
            />
          </motion.div>
        </div>

        {/* Bottom Bar with Thumbnail Strip - Centered */}
        <div className="flex justify-center p-6 relative z-30">
          {images.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex space-x-3 bg-black/60 backdrop-blur-md border border-white/20 rounded-2xl p-4 max-w-screen-lg overflow-x-auto scrollbar-hide">
                {images.map((image, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate?.(index);
                    }}
                    className={`flex-shrink-0 w-16 h-16 rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                      index === currentIndex
                        ? 'border-blue-400 shadow-lg shadow-blue-400/50 ring-2 ring-blue-400/30'
                        : 'border-white/30 hover:border-white/60'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Subtle gradient overlay for better contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/20 pointer-events-none" />
      </motion.div>
    </AnimatePresence>
  );
}; 