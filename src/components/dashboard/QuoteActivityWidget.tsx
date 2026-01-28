import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Eye,
    CheckCircle,
    XCircle,
    FileText,
    Clock,
    Phone,
    TrendingUp,
    Loader2,
    ChevronRight,
    Flame
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../lib/database';

interface QuoteActivity {
    id: string;
    type: 'view' | 'accepted' | 'declined' | 'sent';
    quote_id: string;
    quote_number: string;
    quote_title: string;
    customer_name: string;
    amount: number;
    timestamp: string;
    view_count?: number;
}

interface HotLead {
    quote_id: string;
    quote_number: string;
    quote_title: string;
    customer_name: string;
    customer_id: string;
    amount: number;
    view_count: number;
    last_viewed: string;
}

interface QuoteStats {
    sent: number;
    awaiting: number;
    accepted: number;
    declined: number;
}

export default function QuoteActivityWidget() {
    const navigate = useNavigate();
    const { organisation } = useAuth();
    const [activities, setActivities] = useState<QuoteActivity[]>([]);
    const [hotLeads, setHotLeads] = useState<HotLead[]>([]);
    const [stats, setStats] = useState<QuoteStats>({ sent: 0, awaiting: 0, accepted: 0, declined: 0 });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'activity' | 'hot'>('activity');

    useEffect(() => {
        if (organisation?.id) {
            loadQuoteData();
        }
    }, [organisation?.id]);

    const loadQuoteData = async () => {
        if (!organisation?.id) return;

        try {
            setLoading(true);

            // Get quote stats
            const { data: quotes } = await supabase
                .from('quotes')
                .select('status')
                .eq('organisation_id', organisation.id)
                .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

            if (quotes) {
                const statCounts = quotes.reduce((acc, q) => {
                    acc[q.status as keyof QuoteStats] = (acc[q.status as keyof QuoteStats] || 0) + 1;
                    return acc;
                }, { sent: 0, awaiting: 0, accepted: 0, declined: 0 } as QuoteStats);
                setStats(statCounts);
            }

            // Get recent views with quote info
            const { data: recentViews } = await supabase
                .from('quote_views')
                .select(`
          id,
          viewed_at,
          quote:quotes!inner(
            id, 
            quote_number, 
            title, 
            total_amount,
            organisation_id,
            customer:customers(name)
          )
        `)
                .order('viewed_at', { ascending: false })
                .limit(20);

            // Get recent quote status changes
            const { data: recentQuotes } = await supabase
                .from('quotes')
                .select(`
          id,
          quote_number,
          title,
          total_amount,
          status,
          accepted_at,
          created_at,
          customer:customers(name)
        `)
                .eq('organisation_id', organisation.id)
                .in('status', ['accepted', 'declined', 'sent'])
                .order('created_at', { ascending: false })
                .limit(10);

            // Build activity feed
            const activityList: QuoteActivity[] = [];

            // Add views (deduplicated by quote)
            const viewsByQuote = new Map<string, any>();
            recentViews?.forEach(view => {
                const quote = view.quote as any;
                if (quote?.organisation_id === organisation.id) {
                    if (!viewsByQuote.has(quote.id)) {
                        viewsByQuote.set(quote.id, { ...view, count: 1 });
                    } else {
                        viewsByQuote.get(quote.id).count++;
                    }
                }
            });

            viewsByQuote.forEach((view, quoteId) => {
                const quote = view.quote;
                activityList.push({
                    id: `view-${quoteId}`,
                    type: 'view',
                    quote_id: quoteId,
                    quote_number: quote.quote_number,
                    quote_title: quote.title,
                    customer_name: quote.customer?.name || 'Kund',
                    amount: quote.total_amount,
                    timestamp: view.viewed_at,
                    view_count: view.count
                });
            });

            // Add status changes
            recentQuotes?.forEach(quote => {
                if (quote.status === 'accepted' || quote.status === 'declined') {
                    activityList.push({
                        id: `status-${quote.id}`,
                        type: quote.status as 'accepted' | 'declined',
                        quote_id: quote.id,
                        quote_number: quote.quote_number || '',
                        quote_title: quote.title,
                        customer_name: (quote.customer as any)?.name || 'Kund',
                        amount: quote.total_amount,
                        timestamp: quote.accepted_at || quote.created_at
                    });
                }
            });

            // Sort by timestamp
            activityList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setActivities(activityList.slice(0, 10));

            // Get hot leads (quotes with 3+ views in last 7 days)
            const { data: viewCounts } = await supabase
                .from('quote_views')
                .select(`
          quote_id,
          quote:quotes!inner(
            id,
            quote_number,
            title,
            total_amount,
            status,
            organisation_id,
            customer:customers(id, name)
          )
        `)
                .gte('viewed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

            const quoteCounts = new Map<string, { count: number; quote: any; lastView: string }>();
            viewCounts?.forEach(view => {
                const quote = view.quote as any;
                if (quote?.organisation_id === organisation.id && quote?.status === 'sent') {
                    const existing = quoteCounts.get(view.quote_id);
                    if (existing) {
                        existing.count++;
                    } else {
                        quoteCounts.set(view.quote_id, { count: 1, quote, lastView: new Date().toISOString() });
                    }
                }
            });

            const hotLeadsList: HotLead[] = [];
            quoteCounts.forEach((data, quoteId) => {
                if (data.count >= 3) {
                    hotLeadsList.push({
                        quote_id: quoteId,
                        quote_number: data.quote.quote_number,
                        quote_title: data.quote.title,
                        customer_name: data.quote.customer?.name || 'Kund',
                        customer_id: data.quote.customer?.id,
                        amount: data.quote.total_amount,
                        view_count: data.count,
                        last_viewed: data.lastView
                    });
                }
            });

            hotLeadsList.sort((a, b) => b.view_count - a.view_count);
            setHotLeads(hotLeadsList);

        } catch (err) {
            console.error('Error loading quote data:', err);
        } finally {
            setLoading(false);
        }
    };

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'view': return Eye;
            case 'accepted': return CheckCircle;
            case 'declined': return XCircle;
            case 'sent': return FileText;
            default: return FileText;
        }
    };

    const getActivityColor = (type: string) => {
        switch (type) {
            case 'view': return 'text-purple-600 bg-purple-100';
            case 'accepted': return 'text-green-600 bg-green-100';
            case 'declined': return 'text-red-600 bg-red-100';
            case 'sent': return 'text-blue-600 bg-blue-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getActivityText = (activity: QuoteActivity) => {
        switch (activity.type) {
            case 'view':
                return activity.view_count && activity.view_count > 1
                    ? `öppnade offerten (${activity.view_count} visningar)`
                    : 'öppnade offerten';
            case 'accepted':
                return 'godkände offerten';
            case 'declined':
                return 'avvisade offerten';
            case 'sent':
                return 'mottog offerten';
            default:
                return '';
        }
    };

    const formatRelativeTime = (timestamp: string) => {
        const now = new Date();
        const time = new Date(timestamp);
        const diffMs = now.getTime() - time.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return 'just nu';
        if (diffMins < 60) return `${diffMins} min sedan`;
        if (diffHours < 24) return `${diffHours} tim sedan`;
        if (diffDays < 7) return `${diffDays} dagar sedan`;
        return time.toLocaleDateString('sv-SE');
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-center h-48">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <h3 className="font-semibold text-gray-900 dark:text-white">Offertaktivitet</h3>
                    </div>
                    <button
                        onClick={() => navigate('/app/offerter')}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                    >
                        Alla offerter <ChevronRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-4 gap-2">
                    <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-lg font-bold text-blue-600">{stats.sent}</p>
                        <p className="text-xs text-gray-500">Skickade</p>
                    </div>
                    <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <p className="text-lg font-bold text-yellow-600">{stats.sent - stats.accepted - stats.declined}</p>
                        <p className="text-xs text-gray-500">Väntar</p>
                    </div>
                    <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-lg font-bold text-green-600">{stats.accepted}</p>
                        <p className="text-xs text-gray-500">Godkända</p>
                    </div>
                    <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <p className="text-lg font-bold text-red-600">{stats.declined}</p>
                        <p className="text-xs text-gray-500">Avvisade</p>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-100 dark:border-gray-700">
                <button
                    onClick={() => setActiveTab('activity')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'activity'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <TrendingUp className="w-4 h-4 inline mr-1" />
                    Senaste aktivitet
                </button>
                <button
                    onClick={() => setActiveTab('hot')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors relative ${activeTab === 'hot'
                        ? 'text-orange-600 border-b-2 border-orange-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Flame className="w-4 h-4 inline mr-1" />
                    Heta leads
                    {hotLeads.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-500 text-white rounded-full">
                            {hotLeads.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Content */}
            <div className="p-4 max-h-80 overflow-y-auto">
                {activeTab === 'activity' ? (
                    activities.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Eye className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm">Ingen offertaktivitet ännu</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {activities.map(activity => {
                                const Icon = getActivityIcon(activity.type);
                                return (
                                    <div
                                        key={activity.id}
                                        onClick={() => navigate(`/app/offert/${activity.quote_id}`)}
                                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.type)}`}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-900 dark:text-white">
                                                <span className="font-medium">{activity.customer_name}</span>{' '}
                                                {getActivityText(activity)}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">
                                                {activity.quote_number} - {activity.quote_title}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-gray-400">
                                                    <Clock className="w-3 h-3 inline mr-1" />
                                                    {formatRelativeTime(activity.timestamp)}
                                                </span>
                                                <span className="text-xs font-medium text-gray-600">
                                                    {formatCurrency(activity.amount)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                ) : (
                    hotLeads.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Flame className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm">Inga heta leads just nu</p>
                            <p className="text-xs text-gray-400 mt-1">Leads med 3+ visningar senaste veckan</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {hotLeads.map(lead => (
                                <div
                                    key={lead.quote_id}
                                    className="p-3 rounded-lg bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-800"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <Flame className="w-4 h-4 text-orange-500" />
                                                <span className="font-medium text-gray-900 dark:text-white">{lead.customer_name}</span>
                                                <span className="px-2 py-0.5 text-xs bg-orange-500 text-white rounded-full">
                                                    {lead.view_count} visningar
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-600 mt-1">
                                                {lead.quote_number} - {lead.quote_title}
                                            </p>
                                            <p className="text-sm font-medium text-gray-700 mt-1">
                                                {formatCurrency(lead.amount)}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/app/offert/${lead.quote_id}`)}
                                            className="flex items-center gap-1 px-3 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
                                        >
                                            <Phone className="w-4 h-4" />
                                            Ring nu
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
