/**
 * Route Prefetch Hook
 * Prefetches data for routes when user hovers over navigation links
 * Improves perceived performance by having data ready before navigation
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';

// Route identifiers for prefetching
export type PrefetchRoute = 'orders' | 'leads' | 'quotes' | 'invoices' | 'customers' | 'teams';

/**
 * Hook that provides prefetch functions for navigation routes
 * Usage: const { prefetch } = usePrefetch(); prefetch('orders');
 */
export function usePrefetch() {
    const queryClient = useQueryClient();
    const { organisationId } = useAuth();

    /**
     * Prefetch data for a specific route
     * Call this on mouseEnter for navigation links
     */
    const prefetch = useCallback((route: PrefetchRoute) => {
        if (!organisationId) return;

        // Use prefetchQuery to populate the cache without triggering loading states
        // Each route lazily imports its data fetching function to avoid circular deps
        queryClient.prefetchQuery({
            queryKey: [route, organisationId],
            queryFn: async () => {
                switch (route) {
                    case 'orders': {
                        const { getOrders } = await import('../lib/orders');
                        return getOrders(organisationId, {}, 0, 20);
                    }
                    case 'leads': {
                        const { getLeads } = await import('../lib/leads');
                        return getLeads(organisationId, {});
                    }
                    case 'quotes': {
                        const { getQuotes } = await import('../lib/quotes');
                        return getQuotes(organisationId, {});
                    }
                    case 'invoices': {
                        const { getInvoices } = await import('../lib/database');
                        return getInvoices(organisationId);
                    }
                    case 'customers': {
                        const { getCustomers } = await import('../lib/database');
                        return getCustomers(organisationId);
                    }
                    case 'teams': {
                        const { getTeams } = await import('../lib/teams');
                        return getTeams(organisationId);
                    }
                    default:
                        return null;
                }
            },
            staleTime: 60000, // Consider data fresh for 1 minute
        });
    }, [queryClient, organisationId]);

    /**
     * Prefetch multiple routes at once
     * Useful for common navigation patterns
     */
    const prefetchMultiple = useCallback((routes: PrefetchRoute[]) => {
        routes.forEach(route => prefetch(route));
    }, [prefetch]);

    return {
        prefetch,
        prefetchMultiple,
    };
}

export default usePrefetch;

