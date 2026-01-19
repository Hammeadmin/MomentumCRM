/**
 * Centralized Navigation Configuration
 * Extracted from Sidebar.tsx for better maintainability
 */
import { LucideIcon } from 'lucide-react';
import {
    Home,
    Users,
    FileText,
    Package,
    Calendar,
    Receipt,
    Users2,
    Settings,
    BarChart3,
    MessageSquare,
    DollarSign,
    FolderOpen,
    TrainFrontTunnel,
    Newspaper,
    CreditCard
} from 'lucide-react';

export interface NavigationSubItem {
    name: string;
    href: string;
}

export interface NavigationItem {
    name: string;
    href: string;
    icon: LucideIcon;
    shortcut?: string;
    submenu?: NavigationSubItem[];
}

export const navigation: NavigationItem[] = [
    { name: 'Dashboard', href: '/app', icon: Home, shortcut: 'G+D' },
    { name: 'Säljtunnel', href: '/app/Säljtunnel', icon: TrainFrontTunnel, shortcut: 'G+O' },
    { name: 'Orderhantering', href: '/app/Orderhantering', icon: Package, shortcut: 'G+O' },
    { name: 'Kunder', href: '/app/kunder', icon: Users, shortcut: 'G+K' },
    { name: 'Offerter', href: '/app/offerter', icon: FileText, shortcut: 'G+F' },
    { name: 'Förfrågningar', href: '/app/leads', icon: Users, shortcut: 'G+L' },
    { name: 'Kalender', href: '/app/kalender', icon: Calendar, shortcut: 'G+C' },
    { name: 'Fakturor', href: '/app/fakturor', icon: Receipt, shortcut: 'G+I' },
    { name: 'Betalningar', href: '/app/betalningar', icon: CreditCard, shortcut: 'G+B' },
    { name: 'Kommunikation', href: '/app/kommunikation', icon: MessageSquare, shortcut: 'G+M' },
    { name: 'Team', href: '/app/team', icon: Users2, shortcut: 'G+T' },
    { name: 'Lönehantering', href: '/app/lonehantering', icon: DollarSign, shortcut: 'G+P' },
    {
        name: 'Dokument',
        href: '/app/dokument',
        icon: FolderOpen,
        shortcut: 'G+D',
        submenu: [
            { name: 'Alla dokument', href: '/app/dokument' },
            { name: 'Rapporter', href: '/app/rapporter' }
        ]
    },
    { name: 'Intranät', href: '/app/intranat', icon: Newspaper, shortcut: 'G+N' },
    { name: 'Analys', href: '/app/analys', icon: BarChart3, shortcut: 'G+A' },
    { name: 'Inställningar', href: '/app/installningar', icon: Settings, shortcut: 'G+S' }
];

// Note: Organizations are fetched dynamically from database via AuthContext
// No hardcoded organization data - use getOrganisation() from lib/database.ts
