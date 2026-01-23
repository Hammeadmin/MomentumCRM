/**
 * RealtimeManager Component
 * Sets up real-time subscriptions for the entire app
 * Listens to database changes and invalidates React Query cache
 * 
 * Optimizations:
 * - Debounces rapid events (uses debounceMs per table)
 * - Only invalidates queries relevant to current route
 */

import { useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Route-to-querykeys mapping for selective invalidation
const ROUTE_QUERY_KEYS: Record<string, string[]> = {
    '/': ['dashboard-kpi', 'dashboard-activities'],
    '/leads': ['leads', 'leads-data', 'kanban-data'],
    '/orders': ['orders', 'kanban-data'],
    '/Orderhantering': ['orders', 'kanban-data'],
    '/fakturor': ['invoices', 'invoices-data'],
    '/offerter': ['quotes', 'quotes-data'],
    '/kunder': ['customers', 'customers-data'],
    '/calendar': ['calendar-events', 'calendar'],
    '/kalender': ['calendar-events', 'calendar'],
};

// Define which tables to listen to and which query keys to invalidate
const REALTIME_SUBSCRIPTIONS = [
    {
        table: 'jobs',
        queryKeys: ['jobs', 'kanban-data', 'dashboard-kpi', 'dashboard-activities'],
        debounceMs: 500
    },
    {
        table: 'leads',
        queryKeys: ['leads', 'leads-data', 'kanban-data', 'dashboard-kpi'],
        debounceMs: 500
    },
    {
        table: 'invoices',
        queryKeys: ['invoices', 'invoices-data', 'dashboard-kpi'],
        debounceMs: 500
    },
    {
        table: 'quotes',
        queryKeys: ['quotes', 'quotes-data', 'dashboard-kpi'],
        debounceMs: 500
    },
    {
        table: 'customers',
        queryKeys: ['customers', 'customers-data'],
        debounceMs: 500
    },
    {
        table: 'notifications',
        queryKeys: ['notifications', 'unread-notifications'],
        debounceMs: 300 // Faster for notifications
    },
    {
        table: 'calendar_events',
        queryKeys: ['calendar-events', 'calendar'],
        debounceMs: 500
    },
    {
        table: 'orders',
        queryKeys: ['orders', 'kanban-data', 'dashboard-kpi'],
        debounceMs: 500
    }
];

interface RealtimeManagerProps {
    /** Enable/disable all subscriptions */
    enabled?: boolean;
}

/**
 * RealtimeManager - Mount this component once in App.tsx
 * Sets up all real-time subscriptions with smart invalidation
 */
export function RealtimeManager({ enabled = true }: RealtimeManagerProps) {
    const { user, organisationId } = useAuth();
    const location = useLocation();
    const queryClient = useQueryClient();
    const channelsRef = useRef<RealtimeChannel[]>([]);
    const debounceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
    const pendingInvalidationsRef = useRef<Set<string>>(new Set());

    // Only enable subscriptions when user is logged in
    const isEnabled = enabled && !!user && !!organisationId;

    // Get relevant query keys for current route
    const getCurrentRouteKeys = useCallback((): Set<string> => {
        const currentPath = location.pathname;
        const routeKeys = new Set<string>();

        // Add keys for exact match
        const exactMatch = ROUTE_QUERY_KEYS[currentPath];
        if (exactMatch) {
            exactMatch.forEach(key => routeKeys.add(key));
        }

        // Always include dashboard and notifications (global relevance)
        routeKeys.add('dashboard-kpi');
        routeKeys.add('dashboard-activities');
        routeKeys.add('notifications');
        routeKeys.add('unread-notifications');

        return routeKeys;
    }, [location.pathname]);

    // Debounced invalidation with route filtering
    const debouncedInvalidate = useCallback((table: string, queryKeys: string[], debounceMs: number) => {
        // Clear existing timer for this table
        const existingTimer = debounceTimersRef.current.get(table);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        // Queue keys
        queryKeys.forEach(key => pendingInvalidationsRef.current.add(key));

        // Set new debounced timer
        const timer = setTimeout(() => {
            const routeKeys = getCurrentRouteKeys();
            const keysToInvalidate: string[] = [];

            // Only invalidate keys relevant to current route
            pendingInvalidationsRef.current.forEach(key => {
                if (routeKeys.has(key)) {
                    keysToInvalidate.push(key);
                }
            });

            if (keysToInvalidate.length > 0) {
                console.log(`[Realtime] Invalidating (route-filtered):`, keysToInvalidate);
                keysToInvalidate.forEach(key => {
                    queryClient.invalidateQueries({ queryKey: [key] });
                });
            }

            pendingInvalidationsRef.current.clear();
            debounceTimersRef.current.delete(table);
        }, debounceMs);

        debounceTimersRef.current.set(table, timer);
    }, [queryClient, getCurrentRouteKeys]);

    useEffect(() => {
        if (!isEnabled || !organisationId) return;

        console.log('[RealtimeManager] Setting up subscriptions...');
        const channels: RealtimeChannel[] = [];

        REALTIME_SUBSCRIPTIONS.forEach(({ table, queryKeys, debounceMs }) => {
            const channelName = `rt-${table}-${organisationId}-${Date.now()}`;
            const channel = supabase.channel(channelName);

            channel.on(
                'postgres_changes' as const,
                {
                    event: '*',
                    schema: 'public',
                    table,
                    filter: `organisation_id=eq.${organisationId}`
                },
                () => {
                    console.log(`[Realtime] ${table} changed`);
                    debouncedInvalidate(table, queryKeys, debounceMs);
                }
            );

            channel.subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`[Realtime] ✓ ${table}`);
                }
            });

            channels.push(channel);
        });

        channelsRef.current = channels;

        return () => {
            console.log('[RealtimeManager] Cleaning up subscriptions');
            debounceTimersRef.current.forEach(timer => clearTimeout(timer));
            debounceTimersRef.current.clear();
            channels.forEach(channel => supabase.removeChannel(channel));
        };
    }, [isEnabled, organisationId, debouncedInvalidate]);

    // This component doesn't render anything
    return null;
}

export default RealtimeManager;
