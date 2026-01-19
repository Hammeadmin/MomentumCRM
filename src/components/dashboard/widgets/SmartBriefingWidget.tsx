import React, { useEffect, useState } from 'react';
import { Sparkles, Calendar, TrendingUp } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { getSmartBriefingData } from '../../../lib/dashboard-widgets';
import { getGreeting } from '../../../locales/sv';

export default function SmartBriefingWidget() {
    const { userProfile } = useAuth();
    const [data, setData] = useState<{ meetingCount: number; topLead: any } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            if (!userProfile?.id) return;
            const res = await getSmartBriefingData(userProfile.id);
            setData(res);
            setLoading(false);
        }
        load();
    }, [userProfile]);

    const greeting = getGreeting(new Date().getHours());
    const firstName = userProfile?.full_name.split(' ')[0] || 'Där';

    if (loading) {
        return <div className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />;
    }

    return (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-1 rounded-2xl shadow-sm mb-6 animate-fade-in">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                <div className="flex items-start space-x-4 relative z-10">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                        <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>

                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 font-primary">
                            {greeting}, {firstName}.
                        </h2>

                        <div className="text-gray-600 dark:text-gray-300 space-y-1 leading-relaxed max-w-2xl">
                            <p>
                                Du har <strong className="text-indigo-600 dark:text-indigo-400">{data?.meetingCount || 0} möten</strong> inbokade idag.
                            </p>
                            {data?.topLead ? (
                                <p className="flex items-center">
                                    <TrendingUp className="w-4 h-4 mr-1.5 text-green-500" />
                                    Fokusera på <strong className="mx-1">{data.topLead.title}</strong> som är värd {new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(data.topLead.estimated_value)}.
                                </p>
                            ) : (
                                <p>Inga nya högprioriterade leads just nu.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
