import React from 'react';
import { ArrowUpRight, ArrowDownRight, DollarSign, TrendingUp, Briefcase, Receipt } from 'lucide-react';
import { KPIData } from '../../types/dashboard';
import { formatSEK } from '../../utils/formatting';
import { KPI } from '../../locales/sv';
import AnimatedCounter from './AnimatedCounter';

// Mini Sparkline Component
function MiniSparkline({ data, color = '#2563EB' }: { data: number[]; color?: string }) {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => {
        const x = (index / (data.length - 1)) * 60;
        const y = 20 - ((value - min) / range) * 20;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width="60" height="20" className="opacity-70">
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
            />
        </svg>
    );
}

interface KPIGridProps {
    data: KPIData;
}

export default function KPIGrid({ data }: KPIGridProps) {
    // Calculate percentage changes (mock data for demo)
    const getPercentageChange = (type: string) => {
        const changes: Record<string, number> = {
            totalSales: 12,
            activeLeads: 8,
            activeJobs: 5,
            overdueInvoices: -15
        };
        return changes[type] || 0;
    };

    // Generate sparkline data
    const generateSparklineData = (baseValue: number) => {
        return Array.from({ length: 7 }, () =>
            baseValue + (Math.random() - 0.5) * baseValue * 0.3
        );
    };

    const kpiCards = [
        {
            name: KPI.TOTAL_SALES,
            subtitle: KPI.TOTAL_SALES_DESC,
            value: data.totalSales,
            change: getPercentageChange('totalSales'),
            changeType: getPercentageChange('totalSales') >= 0 ? 'positive' as const : 'negative' as const,
            icon: DollarSign,
            color: 'from-success-500 to-emerald-600',
            bgColor: 'bg-success-50 dark:bg-success-900/20',
            sparklineColor: '#10B981',
            formatter: (value: number) => formatSEK(value)
        },
        {
            name: KPI.ACTIVE_LEADS,
            subtitle: KPI.ACTIVE_LEADS_DESC,
            value: data.activeLeads,
            change: getPercentageChange('activeLeads'),
            changeType: getPercentageChange('activeLeads') >= 0 ? 'positive' as const : 'negative' as const,
            icon: TrendingUp,
            color: 'from-primary-500 to-primary-600',
            bgColor: 'bg-primary-50 dark:bg-primary-900/20',
            sparklineColor: '#3B82F6',
            formatter: (value: number) => value.toString()
        },
        {
            name: KPI.ACTIVE_JOBS,
            subtitle: KPI.ACTIVE_JOBS_DESC,
            value: data.activeJobs,
            change: getPercentageChange('activeJobs'),
            changeType: getPercentageChange('activeJobs') >= 0 ? 'positive' as const : 'negative' as const,
            icon: Briefcase,
            color: 'from-purple-500 to-violet-600',
            bgColor: 'bg-purple-50 dark:bg-purple-900/20',
            sparklineColor: '#8B5CF6',
            formatter: (value: number) => value.toString()
        },
        {
            name: KPI.OVERDUE_INVOICES,
            subtitle: KPI.OVERDUE_INVOICES_DESC,
            value: data.overdueInvoices,
            change: getPercentageChange('overdueInvoices'),
            changeType: getPercentageChange('overdueInvoices') >= 0 ? 'negative' as const : 'positive' as const,
            icon: Receipt,
            color: 'from-error-500 to-rose-600',
            bgColor: 'bg-error-50 dark:bg-error-900/20',
            sparklineColor: '#EF4444',
            formatter: (value: number) => value.toString()
        }
    ];

    return (
        <div className="flex overflow-x-auto snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up pb-2 md:pb-0 -mx-2 px-2 md:mx-0 md:px-0">
            {kpiCards.map((card, index) => {
                const Icon = card.icon;
                const sparklineData = generateSparklineData(card.value);

                return (
                    <div
                        key={card.name}
                        className="snap-center min-w-[85vw] md:min-w-0 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 p-6 group flex-shrink-0 transition-all duration-300"
                        style={{ animationDelay: `${index * 100}ms` }}
                    >
                        <div className="relative z-10">
                            {/* Header: Icon + Sparkline */}
                            <div className="flex items-start justify-between mb-5">
                                <div className={`w-12 h-12 bg-gradient-to-br ${card.color} rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-300`}>
                                    <Icon className="h-6 w-6 text-white" />
                                </div>
                                <div className="text-right">
                                    <MiniSparkline data={sparklineData} color={card.sparklineColor} />
                                </div>
                            </div>

                            {/* Label */}
                            <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">
                                {card.name}
                            </p>

                            {/* Value - Primary Focus */}
                            <p className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight mb-1">
                                <AnimatedCounter
                                    end={card.value}
                                    formatter={card.formatter}
                                    duration={1500 + index * 200}
                                />
                            </p>

                            {/* Subtitle */}
                            <p className="text-gray-400 dark:text-gray-500 text-xs mb-4">
                                {card.subtitle}
                            </p>

                            {/* Change Indicator */}
                            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                                <div className={`
                                    inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold
                                    ${card.changeType === 'positive'
                                        ? 'bg-success-50 dark:bg-success-900/30 text-success-700 dark:text-success-400'
                                        : 'bg-error-50 dark:bg-error-900/30 text-error-700 dark:text-error-400'
                                    }
                                `}>
                                    {card.changeType === 'positive' ? (
                                        <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                                    ) : (
                                        <ArrowDownRight className="w-3.5 h-3.5 mr-1" />
                                    )}
                                    {Math.abs(card.change)}%
                                </div>
                                <span className="text-gray-400 dark:text-gray-500 text-xs">vs förra månaden</span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

