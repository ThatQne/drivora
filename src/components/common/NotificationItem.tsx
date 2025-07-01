import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  MessageCircle, 
  ArrowLeftRight,
  Clock,
  Copy,
  Check
} from 'lucide-react';
import { Notification } from '../../types/index.ts';

interface NotificationItemProps {
  notification: Notification;
  onRemove: (id: string) => void;
  onAction?: (notification: Notification) => void;
}

export function NotificationItem({ notification, onRemove, onAction }: NotificationItemProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);
  const [errorCopied, setErrorCopied] = useState(false);

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-400" />;
      case 'message':
        return <MessageCircle className="w-5 h-5 text-purple-400" />;
      case 'trade':
        return <ArrowLeftRight className="w-5 h-5 text-orange-400" />;
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getColors = () => {
    switch (notification.type) {
      case 'success':
        return {
          bg: 'bg-green-500/10',
          border: 'border-green-500/30',
          accent: 'bg-green-500'
        };
      case 'error':
        return {
          bg: 'bg-red-500/10',
          border: 'border-red-500/30',
          accent: 'bg-red-500'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500/30',
          accent: 'bg-yellow-500'
        };
      case 'info':
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/30',
          accent: 'bg-blue-500'
        };
      case 'message':
        return {
          bg: 'bg-purple-500/10',
          border: 'border-purple-500/30',
          accent: 'bg-purple-500'
        };
      case 'trade':
        return {
          bg: 'bg-orange-500/10',
          border: 'border-orange-500/30',
          accent: 'bg-orange-500'
        };
      default:
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/30',
          accent: 'bg-blue-500'
        };
    }
  };

  const colors = getColors();

  // Progress bar animation for auto-dismissing notifications
  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev - (100 / (notification.duration! / 100));
          if (newProgress <= 0) {
            clearInterval(interval);
            return 0;
          }
          return newProgress;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [notification.duration]);

  const handleRemove = () => {
    setIsVisible(false);
    setTimeout(() => onRemove(notification.id), 300);
  };

  const handleAction = () => {
    if (notification.onAction) {
      notification.onAction();
    }
    if (onAction) {
      onAction(notification);
    }
  };

  const handleCopyError = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent notification from closing
    if (notification.type !== 'error') return;
    
    try {
      const errorText = `${notification.title}${notification.message ? '\n' + notification.message : ''}`;
      await navigator.clipboard.writeText(errorText);
      setErrorCopied(true);
      setTimeout(() => setErrorCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy error:', err);
    }
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent notification from closing
    handleAction();
  };

  const handleNotificationClick = () => {
    handleRemove();
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 300, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 300, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={`relative overflow-hidden rounded-lg border backdrop-blur-sm cursor-pointer ${colors.bg} ${colors.border} shadow-lg`}
          onClick={handleNotificationClick}
        >
          {/* Progress bar for auto-dismiss */}
          {notification.duration && notification.duration > 0 && (
            <div className="absolute top-0 left-0 h-1 bg-primary-700/30 w-full">
              <motion.div
                className={`h-full ${colors.accent}`}
                initial={{ width: '100%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1, ease: 'linear' }}
              />
            </div>
          )}

          <div className="p-4">
            <div className="flex items-start space-x-3">
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {getIcon()}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-primary-100 mb-1">
                      {notification.title}
                    </h4>
                    {notification.message && (
                      <p className="text-sm text-primary-300 leading-relaxed">
                        {notification.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center space-x-2 text-xs text-primary-400">
                    <Clock className="w-3 h-3" />
                    <span>{formatTimeAgo(notification.timestamp)}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Action button */}
                    {notification.actionLabel && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleActionClick}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${colors.accent} text-white hover:opacity-90`}
                      >
                        {notification.actionLabel}
                      </motion.button>
                    )}
                    
                    {/* Copy button for error notifications */}
                    {notification.type === 'error' && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCopyError}
                        className="p-1 hover:bg-primary-800/50 rounded transition-colors"
                        title="Copy error details"
                      >
                        {errorCopied ? (
                          <Check className="w-3 h-3 text-green-400" />
                        ) : (
                          <Copy className="w-3 h-3 text-primary-400" />
                        )}
                      </motion.button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 