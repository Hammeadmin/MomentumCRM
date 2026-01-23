import React, { useState, useEffect } from 'react';
import { Eye, Clock, Users, TrendingUp, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface QuoteAnalyticsProps {
    quoteId: string;
}

interface ViewStats {
    totalViews: number;
    uniqueVisitors: number;
    firstViewedAt: string | null;
    lastViewedAt: string | null;
}

export default function QuoteAnalytics({ quoteId }: QuoteAnalyticsProps) {
    const [stats, setStats] = useState<ViewStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadViewStats();
    }, [quoteId]);

    const loadViewStats = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch view statistics
            const { data, error: fetchError } = await supabase
                .from('quote_views')
                .select('id, viewed_at, ip_address')
                .eq('quote_id', quoteId);

            if (fetchError) {
                console.error('Error fetching quote views:', fetchError);
                setError('Kunde inte ladda statistik');
                return;
            }

            if (!data || data.length === 0) {
                setStats({
                    totalViews: 0,
                    uniqueVisitors: 0,
                    firstViewedAt: null,
                    lastViewedAt: null
                });
                return;
            }

            // Calculate statistics
            const uniqueIps = new Set(data.map(v => v.ip_address)).size;
            const sortedDates = data.map(v => new Date(v.viewed_at)).sort((a, b) => a.getTime() - b.getTime());

            setStats({
                totalViews: data.length,
                uniqueVisitors: uniqueIps,
                firstViewedAt: sortedDates[0].toISOString(),
                lastViewedAt: sortedDates[sortedDates.length - 1].toISOString()
            });
        } catch (err) {
            console.error('Error loading analytics:', err);
            setError('Ett fel uppstod');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (isoString: string | null) => {
        if (!isoString) return '-';
        return new Intl.DateTimeFormat('sv-SE', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(isoString));
    };

    const formatRelativeTime = (isoString: string | null) => {
        if (!isoString) return '-';
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just nu';
        if (diffMins < 60) return `${diffMins} min sedan`;
        if (diffHours < 24) return `${diffHours} tim sedan`;
        if (diffDays < 7) return `${diffDays} dagar sedan`;
        return formatDate(isoString);
    };

    if (loading) {
        return (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span className="ml-2 text-sm text-gray-500">Laddar statistik...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600">{error}</p>
            </div>
        );
    }

    if (!stats || stats.totalViews === 0) {
        return (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center text-gray-500">
                    <Eye className="w-4 h-4 mr-2" />
                    <span className="text-sm">Offerten har inte visats än</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                    Statistik visas när kunden öppnar offertmejlet
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                <TrendingUp className="w-4 h-4 mr-2 text-blue-600" />
                Offertstatistik
            </h4>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center text-blue-600 mb-1">
                        <Eye className="w-4 h-4 mr-1" />
                        <span className="text-xs font-medium">Visningar</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-900">{stats.totalViews}</p>
                </div>

                <div className="bg-green-50 rounded-lg p-3">
                    <div className="flex items-center text-green-600 mb-1">
                        <Users className="w-4 h-4 mr-1" />
                        <span className="text-xs font-medium">Unika besökare</span>
                    </div>
                    <p className="text-2xl font-bold text-green-900">{stats.uniqueVisitors}</p>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        Första visning
                    </span>
                    <span className="text-gray-700">{formatDate(stats.firstViewedAt)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        Senaste visning
                    </span>
                    <span className="text-gray-700 font-medium">{formatRelativeTime(stats.lastViewedAt)}</span>
                </div>
            </div>

            <p className="text-xs text-gray-400 mt-4 pt-2 border-t border-gray-100">
                * Spårning fungerar när mottagaren laddar bilder i mejlet
            </p>
        </div>
    );
}
