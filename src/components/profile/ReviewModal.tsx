import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Circle, Send } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { User, Trade } from '../../types/index.ts';

interface ReviewModalProps {
  trade: Trade;
  revieweeUser: User;
  onClose: () => void;
}

export function ReviewModal({ trade, revieweeUser, onClose }: ReviewModalProps) {
  const { state, submitReview } = useApp();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.currentUser) return;

    setLoading(true);
    try {
      await submitReview({
        reviewerId: state.currentUser.id,
        revieweeId: revieweeUser.id,
        tradeId: trade.id,
        rating,
        comment: comment.trim() || undefined
      });
      onClose();
    } catch (error) {
      console.error('Error submitting review:', error);
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
        className="glass-effect rounded-2xl p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-primary-100">Leave a Review</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-primary-800/50 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-primary-300" />
          </button>
        </div>

        <div className="mb-4">
          <div className="flex items-center space-x-3 mb-2">
            {revieweeUser.avatar ? (
              <img
                src={revieweeUser.avatar}
                alt={revieweeUser.username}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                <span className="text-primary-100 font-medium">
                  {revieweeUser.username[0].toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <p className="text-primary-100 font-medium">@{revieweeUser.username}</p>
              <p className="text-primary-400 text-sm">Trade completed successfully</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary-200 mb-2">
              Rating
            </label>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className={`p-1 transition-colors ${
                    value <= rating ? 'text-blue-400' : 'text-primary-600'
                  }`}
                >
                  <Circle className={`w-6 h-6 ${value <= rating ? 'fill-current' : ''}`} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-200 mb-2">
              Comment <span className="text-primary-400 text-xs">(optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience with this trade..."
              className="input-field min-h-[100px] resize-none"
            />
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-primary flex items-center justify-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Submitting...' : 'Submit Review'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
} 