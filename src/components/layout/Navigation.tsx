import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, ArrowLeftRight, MessageCircle, User, LogOut, Menu, X, List, Gavel } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { NavigationTab } from '../../types/index.ts';

interface NavigationProps {
  isMobile: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onHoverChange?: (isHovered: boolean) => void;
}

export function Navigation({ isMobile, isOpen, onToggle, onHoverChange }: NavigationProps) {
  const { activeTab, setActiveTab, logout, state, loadMessagesOnTabSwitch } = useApp();
  const [isHovered, setIsHovered] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };
  }, [hoverTimeout]);

  const navItems: Array<{ tab: NavigationTab; icon: React.ReactNode; label: string; badge?: number }> = [
    {
      tab: 'garage',
      icon: <Car className="w-5 h-5" />,
      label: 'Garage',
    },
    {
      tab: 'listings',
      icon: <List className="w-5 h-5" />,
      label: 'Listings',
    },
    {
      tab: 'auctions',
      icon: <Gavel className="w-5 h-5" />,
      label: 'Auctions',
    },
    {
      tab: 'trades',
      icon: <ArrowLeftRight className="w-5 h-5" />,
      label: 'Trades',
      badge: state.trades.filter(t => {
        // Only count inbound pending trades + all pending_acceptance trades
        // Exclude cancelled, completed, and declined trades from count
        const receiverId = typeof t.receiverUserId === 'string' 
          ? t.receiverUserId 
          : (t.receiverUserId as any)?._id || (t.receiverUserId as any)?.id;
        const offererId = typeof t.offererUserId === 'string' 
          ? t.offererUserId 
          : (t.offererUserId as any)?._id || (t.offererUserId as any)?.id;
        
        const isReceiver = receiverId === state.currentUser?.id;
        const isOfferer = offererId === state.currentUser?.id;
        
        // Count inbound pending trades (you received an offer)
        const isInboundPending = isReceiver && t.status === 'pending';
        
        // Count pending_acceptance trades (both parties involved, trade is moving to completion)
        const isPendingAcceptance = (isReceiver || isOfferer) && (t.status === 'pending_acceptance' || t.status === 'accepted');
        
        return isInboundPending || isPendingAcceptance;
      }).length || undefined,
    },
    {
      tab: 'messages',
      icon: <MessageCircle className="w-5 h-5" />,
      label: 'Messages',
      badge: state.messages.filter(msg => 
        msg.receiverId === state.currentUser?.id && !msg.read
      ).length || undefined,
    },
  ];

  const handleTabClick = async (tab: NavigationTab) => {
    // Set the tab immediately for instant response
    setActiveTab(tab);
    
    // Load messages in background for messages tab (non-blocking)
    if (tab === 'messages') {
      // Don't await - let it load in background
      loadMessagesOnTabSwitch().catch(error => {
        console.error('Error loading messages:', error);
      });
    }
    
    if (isMobile) {
      onToggle();
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    setShowLogoutConfirm(false);
    if (isMobile) {
      onToggle();
    }
  };

  const handleMouseEnter = () => {
    // Clear any pending leave timeout
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    
    if (!isHovered) {
      setIsHovered(true);
      onHoverChange?.(true);
    }
  };

  const handleMouseLeave = () => {
    // Add a small delay before collapsing to prevent flicker
    const timeout = setTimeout(() => {
      setIsHovered(false);
      onHoverChange?.(false);
      setHoverTimeout(null);
    }, 150); // 150ms delay
    
    setHoverTimeout(timeout);
  };

  const isCollapsed = !isMobile && !isHovered;

  if (isMobile) {
    return (
      <>
        {/* Mobile Navigation Toggle */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onToggle}
          className="fixed top-4 left-4 z-50 p-3 bg-primary-500 text-white rounded-full shadow-lg lg:hidden"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </motion.button>

        {/* Mobile Navigation Overlay */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onToggle}
          />
        )}

        {/* Mobile Navigation Sidebar */}
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: isOpen ? 0 : '-100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed left-0 top-0 h-full w-72 glass-effect shadow-xl z-40 lg:hidden"
        >
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-8 mt-12">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center">
                <Car className="w-6 h-6 text-primary-900" />
              </div>
              <div>
                <h2 className="font-bold text-xl text-primary-100">Drivora</h2>
                <p className="text-sm text-primary-300">Vehicle Trading</p>
              </div>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => (
                <motion.button
                  key={item.tab}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleTabClick(item.tab)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                    activeTab === item.tab
                      ? 'bg-primary-100/10 text-primary-100 border-l-4 border-primary-100'
                      : 'text-primary-300 hover:bg-primary-800/30 hover:text-primary-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {item.icon}
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {item.badge && item.badge > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </motion.button>
              ))}
            </nav>

            <div className="mt-8 pt-4 border-t border-primary-700/30">
              <motion.button
                animate={{ 
                  width: isCollapsed ? 48 : '100%',
                  justifyContent: isCollapsed ? 'center' : 'flex-start'
                }}
                transition={{ 
                  width: { duration: 0.2, ease: "easeOut" },
                  justifyContent: { duration: 0.2, ease: "easeOut" }
                }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleTabClick('profile')}
                className={`h-12 flex items-center transition-colors mb-3 rounded-lg ${
                  isCollapsed ? 'mx-auto justify-center' : 'px-3'
                } ${
                  activeTab === 'profile'
                    ? `bg-primary-100/10 text-primary-100 shadow-sm ${!isCollapsed ? 'border-l-4 border-primary-100' : ''}`
                    : 'text-primary-300 hover:bg-primary-800/30 hover:text-primary-100'
                }`}
                title={isCollapsed ? `@${state.currentUser?.username} - Profile` : undefined}
              >
                {isCollapsed ? (
                  /* Collapsed state - only profile icon, perfectly centered */
                  <div className="w-8 h-8 bg-primary-800/50 rounded-full flex items-center justify-center overflow-hidden">
                    {state.currentUser?.avatar ? (
                      <img
                        src={state.currentUser.avatar}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-primary-300" />
                    )}
                  </div>
                ) : (
                  /* Expanded state - icon + content */
                  <>
                    {/* Fixed profile icon */}
                    <div className="flex justify-center items-center flex-shrink-0 w-8">
                      <div className="w-8 h-8 bg-primary-800/50 rounded-full flex items-center justify-center overflow-hidden">
                        {state.currentUser?.avatar ? (
                          <img
                            src={state.currentUser.avatar}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5 text-primary-300" />
                        )}
                      </div>
                    </div>
                    
                    {/* Expandable profile info */}
                    <div className="flex-1 overflow-hidden text-left whitespace-nowrap ml-2">
                      <p className="font-medium text-primary-100 truncate">@{state.currentUser?.username}</p>
                      <p className="text-sm text-primary-400 truncate">Profile</p>
                    </div>
                  </>
                )}
              </motion.button>

              <motion.button
                animate={{ 
                  width: isCollapsed ? 48 : '100%'
                }}
                transition={{ 
                  width: { duration: 0.2, ease: "easeOut" }
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleLogout}
                className={`h-12 flex items-center text-red-400 hover:bg-red-500/10 transition-colors rounded-lg ${
                  isCollapsed ? 'mx-auto justify-center' : 'px-3 justify-start'
                }`}
                title={isCollapsed ? 'Logout' : undefined}
              >
                {isCollapsed ? (
                  /* Collapsed state - only logout icon, perfectly centered */
                  <LogOut className="w-5 h-5" />
                ) : (
                  /* Expanded state - icon + content */
                  <>
                    {/* Fixed logout icon */}
                    <div className="flex justify-center items-center flex-shrink-0 w-8">
                      <LogOut className="w-5 h-5" />
                    </div>
                    
                    {/* Expandable logout text */}
                    <div className="flex-1 overflow-hidden text-left whitespace-nowrap ml-2">
                      <span className="font-medium">Logout</span>
                    </div>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </>
    );
  }

  // Desktop Navigation
  return (
    <>
      {/* Hover detection area - extends to the right for better detection */}
      <div
        className="fixed left-0 top-0 h-full z-30 hidden lg:block"
        style={{ width: isCollapsed ? '96px' : '304px' }} // 16px buffer on right side only
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Invisible buffer area for better hover detection */}
        <div className="absolute inset-0 bg-transparent" />
        
        {/* Background that expands - flush with left edge */}
        <motion.div
          animate={{ width: isCollapsed ? 80 : 288 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="h-full glass-effect shadow-xl relative z-10" // No margin - flush with screen edge
        />
        
        {/* Content with fixed icon positions - flush with left edge */}
        <div className="absolute top-0 left-0 h-full flex flex-col z-20" style={{ width: isCollapsed ? 80 : 288 }}>
          {/* Logo Section */}
          <div className="h-20 flex items-center px-6">
            {/* Fixed logo position - centered when collapsed */}
            <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : ''}`}>
              <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center flex-shrink-0">
                <Car className="w-6 h-6 text-primary-900" />
              </div>
              {/* Expandable text */}
              <div className="overflow-hidden">
                <motion.div
                  animate={{ 
                    width: isCollapsed ? 0 : 'auto',
                    opacity: isCollapsed ? 0 : 1,
                    marginLeft: isCollapsed ? 0 : 12
                  }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="whitespace-nowrap"
                >
                  <h2 className="font-bold text-xl text-primary-100">Drivora</h2>
                  <p className="text-sm text-primary-300">Vehicle Trading</p>
                </motion.div>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className={`space-y-2 flex-1 ${isCollapsed ? 'px-4' : 'px-6'}`}>
            {navItems.map((item, index) => (
              <motion.button
                key={item.tab}
                initial={{ x: -20, opacity: 0 }}
                animate={{ 
                  x: 0, 
                  opacity: 1,
                  width: isCollapsed ? 48 : '100%'
                }}
                transition={{ 
                  delay: index * 0.03,
                  width: { duration: 0.2, ease: "easeOut" }
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleTabClick(item.tab)}
                className={`h-12 flex items-center justify-center transition-all duration-200 rounded-lg ${
                  isCollapsed ? 'mx-auto' : 'px-3 justify-start'
                } ${
                  activeTab === item.tab
                    ? `bg-primary-100/10 text-primary-100 shadow-sm ${!isCollapsed ? 'border-l-4 border-primary-100' : ''}`
                    : 'text-primary-300 hover:bg-primary-800/30 hover:text-primary-100 hover:shadow-sm'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                {isCollapsed ? (
                  /* Collapsed state - only icon, perfectly centered */
                  <>{item.icon}</>
                ) : (
                  /* Expanded state - icon + content */
                  <>
                    {/* Fixed icon container */}
                    <div className="flex justify-center items-center flex-shrink-0 w-8">
                      {item.icon}
                    </div>
                    
                    {/* Expandable content */}
                    <div className="flex items-center justify-between flex-1 overflow-hidden ml-2">
                      <span className="font-medium whitespace-nowrap">
                        {item.label}
                      </span>
                      
                      {item.badge && item.badge > 0 && (
                        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center animate-bounce-subtle flex-shrink-0 ml-2">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </motion.button>
            ))}
          </nav>

          {/* Profile and Logout Section */}
          <div className={`pt-4 border-t border-primary-700/30 pb-6 ${isCollapsed ? 'px-4' : 'px-6'}`}>
            <motion.button
              animate={{ 
                width: isCollapsed ? 48 : '100%'
              }}
              transition={{ 
                width: { duration: 0.2, ease: "easeOut" }
              }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleTabClick('profile')}
              className={`h-12 flex items-center justify-center transition-colors mb-3 rounded-lg ${
                isCollapsed ? 'mx-auto' : 'px-3 justify-start'
              } ${
                activeTab === 'profile'
                  ? `bg-primary-100/10 text-primary-100 shadow-sm ${!isCollapsed ? 'border-l-4 border-primary-100' : ''}`
                  : 'text-primary-300 hover:bg-primary-800/30 hover:text-primary-100'
              }`}
              title={isCollapsed ? `@${state.currentUser?.username} - Profile` : undefined}
            >
              {isCollapsed ? (
                /* Collapsed state - only profile icon, perfectly centered */
                <div className="w-8 h-8 bg-primary-800/50 rounded-full flex items-center justify-center overflow-hidden">
                  {state.currentUser?.avatar ? (
                    <img
                      src={state.currentUser.avatar}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-primary-300" />
                  )}
                </div>
              ) : (
                /* Expanded state - icon + content */
                <>
                  {/* Fixed profile icon */}
                  <div className="flex justify-center items-center flex-shrink-0 w-8">
                    <div className="w-8 h-8 bg-primary-800/50 rounded-full flex items-center justify-center overflow-hidden">
                      {state.currentUser?.avatar ? (
                        <img
                          src={state.currentUser.avatar}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-primary-300" />
                      )}
                    </div>
                  </div>
                  
                  {/* Expandable profile info */}
                  <div className="flex-1 overflow-hidden text-left whitespace-nowrap ml-2">
                    <p className="font-medium text-primary-100 truncate">@{state.currentUser?.username}</p>
                    <p className="text-sm text-primary-400 truncate">Profile</p>
                  </div>
                </>
              )}
            </motion.button>

            <motion.button
              animate={{ 
                width: isCollapsed ? 48 : '100%'
              }}
              transition={{ 
                width: { duration: 0.2, ease: "easeOut" }
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLogout}
              className={`h-12 flex items-center text-red-400 hover:bg-red-500/10 transition-colors rounded-lg ${
                isCollapsed ? 'mx-auto justify-center' : 'px-3 justify-start'
              }`}
              title={isCollapsed ? 'Logout' : undefined}
            >
              {isCollapsed ? (
                /* Collapsed state - only logout icon, perfectly centered */
                <LogOut className="w-5 h-5" />
              ) : (
                /* Expanded state - icon + content */
                <>
                  {/* Fixed logout icon */}
                  <div className="flex justify-center items-center flex-shrink-0 w-8">
                    <LogOut className="w-5 h-5" />
                  </div>
                  
                  {/* Expandable logout text */}
                  <div className="flex-1 overflow-hidden text-left whitespace-nowrap ml-2">
                    <span className="font-medium">Logout</span>
                  </div>
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass-effect rounded-xl p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-primary-100 mb-2">Logout Confirmation</h3>
              <p className="text-primary-300 mb-6">
                Are you sure you want to logout? You'll need to sign in again to access your account.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg px-4 py-2 font-medium transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
} 
 
 