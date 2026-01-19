/**
 * RealtimeManager Component
 * Sets up real-time subscriptions for the entire app
 * Listens to database changes and invalidates React Query cache
 */

import { useEffect, useMemo } from 'react';
import { useMultiTableSubscription } from '../hooks/useRealtimeSubscription';
import { useAuth } from '../contexts/AuthContext';

// Define which tables to listen to and which query keys to invalidate
const REALTIME_SUBSCRIPTIONS = [
    {
        table: 'jobs',
        queryKeys: [
            ['jobs'],
            ['kanban-data'],
            ['dashboard-kpi'],
            ['dashboard-activities']
        ],
        debounceMs: 500
    },
    {
        table: 'leads',
        queryKeys: [
            ['leads'],
            ['leads-data'],
            ['kanban-data'],
            ['dashboard-kpi']
        ],
        debounceMs: 500
    },
    {
        table: 'invoices',
        queryKeys: [
            ['invoices'],
            ['invoices-data'],
            ['dashboard-kpi']
        ],
        debounceMs: 500
    },
    {
        table: 'quotes',
        queryKeys: [
            ['quotes'],
            ['quotes-data'],
            ['dashboard-kpi']
        ],
        debounceMs: 500
    },
    {
        table: 'customers',
        queryKeys: [
            ['customers'],
            ['customers-data']
        ],
        debounceMs: 500
    },
    {
        table: 'notifications',
        queryKeys: [
            ['notifications'],
            ['unread-notifications']
        ],
        debounceMs: 300 // Faster for notifications
    },
    {
        table: 'calendar_events',
        queryKeys: [
            ['calendar-events'],
            ['calendar']
        ],
        debounceMs: 500
    }
];

interface RealtimeManagerProps {
    /** Enable/disable all subscriptions */
    enabled?: boolean;
}

/**
 * RealtimeManager - Mount this component once in App.tsx
 * It sets up all real-time subscriptions for the app
 */
export function RealtimeManager({ enabled = true }: RealtimeManagerProps) {
    const { user, organisationId } = useAuth();

    // Only enable subscriptions when user is logged in
    const isEnabled = enabled && !!user && !!organisationId;

    // Memoize configs to prevent unnecessary re-subscriptions
    const subscriptionConfigs = useMemo(() => REALTIME_SUBSCRIPTIONS, []);

    // Set up multi-table subscription
    const { subscriptionCount } = useMultiTableSubscription(
        subscriptionConfigs,
        { enabled: isEnabled }
    );

    useEffect(() => {
        if (isEnabled) {
            console.log(`[RealtimeManager] Active subscriptions: ${subscriptionCount}`);
        }
    }, [isEnabled, subscriptionCount]);

    // This component doesn't render anything
    return null;
}

export default RealtimeManager;
