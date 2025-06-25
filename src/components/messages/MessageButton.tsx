import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { User } from '../../types/index.ts';
import { MessageStarter } from './MessageStarter.tsx';

interface MessageButtonProps {
  targetUser: User;
  variant?: 'primary' | 'secondary' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  tradeId?: string;
  listingId?: string;
  initialMessage?: string;
  className?: string;
}

export function MessageButton({ 
  targetUser, 
  variant = 'primary',
  size = 'md',
  tradeId,
  listingId,
  initialMessage,
  className = ''
}: MessageButtonProps) {
  const [showMessageStarter, setShowMessageStarter] = useState(false);

  const getButtonClasses = () => {
    const baseClasses = 'flex items-center justify-center gap-2 transition-colors';
    
    const sizeClasses = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2',
      lg: 'px-6 py-3 text-lg'
    };

    const variantClasses = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      icon: 'p-2 hover:bg-primary-800/50 rounded-full text-primary-300 hover:text-primary-100'
    };

    return `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm': return 'w-4 h-4';
      case 'lg': return 'w-6 h-6';
      default: return 'w-5 h-5';
    }
  };

  return (
    <>
      <button
        onClick={() => setShowMessageStarter(true)}
        className={getButtonClasses()}
        title={variant === 'icon' ? `Message @${targetUser.username}` : undefined}
      >
        <MessageCircle className={getIconSize()} />
        {variant !== 'icon' && (
          <span>
            {variant === 'primary' ? `Message @${targetUser.username}` : 'Message'}
          </span>
        )}
      </button>

      <AnimatePresence>
        {showMessageStarter && (
          <MessageStarter
            targetUser={targetUser}
            tradeId={tradeId}
            listingId={listingId}
            initialMessage={initialMessage}
            onClose={() => setShowMessageStarter(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
} 
 
 