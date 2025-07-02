import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../context/AppContext.tsx';
import { User } from '../../types/index.ts';
import { Search, User as UserIcon, Star, MessageSquare, Wind } from 'lucide-react';
import { SellerProfileView } from '../profile/SellerProfileView.tsx';

export function UserSearchView() {
  const { state, searchUsers } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // When search term changes, run this effect
    if (searchTerm.length > 0 && searchTerm.length < 2) {
      // Don't search, but don't clear results immediately to allow typing
      return;
    }
    
    // Immediately set loading state when user starts typing a valid search
    if (searchTerm.length >= 2) {
      setIsLoading(true);
    }

    const delayDebounceFn = setTimeout(() => {
      searchUsers(searchTerm).finally(() => {
        setIsLoading(false);
      });
    }, 300); // 300ms delay for debouncing

    // Cleanup function to cancel the timeout if user keeps typing
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, searchUsers]);

  // Effect to clear users when the component unmounts
  useEffect(() => {
    return () => {
      searchUsers('');
    };
  }, [searchUsers]);
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
  };

  if (selectedUser) {
    return (
      <SellerProfileView
        sellerId={selectedUser.id}
        onBack={() => setSelectedUser(null)}
        source="userSearch"
      />
    );
  }

  const renderContent = () => {
    if (isLoading) {
      return <div className="text-center text-primary-300">Searching...</div>;
    }

    if (searchTerm.length < 2) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <Wind className="w-16 h-16 text-primary-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-primary-200">Ready to search</h3>
          <p className="text-primary-400">
            Enter at least 2 characters in the search bar above to find users.
          </p>
        </motion.div>
      );
    }

    if (state.users.length > 0) {
      return (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {state.users.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              onClick={() => handleUserClick(user)}
              className="glass-effect p-4 rounded-xl cursor-pointer hover:bg-primary-800/60 transition-colors group"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-2 border-primary-700 group-hover:border-blue-500 transition-colors">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary-800/50 flex items-center justify-center">
                      <UserIcon className="w-12 h-12 text-primary-400" />
                    </div>
                  )}
                </div>
                <h2 className="text-lg font-bold text-primary-100 group-hover:text-blue-300 transition-colors">@{user.username}</h2>
                {(user.firstName || user.lastName) && (
                  <p className="text-primary-300">{user.firstName} {user.lastName}</p>
                )}
                
                <div className="flex items-center space-x-4 mt-4 text-sm text-primary-400">
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span>{user.rating?.toFixed(1) || 'N/A'}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                    <span>{user.reviewCount || 0}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-16"
      >
        <Search className="w-16 h-16 text-primary-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-primary-200">No users found</h3>
        <p className="text-primary-400">Try a different search term.</p>
      </motion.div>
    );
  };

  return (
    <div className="container mx-auto p-4 lg:p-6">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-primary-100 mb-2">User Directory</h1>
        <p className="text-primary-300 mb-6">Search for users by username, first name, or last name.</p>
        
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-400" />
          <input
            type="text"
            placeholder="Start typing to search for users (min. 2 chars)..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="input-field w-full pl-12 pr-4 py-3"
          />
        </div>
      </motion.div>

      {renderContent()}
    </div>
  );
} 