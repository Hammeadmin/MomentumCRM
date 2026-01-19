import React, { useEffect, useState } from 'react';
import { TrendingUp, AlertCircle, DollarSign, ArrowRight } from 'lucide-react'; // DollarSign used but formatting is SEK
import { formatSEK } from '../../../utils/formatting';
import { getCashFlowStats } from '../../../lib/dashboard-widgets';

export default function CashFlowWidget() {
    const [stats, setStats] = useState({ overdueSum: 0, paidSum: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const data = await getCashFlowStats();
                setStats(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) {
        return <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />;
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 h-full relative overflow-hidden">
            {/* Pulse Effect Background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center mb-6 relative z-10">
                <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                Ekonomi (Denna Månad)
            </h3>

            <div className="grid grid-cols-2 gap-4 relative z-10">
                <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-800/30">
                    <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1 flex items-center">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Inbetalt
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                        {formatSEK(stats.paidSum)}
                    </p>
                </div>

                <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-800/30">
                    <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1 flex items-center">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Förfallet
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                        {formatSEK(stats.overdueSum)}
                    </p>
                </div>
            </div>

            {stats.overdueSum > 0 && (
                <button className="mt-6 w-full flex items-center justify-center px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm font-medium text-gray-700 dark:text-white group">
                    Hantera påminnelser <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
            )}
        </div>
    );
}
