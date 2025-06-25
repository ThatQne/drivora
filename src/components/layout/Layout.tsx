import React, { useState, useEffect } from 'react';
import { Navigation } from './Navigation.tsx';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleNavToggle = () => {
    setIsNavOpen(!isNavOpen);
  };

  const handleNavToggleCollapse = () => {
    setIsNavCollapsed(!isNavCollapsed);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900">
      <Navigation
        isMobile={isMobile}
        isOpen={isNavOpen}
        onToggle={handleNavToggle}
        isCollapsed={isNavCollapsed}
        onToggleCollapse={handleNavToggleCollapse}
      />
      
      <main className={`transition-all duration-300 ${
        isMobile ? 'ml-0' : isNavCollapsed ? 'ml-20' : 'ml-72'
      } min-h-screen`}>
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
} 
 
 