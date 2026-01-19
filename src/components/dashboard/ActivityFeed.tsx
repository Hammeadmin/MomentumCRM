/**
 * ActivityFeed Component - PRODUCTION VERSION
 * 
 * Real-time activity feed showing business events from database:
 * - Orders created/updated/completed
 * - Leads created/updated
 * - Invoices sent/opened
 * - Quote tracking with "hot lead" detection
 */

import React, { useState, useEffect } from 'react';
import {
    FileText,
    Eye,
    CheckCircle,
    XCircle,
    Package,
    Receipt,
    Users,
    Clock,
    ArrowRight,
    Flame,
    RefreshCw,
    Target
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import { getRecentActivities, ActivityItem } from '../../lib/activityService';

// Activity types and their visual representation
const ACTIVITY_CONFIG = {
    quote_sent: { icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Offert skickad' },
    quote_opened: { icon: Eye, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Offert öppnad' },
    quote_accepted: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Offert accepterad' },
    quote_rejected: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Offert avvisad' },
    order_created: { icon: Package, color: 'text-cyan-500', bg: 'bg-cyan-500/10', label: 'Order skapad' },
    order_updated: { icon: Package, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Order uppdaterad' },
    order_completed: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Order klar' },
    invoice_sent: { icon: Receipt, color: 'text-purple-500', bg: 'bg-purple-500/10', label: 'Faktura skickad' },
    invoice_paid: { icon: Receipt, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Faktura betald' },
    invoice_opened: { icon: Eye, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Faktura öppnad' },
    customer_added: { icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-500/10', label: 'Ny kund' },
    lead_created: { icon: Target, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Ny lead' },
    lead_updated: { icon: Target, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Lead uppdaterad' },
} as const;

type FilterType = 'all' | 'quotes' | 'orders' | 'hot';

interface ActivityFeedProps {
    maxItems?: number;
    showFilters?: boolean;
    onActivityClick?: (activity: ActivityItem) => void;
}

export function ActivityFeed({
    maxItems = 15,
    showFilters = true,
    onActivityClick
}: ActivityFeedProps) {
    const { organisationId } = useAuth();
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterType>('all');
    const [refreshing, setRefreshing] = useState(false);

    // Fetch activities on mount and when organisation changes
    useEffect(() => {
        if (organisationId) {
            fetchActivities();
        }
    }, [organisationId]);

    const fetchActivities = async () => {
        if (!organisationId) return;

        try {
            setLoading(true);
            setError(null);
            const { data, error: fetchError } = await getRecentActivities(organisationId, maxItems);

            if (fetchError) {
                setError('Kunde inte hämta aktiviteter');
                console.error('Activity fetch error:', fetchError);
            } else {
                setActivities(data || []);
            }
        } catch (err) {
            setError('Ett fel uppstod');
            console.error('Activity fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchActivities();
        setRefreshing(false);
    };

    // Filter activities
    const filteredActivities = activities.filter(activity => {
        if (filter === 'all') return true;
        if (filter === 'hot') return activity.isHot;
        if (filter === 'quotes') return activity.type.includes('quote') || activity.type.includes('invoice');
        if (filter === 'orders') return activity.type.includes('order');
        return true;
    });

    const hotCount = activities.filter(a => a.isHot).length;

    // Loading state
    if (loading && activities.length === 0) {
        return (
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                    <h3 className="font-semibold text-zinc-900 dark:text-white">Aktivitet</h3>
                </div>
                <div className="p-8 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 animate-spin text-zinc-400" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-zinc-900 dark:text-white">Aktivitet</h3>
                    {hotCount > 0 && (
                        <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                            <Flame className="w-3 h-3" />
                            {hotCount} heta
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {showFilters && (
                        <div className="flex items-center gap-1">
                            {(['all', 'quotes', 'orders', 'hot'] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${filter === f
                                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                                            : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                        }`}
                                >
                                    {f === 'all' && 'Alla'}
                                    {f === 'quotes' && 'Offerter'}
                                    {f === 'orders' && 'Ordrar'}
                                    {f === 'hot' && '🔥 Heta'}
                                </button>
                            ))}
                        </div>
                    )}

                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Error state */}
            {error && (
                <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Activity List */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[400px] overflow-y-auto">
                {filteredActivities.length === 0 ? (
                    <div className="px-4 py-8 text-center text-zinc-500">
                        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">
                            {filter === 'hot' ? 'Inga heta leads just nu' : 'Ingen aktivitet att visa'}
                        </p>
                    </div>
                ) : (
                    filteredActivities.map((activity) => {
                        const config = ACTIVITY_CONFIG[activity.type] || ACTIVITY_CONFIG.order_updated;
                        const Icon = config.icon;

                        return (
                            <div
                                key={activity.id}
                                onClick={() => onActivityClick?.(activity)}
                                className={`px-4 py-3 flex items-start gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer ${activity.isHot ? 'bg-red-50/50 dark:bg-red-900/10' : ''
                                    }`}
                            >
                                {/* Icon */}
                                <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                    <Icon className={`w-4 h-4 ${config.color}`} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                                            {activity.title}
                                        </p>
                                        {activity.isHot && (
                                            <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-medium animate-pulse">
                                                🔥 Ring nu!
                                            </span>
                                        )}
                                    </div>
                                    {activity.description && (
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                            {activity.description}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-zinc-400">
                                            {formatDistanceToNow(activity.timestamp, { addSuffix: true, locale: sv })}
                                        </span>
                                        {activity.actorName && (
                                            <span className="text-xs text-zinc-400">• {activity.actorName}</span>
                                        )}
                                        {activity.viewCount && activity.viewCount > 1 && (
                                            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                                • {activity.viewCount} visningar
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Arrow */}
                                <ArrowRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 flex-shrink-0 mt-1" />
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer */}
            {activities.length > 0 && (
                <div className="px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 text-center">
                    <span className="text-xs text-zinc-500">
                        Visar {filteredActivities.length} av {activities.length} händelser
                    </span>
                </div>
            )}
        </div>
    );
}

export default ActivityFeed;
