import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from './context/AppContext.tsx';
import { Navigation } from './components/layout/Navigation.tsx';
import { SmartAuthForm } from './components/auth/SmartAuthForm.tsx';
import { GarageView } from './components/garage/GarageView.tsx';
import { ListingsView } from './components/listings/ListingsView.tsx';
import { AuctionsView } from './components/auctions/AuctionsView.tsx';
import { TradesView } from './components/trades/TradesView.tsx';
import { MessagesView } from './components/messages/MessagesView.tsx';
import { ProfileView } from './components/profile/ProfileView.tsx';
import { NotificationContainer } from './components/common/NotificationContainer.tsx';
import { UserSearchView } from './components/users/UserSearchView.tsx';

function AppContent() {
  const { state, activeTab, setActiveTab, loadAllListings } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNavHovered, setIsNavHovered] = useState(false);

  // Check if mobile view
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!state.isAuthenticated) {
    return <SmartAuthForm />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'garage':
        return <GarageView />;
      case 'listings':
        return <ListingsView />;
      case 'auctions':
        return <AuctionsView />;
      case 'trades':
        return <TradesView />;
      case 'messages':
        return <MessagesView />;
      case 'profile':
        return <ProfileView />;
      case 'users':
        return <UserSearchView />;
      default:
        return <GarageView />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-900 via-background-800 to-background-900">
      <Navigation
        isMobile={isMobile}
        isOpen={isMobileMenuOpen}
        onToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onHoverChange={setIsNavHovered}
      />
      
      <motion.main 
        className="transition-all duration-200 min-h-screen"
        style={{
          marginLeft: isMobile ? '0' : (isNavHovered ? '288px' : '80px'),
        }}
      >
        {activeTab === 'messages' ? (
          // Messages view takes full height without padding
          <div className="h-screen">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.1 }}
                className="h-full"
              >
                <MessagesView />
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          // Other views have normal padding
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.1 }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </motion.main>
      
      {/* Global notification container */}
      <NotificationContainer />
    </div>
  );
}

function App() {
  return <AppContent />;
}

export default App; 