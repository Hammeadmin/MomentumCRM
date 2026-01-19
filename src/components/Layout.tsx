import React, { useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileBottomNav from './MobileBottomNav';
import ToastContainer from './ToastContainer';
import SearchModal from './SearchModal';
import NotificationPanel from './NotificationPanel';
import ChatOverlay from './chat/ChatOverlay';
import UserGuide from './UserGuide';
import KeyboardShortcuts from './KeyboardShortcuts';
import FAQ from './FAQ';
import ErrorBoundary from './ErrorBoundary';
import Breadcrumbs from './ui/Breadcrumbs';
import { useToast } from '../hooks/useToast';
import { useNotifications } from '../hooks/useNotifications';
import { useLayoutState } from '../hooks/useLayoutState';

interface LayoutProps {
  children: React.ReactNode;
}

function Layout({ children }: LayoutProps) {
  // Use the extracted layout state hook
  const { sidebar, theme, modals, actions } = useLayoutState();

  const { toasts, removeToast } = useToast();
  const { error: notificationError, clearError, renderToastNotifications } = useNotifications();

  // Show notification errors as toasts
  useEffect(() => {
    if (notificationError) {
      const toastId = Math.random().toString(36).substr(2, 9);

      setTimeout(() => {
        clearError();
        removeToast(toastId);
      }, 5000);
    }
  }, [notificationError, clearError, removeToast]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          collapsed={sidebar.collapsed}
          onToggle={sidebar.toggle}
        />
      </div>

      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidebar.collapsed ? 'lg:ml-[72px]' : 'lg:ml-64'
        }`}>
        {/* Header */}
        <Header
          onToggleSidebar={sidebar.toggle}
          onOpenSearch={actions.openSearch}
          onToggleNotifications={actions.toggleNotifications}
          onToggleChat={actions.toggleChat}
          onToggleTheme={theme.toggle}
          theme={theme.current}
          showNotifications={modals.notifications}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background">
          <ErrorBoundary>
            <div className="p-4 lg:p-6 pb-20 lg:pb-6">
              {/* Auto-generated Breadcrumbs */}
              <div className="mb-4">
                <Breadcrumbs showHome={true} />
              </div>
              {children}
            </div>
          </ErrorBoundary>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden">
        <MobileBottomNav />
      </div>

      {/* Modals and Overlays */}
      <SearchModal
        isOpen={modals.search}
        onClose={actions.closeSearch}
      />

      <NotificationPanel
        isOpen={modals.notifications}
        onClose={actions.closeNotifications}
      />

      <ChatOverlay
        isOpen={modals.chat}
        onClose={actions.closeChat}
      />

      <UserGuide
        isOpen={modals.guide}
        onClose={actions.closeGuide}
      />

      <KeyboardShortcuts
        isOpen={modals.shortcuts}
        onClose={actions.closeShortcuts}
      />

      <FAQ
        isOpen={modals.faq}
        onClose={actions.closeFAQ}
      />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Real-time Notification Toasts */}
      {renderToastNotifications()}
    </div>
  );
}

export default Layout;