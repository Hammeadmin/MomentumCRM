import React, { useState } from 'react';
import {
    LineChart as RechartsLineChart,
    Line,
    PieChart as RechartsPieChart,
    Pie,
    Cell,
    BarChart as RechartsBarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    AreaChart,
    Area
} from 'recharts';
import { LineChart, BarChart3, PieChart, DollarSign, Target } from 'lucide-react';
import { formatCurrency } from '../../lib/database';

interface SalesChartProps {
    salesData: any[];
    leadStatusData: any[];
}

// Custom tooltip for Swedish formatting
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-gray-900/80 backdrop-blur-sm border border-gray-300 dark:border-gray-700 rounded-xl p-3 shadow-lg">
                <p className="text-gray-900 dark:text-white font-semibold mb-1">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={index} className="text-gray-700 dark:text-gray-300 text-sm">
                        {entry.name}: {entry.name === 'Försäljning' ? formatCurrency(entry.value) : entry.value}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export default function SalesChart({ salesData, leadStatusData }: SalesChartProps) {
    const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('line');

    const renderChart = () => {
        const commonProps = {
            data: salesData,
            margin: { top: 5, right: 30, left: 20, bottom: 5 }
        };

        switch (chartType) {
            case 'bar':
                return (
                    <RechartsBarChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="month" stroke="rgba(255,255,255,0.7)" fontSize={12} />
                        <YAxis stroke="rgba(255,255,255,0.7)" fontSize={12} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="försäljning" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
                        <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.9} />
                                <stop offset="95%" stopColor="#1D4ED8" stopOpacity={0.7} />
                            </linearGradient>
                        </defs>
                    </RechartsBarChart>
                );
            case 'area':
                return (
                    <AreaChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="month" stroke="rgba(255,255,255,0.7)" fontSize={12} />
                        <YAxis stroke="rgba(255,255,255,0.7)" fontSize={12} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="försäljning"
                            stroke="#3B82F6"
                            fill="url(#areaGradient)"
                            strokeWidth={3}
                        />
                        <defs>
                            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#1D4ED8" stopOpacity={0.1} />
                            </linearGradient>
                        </defs>
                    </AreaChart>
                );
            default:
                return (
                    <RechartsLineChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="month" stroke="rgba(255,255,255,0.7)" fontSize={12} />
                        <YAxis stroke="rgba(255,255,255,0.7)" fontSize={12} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                            type="monotone"
                            dataKey="försäljning"
                            stroke="#3B82F6"
                            strokeWidth={3}
                            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 6 }}
                            activeDot={{ r: 8, stroke: '#3B82F6', strokeWidth: 2, fill: '#FBBF24' }}
                        />
                    </RechartsLineChart>
                );
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            {/* Advanced Sales Chart */}
            <div className="lg:col-span-2 premium-card p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white font-primary">Försäljning över tid</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm font-secondary">Senaste 6 månaderna</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        {[
                            { type: 'line', icon: LineChart, label: 'Linje' },
                            { type: 'bar', icon: BarChart3, label: 'Stapel' },
                            { type: 'area', icon: PieChart, label: 'Område' }
                        ].map((option) => {
                            const Icon = option.icon;
                            return (
                                <button
                                    key={option.type}
                                    onClick={() => setChartType(option.type as any)}
                                    className={`p-2 rounded-lg transition-all duration-200 ${chartType === option.type
                                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                    title={option.label}
                                >
                                    <Icon className="w-4 h-4" />
                                </button>
                            );
                        })}
                    </div>
                </div>

                {salesData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                        {renderChart()}
                    </ResponsiveContainer>
                ) : (
                    <div className="h-[350px] flex items-center justify-center text-gray-500 dark:text-gray-600">
                        <div className="text-center">
                            <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
                            <p className="font-secondary">Ingen försäljningsdata tillgänglig</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Lead Status Distribution */}
            <div className="premium-card p-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 font-primary">Lead-fördelning</h3>
                {leadStatusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                        <RechartsPieChart>
                            <Pie
                                data={leadStatusData}
                                cx="50%"
                                cy="50%"
                                outerRadius={90}
                                innerRadius={45}
                                fill="#8884d8"
                                dataKey="value"
                                stroke="none"
                            >
                                {leadStatusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value, name) => [`${value} st`, name]}
                                contentStyle={{
                                    backgroundColor: 'rgba(31, 41, 55, 0.8)',
                                    border: '1px solid rgba(55, 65, 81, 1)',
                                    borderRadius: '12px',
                                    backdropFilter: 'blur(10px)',
                                    color: 'white'
                                }}
                                cursor={{ fill: 'rgba(107, 114, 128, 0.1)' }}
                            />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                formatter={(value) => <span className="text-gray-600 dark:text-gray-400 text-xs">{value}</span>}
                            />
                        </RechartsPieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-[280px] flex items-center justify-center text-gray-500 dark:text-gray-600">
                        <div className="text-center">
                            <Target className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
                            <p className="font-secondary">Inga leads tillgängliga</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
