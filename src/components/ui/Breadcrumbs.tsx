import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbsProps {
    items?: BreadcrumbItem[];
    showHome?: boolean;
    className?: string;
}

// Auto-generate breadcrumbs from route path
const routeLabels: Record<string, string> = {
    dashboard: 'Dashboard',
    customers: 'Kunder',
    orders: 'Ordrar',
    quotes: 'Offerter',
    invoices: 'Fakturor',
    calendar: 'Kalender',
    communications: 'Kommunikation',
    payroll: 'Lönehantering',
    team: 'Team',
    settings: 'Inställningar',
    leads: 'Leads',
    products: 'Produkter',
    reports: 'Rapporter',
    new: 'Ny',
    edit: 'Redigera'
};

function Breadcrumbs({ items, showHome = true, className = '' }: BreadcrumbsProps) {
    const location = useLocation();

    // Auto-generate breadcrumbs from path if items not provided
    const breadcrumbItems: BreadcrumbItem[] = items || (() => {
        const pathSegments = location.pathname.split('/').filter(Boolean);
        return pathSegments.map((segment, index) => {
            const path = '/' + pathSegments.slice(0, index + 1).join('/');
            const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
            return {
                label,
                href: index < pathSegments.length - 1 ? path : undefined // Last item has no link
            };
        });
    })();

    if (breadcrumbItems.length === 0 && !showHome) return null;

    return (
        <nav className={`flex items-center space-x-1 text-sm ${className}`} aria-label="Breadcrumb">
            {showHome && (
                <>
                    <Link
                        to="/dashboard"
                        className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        <Home className="w-4 h-4" />
                    </Link>
                    {breadcrumbItems.length > 0 && (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                </>
            )}

            {breadcrumbItems.map((item, index) => (
                <React.Fragment key={index}>
                    {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
                    {item.href ? (
                        <Link
                            to={item.href}
                            className="text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <span className="text-gray-900 font-medium">{item.label}</span>
                    )}
                </React.Fragment>
            ))}
        </nav>
    );
}

export default Breadcrumbs;
