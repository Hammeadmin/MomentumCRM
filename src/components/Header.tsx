import { useState } from 'react';
import {
  Search,
  Bell,
  Menu,
  Sun,
  Moon,
  Plus,
  Users,
  Package,
  FileText,
  Receipt,
  Target,
  MessageSquare
} from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { useGlobalAction } from '../contexts/GlobalActionContext';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenSearch: () => void;
  onToggleNotifications: () => void;
  onToggleChat: () => void;
  onToggleTheme: () => void;
  theme: 'light' | 'dark';
  showNotifications: boolean;
}

function Header({
  onToggleSidebar,
  onOpenSearch,
  onToggleNotifications,
  onToggleChat,
  onToggleTheme,
  theme,
  showNotifications
}: HeaderProps) {
  const { unreadCount } = useNotifications();
  const {
    openCreateLeadModal,
    openCreateOrderModal,
    openCreateCustomerModal,
    openCreateQuoteModal,
    openCreateInvoiceModal
  } = useGlobalAction();
  const [showQuickCreate, setShowQuickCreate] = useState(false);

  const quickCreateItems = [
    { icon: Target, label: 'Ny Lead', action: openCreateLeadModal, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { icon: Package, label: 'Ny Order', action: openCreateOrderModal, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { icon: Users, label: 'Ny Kund', action: openCreateCustomerModal, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { icon: FileText, label: 'Ny Offert', action: openCreateQuoteModal, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { icon: Receipt, label: 'Ny Faktura', action: openCreateInvoiceModal, color: 'text-red-500', bg: 'bg-red-500/10' },
  ];

  return (
    <header className="h-14 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 lg:px-6">
      {/* Left Section */}
      <div className="flex items-center gap-3">
        {/* Mobile Menu Button */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search Bar */}
        <button
          onClick={onOpenSearch}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors min-w-[240px] group"
        >
          <Search className="w-4 h-4" />
          <span className="text-sm">Sök...</span>
          <kbd className="ml-auto text-xs text-zinc-400 bg-white dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
            ⌘K
          </kbd>
        </button>

        {/* Mobile Search */}
        <button
          onClick={onOpenSearch}
          className="sm:hidden p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-1">
        {/* Quick Create */}
        <div className="relative">
          <button
            onClick={() => setShowQuickCreate(!showQuickCreate)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${showQuickCreate
              ? 'bg-cyan-500 text-white'
              : 'bg-cyan-500 text-white hover:bg-cyan-600'
              }`}
          >
            <Plus className={`w-4 h-4 transition-transform ${showQuickCreate ? 'rotate-45' : ''}`} />
            <span className="hidden sm:inline">Skapa</span>
          </button>

          {showQuickCreate && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowQuickCreate(false)} />
              <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-20 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                {quickCreateItems.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      setShowQuickCreate(false);
                      item.action();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors"
                  >
                    <div className={`w-7 h-7 rounded-lg ${item.bg} flex items-center justify-center`}>
                      <item.icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Chat Button */}
        <button
          onClick={onToggleChat}
          className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors relative"
          title="Chatt"
        >
          <MessageSquare className="w-5 h-5" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title={theme === 'light' ? 'Mörkt tema' : 'Ljust tema'}
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <button
          onClick={onToggleNotifications}
          className={`p-2 rounded-lg transition-colors relative ${showNotifications
            ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600'
            : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          title="Notifieringar"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

export default Header;