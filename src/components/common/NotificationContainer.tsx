import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../../context/AppContext.tsx';
import { NotificationItem } from './NotificationItem.tsx';
import { Notification } from '../../types/index.ts';

export function NotificationContainer() {
  const { state, removeNotification, setActiveTab } = useApp();

  const handleNotificationAction = (notification: Notification) => {
    // Handle different notification types
    switch (notification.type) {
      case 'message':
        // Navigate to messages tab
        setActiveTab('messages');
        // You could also implement logic to open the specific conversation
        // if the notification has conversation data
        break;
      case 'trade':
        setActiveTab('trades');
        break;
      default:
        // For other notification types, execute the custom onAction if available
        if (notification.onAction) {
          notification.onAction();
        }
        break;
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence mode="popLayout">
        {state.notifications.slice(0, 5).map((notification, index) => (
          <motion.div
            key={notification.id}
            layout
            initial={{ opacity: 0, y: -50, scale: 0.8 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              zIndex: state.notifications.length - index
            }}
            exit={{ opacity: 0, y: -50, scale: 0.8 }}
            transition={{ 
              type: 'spring', 
              stiffness: 300, 
              damping: 30,
              layout: { duration: 0.3 }
            }}
            className="pointer-events-auto"
            style={{
              transformOrigin: 'top right'
            }}
          >
            <NotificationItem
              notification={notification}
              onRemove={removeNotification}
              onAction={handleNotificationAction}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Show count if there are more than 5 notifications */}
      {state.notifications.length > 5 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="pointer-events-auto bg-primary-800/90 backdrop-blur-sm border border-primary-700/30 rounded-lg p-3 text-center"
        >
          <p className="text-sm text-primary-300">
            +{state.notifications.length - 5} more notifications
          </p>
        </motion.div>
      )}
    </div>
  );
} 