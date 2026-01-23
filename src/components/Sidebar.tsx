import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePrefetch, type PrefetchRoute } from '../hooks/usePrefetch';
import {
  Zap,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  User,
  Settings,
  HelpCircle
} from 'lucide-react';
import { navigation } from '../config/navigation';
import { getOrganisation } from '../lib/database';

// Map navigation hrefs to prefetch routes
const PREFETCH_MAP: Record<string, PrefetchRoute> = {
  '/app/orders': 'orders',
  '/app/Orderhantering': 'orders',
  '/app/leads': 'leads',
  '/app/offerter': 'quotes',
  '/app/fakturor': 'invoices',
  '/app/kunder': 'customers',
  '/app/team': 'teams',
};

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface TooltipState {
  visible: boolean;
  content: string;
  top: number;
}

const isActiveRoute = (currentPath: string, itemHref: string): boolean => {
  if (itemHref === '/') {
    return currentPath === '/';
  }
  return currentPath === itemHref || currentPath.startsWith(itemHref + '/');
};

function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { signOut, user, organisationId } = useAuth();
  const { prefetch } = usePrefetch();
  const [organisationName, setOrganisationName] = useState<string>('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, content: '', top: 0 });

  React.useEffect(() => {
    async function loadOrganisation() {
      if (organisationId) {
        const { data } = await getOrganisation(organisationId);
        if (data) setOrganisationName(data.name);
      }
    }
    loadOrganisation();
  }, [organisationId]);

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>, content: string, href?: string) => {
    if (!collapsed) {
      // Still prefetch even when not collapsed
      if (href && PREFETCH_MAP[href]) {
        prefetch(PREFETCH_MAP[href]);
      }
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ visible: true, content, top: rect.top + rect.height / 2 });

    // Prefetch data for hovered route
    if (href && PREFETCH_MAP[href]) {
      prefetch(PREFETCH_MAP[href]);
    }
  };

  const handleMouseLeave = () => {
    setTooltip({ visible: false, content: '', top: 0 });
  };

  return (
    <>
      {/* Dark Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full bg-zinc-900 z-30 flex flex-col transition-all duration-300 ease-in-out ${collapsed ? 'w-[72px]' : 'w-64'
          }`}
      >
        {/* Header - Logo & Toggle */}
        <div className={`flex items-center h-16 px-4 border-b border-zinc-800 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <Link to="/app" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center group-hover:bg-cyan-400 transition-colors">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-semibold text-white tracking-tight">Momentum</span>
            </Link>
          )}
          {collapsed && (
            <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
          )}
          {!collapsed && (
            <button
              onClick={onToggle}
              className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Collapsed toggle button */}
        {collapsed && (
          <button
            onClick={onToggle}
            className="absolute -right-3 top-20 w-6 h-6 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors z-50"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700" onMouseLeave={handleMouseLeave}>
          {navigation.map((item) => {
            const Icon = item.icon;
            const isMenuOpen = openMenu === item.name;

            // Submenu items
            if (item.submenu) {
              const hasActiveChild = item.submenu.some(sub => isActiveRoute(location.pathname, sub.href));
              return (
                <div key={item.name}>
                  <button
                    onClick={() => setOpenMenu(isMenuOpen ? null : item.name)}
                    onMouseEnter={(e) => handleMouseEnter(e, item.name)}
                    className={`w-full flex items-center justify-between py-2.5 px-3 text-sm font-medium rounded-lg transition-all duration-200 ${isMenuOpen || hasActiveChild
                      ? 'text-white bg-zinc-800'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                      }`}
                  >
                    <div className="flex items-center">
                      <Icon className={`h-5 w-5 ${isMenuOpen || hasActiveChild ? 'text-cyan-400' : ''} ${collapsed ? '' : 'mr-3'}`} />
                      {!collapsed && <span>{item.name}</span>}
                    </div>
                    {!collapsed && (
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
                    )}
                  </button>
                  {!collapsed && isMenuOpen && (
                    <div className="mt-1 ml-5 pl-3 border-l border-zinc-700 space-y-1">
                      {item.submenu.map((subItem) => {
                        const isSubActive = isActiveRoute(location.pathname, subItem.href);
                        return (
                          <Link
                            key={subItem.name}
                            to={subItem.href}
                            className={`block px-3 py-2 text-sm rounded-lg transition-all ${isSubActive
                              ? 'text-cyan-400 bg-zinc-800'
                              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                              }`}
                          >
                            {subItem.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Regular nav items
            const isActive = isActiveRoute(location.pathname, item.href);
            return (
              <div key={item.name} className="relative">
                <Link
                  to={item.href}
                  onMouseEnter={(e) => handleMouseEnter(e, item.name, item.href)}
                  className={`flex items-center py-2.5 px-3 text-sm font-medium rounded-lg transition-all duration-200 ${isActive
                    ? 'text-white bg-cyan-600'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    } ${collapsed ? 'justify-center' : ''}`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-white' : ''} ${collapsed ? '' : 'mr-3'}`} />
                  {!collapsed && (
                    <>
                      <span className="flex-1">{item.name}</span>
                      {item.shortcut && (
                        <span className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                          {item.shortcut}
                        </span>
                      )}
                    </>
                  )}
                </Link>
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan-400 rounded-r-full" />
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer - User Profile */}
        <div className="border-t border-zinc-800 p-3">
          {/* Help & Settings - only when expanded */}
          {!collapsed && (
            <div className="flex items-center gap-2 mb-3">
              <Link
                to="/app/installningar"
                className="flex-1 flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Inställningar</span>
              </Link>
              <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              onMouseEnter={(e) => handleMouseEnter(e, user?.email || 'Användare')}
              className={`w-full flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800 transition-colors ${collapsed ? 'justify-center' : ''}`}
            >
              <div className="w-9 h-9 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
              {!collapsed && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user?.email?.split('@')[0] || 'Användare'}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">
                    {organisationName || 'Organisation'}
                  </p>
                </div>
              )}
              {!collapsed && <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />}
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className={`absolute bottom-full mb-2 ${collapsed ? 'left-full ml-2' : 'left-0 right-0'} bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden z-50`}>
                {collapsed && (
                  <div className="px-4 py-3 border-b border-zinc-700">
                    <p className="text-sm font-medium text-white">{user?.email?.split('@')[0]}</p>
                    <p className="text-xs text-zinc-500">{organisationName}</p>
                  </div>
                )}
                <Link
                  to="/app/installningar"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Inställningar
                </Link>
                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-zinc-700 hover:text-red-300 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logga ut
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tooltip for collapsed state */}
      {collapsed && tooltip.visible && (
        <div
          className="fixed left-[80px] z-[60] pointer-events-none"
          style={{ top: tooltip.top, transform: 'translateY(-50%)' }}
        >
          <div className="relative bg-zinc-800 text-white text-sm px-3 py-2 rounded-lg shadow-xl border border-zinc-700 whitespace-nowrap">
            {tooltip.content}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-r-4 border-r-zinc-800" />
          </div>
        </div>
      )}

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div className="fixed inset-0 z-20" onClick={() => setShowUserMenu(false)} />
      )}
    </>
  );
}

export default Sidebar;