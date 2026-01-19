// src/components/SalesLayout.tsx
import React, { useState } from 'react';
import SalesNavigation from './SalesNavigation';
import ToastContainer from './ToastContainer';
import { useToast } from '../hooks/useToast';
import Header from './Header';
import NotificationPanel from './NotificationPanel';

interface SalesLayoutProps {
  children: React.ReactNode;
}

function SalesLayout({ children }: SalesLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { toasts, removeToast } = useToast();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sales Sidebar */}
      <SalesNavigation 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      
      {/* Main Content */}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        sidebarCollapsed ? 'ml-16' : 'ml-64'
      }`}>
        <Header
                onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
                onToggleNotifications={() => setShowNotifications(!showNotifications)}
                showNotifications={showNotifications}
                // Provide placeholder functions for props not used by sellers
                onOpenSearch={() => {}}
                onToggleTheme={() => {}}
                theme={'light'}
            />
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </div>

      <NotificationPanel 
            isOpen={showNotifications} 
            onClose={() => setShowNotifications(false)} 
        />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default SalesLayout;