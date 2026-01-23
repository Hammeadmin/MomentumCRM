/**
 * Real-Time Subscription Hook
 * Listens to Supabase postgres_changes and invalidates React Query cache
 * Uses debouncing to prevent UI crashes from rapid updates
 */

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

interface SubscriptionConfig {
    /** Table name to listen to */
    table: string;
    /** Schema (default: public) */
    schema?: string;
    /** React Query keys to invalidate when changes occur */
    queryKeys: (string | readonly unknown[])[];
    /** Filter by organisation_id (default: true) */
    filterByOrg?: boolean;
    /** Custom filter string */
    filter?: string;
    /** Debounce delay in ms (default: 500) */
    debounceMs?: number;
}

interface UseRealtimeSubscriptionOptions {
    /** Enable/disable the subscription */
    enabled?: boolean;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Subscribe to real-time changes on a Supabase table
 * Automatically invalidates specified React Query keys when changes occur
 */
export function useRealtimeSubscription(
    config: SubscriptionConfig,
    options: UseRealtimeSubscriptionOptions = {}
) {
    const { enabled = true } = options;
    const queryClient = useQueryClient();
    const { organisationId } = useAuth();
    const channelRef = useRef<RealtimeChannel | null>(null);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingInvalidationsRef = useRef<Set<string>>(new Set());

    const {
        table,
        schema = 'public',
        queryKeys,
        filterByOrg = true,
        filter,
        debounceMs = 500
    } = config;

    // Debounced invalidation function
    const debouncedInvalidate = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            // Invalidate all pending query keys
            pendingInvalidationsRef.current.forEach(keyString => {
                try {
                    const key = JSON.parse(keyString);
                    queryClient.invalidateQueries({ queryKey: key });
                } catch {
                    // If parsing fails, use as simple string key
                    queryClient.invalidateQueries({ queryKey: [keyString] });
                }
            });
            pendingInvalidationsRef.current.clear();

            console.log(`[Realtime] Invalidated queries for ${table}:`, queryKeys);
        }, debounceMs);
    }, [queryClient, table, queryKeys, debounceMs]);

    // Handle change event
    const handleChange = useCallback(() => {
        console.log(`[Realtime] ${table} changed`);

        // Queue all query keys for invalidation
        queryKeys.forEach(key => {
            const keyString = typeof key === 'string' ? key : JSON.stringify(key);
            pendingInvalidationsRef.current.add(keyString);
        });

        // Trigger debounced invalidation
        debouncedInvalidate();
    }, [table, queryKeys, debouncedInvalidate]);

    useEffect(() => {
        // Don't subscribe if disabled or no org ID when filtering by org
        if (!enabled) return;
        if (filterByOrg && !organisationId) return;

        // Build filter string
        let filterString = filter;
        if (filterByOrg && organisationId && !filter) {
            filterString = `organisation_id=eq.${organisationId}`;
        }

        // Create channel with unique name
        const channelName = `realtime-${table}-${organisationId || 'global'}`;

        console.log(`[Realtime] Subscribing to ${table}...`);

        // Create channel and subscribe using the correct Supabase API
        const channel = supabase.channel(channelName);

        // Subscribe to postgres changes
        channel.on(
            'postgres_changes' as const,
            {
                event: '*',
                schema,
                table,
                ...(filterString ? { filter: filterString } : {})
            },
            handleChange
        );

        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log(`[Realtime] Subscribed to ${table}`);
            } else if (status === 'CHANNEL_ERROR') {
                console.error(`[Realtime] Error subscribing to ${table}`);
            }
        });

        channelRef.current = channel;

        // Cleanup
        return () => {
            console.log(`[Realtime] Unsubscribing from ${table}`);
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, [enabled, table, schema, filterByOrg, organisationId, filter, handleChange]);

    return {
        isSubscribed: channelRef.current !== null
    };
}

// ============================================================================
// Multi-Table Subscription Hook
// ============================================================================

/**
 * Subscribe to multiple tables at once
 * Useful for the RealtimeManager component
 */
export function useMultiTableSubscription(
    configs: SubscriptionConfig[],
    options: UseRealtimeSubscriptionOptions = {}
) {
    const { enabled = true } = options;
    const queryClient = useQueryClient();
    const { organisationId } = useAuth();
    const channelsRef = useRef<RealtimeChannel[]>([]);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingInvalidationsRef = useRef<Set<string>>(new Set());

    // Debounced invalidation function
    const debouncedInvalidate = useCallback((debounceMs: number = 500) => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            pendingInvalidationsRef.current.forEach(keyString => {
                try {
                    const key = JSON.parse(keyString);
                    queryClient.invalidateQueries({ queryKey: key });
                } catch {
                    queryClient.invalidateQueries({ queryKey: [keyString] });
                }
            });

            console.log('[Realtime] Batch invalidated:',
                Array.from(pendingInvalidationsRef.current)
            );
            pendingInvalidationsRef.current.clear();
        }, debounceMs);
    }, [queryClient]);

    useEffect(() => {
        if (!enabled || !organisationId) return;

        // Create subscriptions for each config
        const channels: RealtimeChannel[] = [];

        configs.forEach((config) => {
            const {
                table,
                schema = 'public',
                queryKeys,
                filterByOrg = true,
                filter,
                debounceMs = 500
            } = config;

            // Build filter
            let filterString = filter;
            if (filterByOrg && organisationId && !filter) {
                filterString = `organisation_id=eq.${organisationId}`;
            }

            const channelName = `rt-${table}-${organisationId || 'global'}`;
            const channel = supabase.channel(channelName);

            // Subscribe to postgres changes
            channel.on(
                'postgres_changes' as const,
                {
                    event: '*',
                    schema,
                    table,
                    ...(filterString ? { filter: filterString } : {})
                },
                () => {
                    console.log(`[Realtime] ${table} changed`);

                    // Queue invalidations
                    queryKeys.forEach(key => {
                        const keyString = typeof key === 'string' ? key : JSON.stringify(key);
                        pendingInvalidationsRef.current.add(keyString);
                    });

                    debouncedInvalidate(debounceMs);
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

        // Cleanup
        return () => {
            console.log('[Realtime] Cleaning up all subscriptions');
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            channels.forEach(channel => {
                supabase.removeChannel(channel);
            });
        };
    }, [enabled, organisationId, configs, debouncedInvalidate]);

    return {
        subscriptionCount: channelsRef.current.length
    };
}

export default useRealtimeSubscription;
