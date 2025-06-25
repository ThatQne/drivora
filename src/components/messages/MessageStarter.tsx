import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Send, X } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { User } from '../../types/index.ts';

interface MessageStarterProps {
  targetUser: User;
  onClose: () => void;
  tradeId?: string;
  listingId?: string;
  initialMessage?: string;
}

export function MessageStarter({ 
  targetUser, 
  onClose, 
  tradeId, 
  listingId, 
  initialMessage = '' 
}: MessageStarterProps) {
  const { sendMessage, setActiveTab, state } = useApp();
  const [messageText, setMessageText] = useState(initialMessage);
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!messageText.trim() || loading || !state.currentUser) return;

    setLoading(true);
    try {
      await sendMessage({
        senderId: state.currentUser.id,
        receiverId: targetUser.id,
        content: messageText.trim(),
        tradeId,
        listingId
      });
      
      // Navigate to messages tab
      setActiveTab('messages');
      onClose();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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
        className="glass-effect rounded-2xl w-full max-w-md"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-primary-700/30">
          <div className="flex items-center space-x-3">
            <MessageCircle className="w-6 h-6 text-blue-400" />
            <div>
              <h2 className="text-lg font-bold text-primary-100">Send Message</h2>
              <p className="text-sm text-primary-300">to @{targetUser.username}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-primary-800/50 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-primary-300" />
          </button>
        </div>

        {/* Message Input */}
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary-200 mb-2">
                Message
              </label>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message here..."
                className="input-field h-32 resize-none"
                disabled={loading}
                autoFocus
              />
            </div>

            {/* Context Info */}
            {(tradeId || listingId) && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-sm text-blue-300">
                  {tradeId && '🔄 This message is related to a trade'}
                  {listingId && '🚗 This message is related to a listing'}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="btn-secondary flex-1"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!messageText.trim() || loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
} 
 
 