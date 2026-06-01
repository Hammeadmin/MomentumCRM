import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePrefetch, type PrefetchRoute } from '../hooks/usePrefetch';
import { Zap, LogOut, Settings, ChevronDown, PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import { navigation } from '../config/navigation';
import { getOrganisation } from '../lib/database';

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

const isActiveRoute = (currentPath: string, itemHref: string): boolean => {
  if (itemHref === '/app') return currentPath === '/app';
  return currentPath === itemHref || currentPath.startsWith(itemHref + '/');
};

function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { signOut, user, organisationId } = useAuth();
  const { prefetch } = usePrefetch();
  const [organisationName, setOrganisationName] = useState<string>('');
  const [hovered, setHovered] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Sidebar is visually expanded when pinned open OR when hovering over the collapsed rail
  const isExpanded = !collapsed || hovered;

  React.useEffect(() => {
    async function loadOrg() {
      if (organisationId) {
        const { data } = await getOrganisation(organisationId);
        if (data) setOrganisationName(data.name);
      }
    }
    loadOrg();
  }, [organisationId]);

  return (
    <>
      <div
        className={`fixed left-0 top-0 h-full bg-zinc-900 z-30 flex flex-col transition-all duration-200 ease-in-out ${isExpanded ? 'w-[220px]' : 'w-[56px]'}`}
        onMouseEnter={() => collapsed && setHovered(true)}
        onMouseLeave={() => { setHovered(false); setShowUserMenu(false); }}
      >
        {/* Logo */}
        <div className="flex items-center h-14 px-3 border-b border-zinc-800 gap-3 overflow-hidden">
          <div className="w-7 h-7 bg-cyan-500 rounded-md flex items-center justify-center flex-shrink-0">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          {isExpanded && (
            <span className="text-sm font-semibold text-white tracking-tight whitespace-nowrap">Momentum</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-zinc-700">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = isActiveRoute(location.pathname, item.href);
            const isMenuOpen = openMenu === item.name;

            if (item.submenu) {
              const hasActiveChild = item.submenu.some(sub => isActiveRoute(location.pathname, sub.href));
              return (
                <div key={item.name}>
                  <button
                    onClick={() => isExpanded && setOpenMenu(isMenuOpen ? null : item.name)}
                    onMouseEnter={() => isExpanded && item.href && PREFETCH_MAP[item.href] && prefetch(PREFETCH_MAP[item.href])}
                    className={`relative w-full flex items-center h-9 px-3 gap-3 text-sm transition-colors duration-150 overflow-hidden ${
                      isMenuOpen || hasActiveChild
                        ? 'text-white'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                    }`}
                  >
                    {(isMenuOpen || hasActiveChild) && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-cyan-400 rounded-r-full" />
                    )}
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isMenuOpen || hasActiveChild ? 'text-cyan-400' : ''}`} />
                    {isExpanded && (
                      <>
                        <span className="flex-1 text-left whitespace-nowrap">{item.name}</span>
                        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-150 ${isMenuOpen ? 'rotate-180' : ''}`} />
                      </>
                    )}
                  </button>
                  {isExpanded && isMenuOpen && (
                    <div className="ml-10 border-l border-zinc-800 mb-1">
                      {item.submenu.map((sub) => {
                        const isSubActive = isActiveRoute(location.pathname, sub.href);
                        return (
                          <Link
                            key={sub.name}
                            to={sub.href}
                            className={`block px-3 py-1.5 text-xs transition-colors ${
                              isSubActive ? 'text-cyan-400' : 'text-zinc-500 hover:text-white'
                            }`}
                          >
                            {sub.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div key={item.name} className="relative">
                <Link
                  to={item.href}
                  onMouseEnter={() => item.href && PREFETCH_MAP[item.href] && prefetch(PREFETCH_MAP[item.href])}
                  title={!isExpanded ? item.name : undefined}
                  className={`flex items-center h-9 px-3 gap-3 text-sm transition-colors duration-150 overflow-hidden ${
                    isActive
                      ? 'text-white'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-cyan-400 rounded-r-full" />
                  )}
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-cyan-400' : ''}`} />
                  {isExpanded && (
                    <span className="whitespace-nowrap">{item.name}</span>
                  )}
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-zinc-800 p-2 flex flex-col gap-1">
          {/* Pin/collapse toggle */}
          <button
            onClick={onToggle}
            title={collapsed ? 'Fäst sidofältet' : 'Dölj sidofältet'}
            className="flex items-center h-9 px-3 gap-3 w-full rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800/60 transition-colors overflow-hidden"
          >
            {collapsed
              ? <PanelLeftOpen className="w-4 h-4 flex-shrink-0" />
              : <PanelLeftClose className="w-4 h-4 flex-shrink-0" />
            }
            {isExpanded && <span className="text-sm whitespace-nowrap">{collapsed ? 'Fäst' : 'Dölj'}</span>}
          </button>

          {/* Settings */}
          <Link
            to="/app/installningar"
            title={!isExpanded ? 'Inställningar' : undefined}
            className={`flex items-center h-9 px-3 gap-3 rounded-md text-sm transition-colors overflow-hidden ${
              isActiveRoute(location.pathname, '/app/installningar')
                ? 'text-cyan-400'
                : 'text-zinc-500 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            {isExpanded && <span className="whitespace-nowrap">Inställningar</span>}
          </Link>

          {/* User */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center h-9 px-2 gap-3 rounded-md hover:bg-zinc-800/60 transition-colors overflow-hidden"
            >
              <div className="w-6 h-6 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-md flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
                {(user?.email?.[0] || 'U').toUpperCase()}
              </div>
              {isExpanded && (
                <div className="flex-1 text-left min-w-0">
                  <p className="text-xs font-medium text-white truncate leading-none">{user?.email?.split('@')[0] || 'Användare'}</p>
                  <p className="text-xs text-zinc-500 truncate mt-0.5 leading-none">{organisationName || 'Organisation'}</p>
                </div>
              )}
            </button>

            {showUserMenu && (
              <div className="absolute bottom-full mb-2 left-0 right-0 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden z-50 min-w-[160px]">
                {collapsed && (
                  <div className="px-3 py-2 border-b border-zinc-700">
                    <p className="text-xs font-medium text-white">{user?.email?.split('@')[0]}</p>
                    <p className="text-xs text-zinc-500">{organisationName}</p>
                  </div>
                )}
                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-zinc-700 hover:text-red-300 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logga ut
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showUserMenu && (
        <div className="fixed inset-0 z-20" onClick={() => setShowUserMenu(false)} />
      )}
    </>
  );
}

export default Sidebar;
