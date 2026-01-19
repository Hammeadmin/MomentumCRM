import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Users, FileText, DollarSign, Award, Target, Plus, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/database';
import { getLeadAnalytics } from '../lib/leads';
import type { SalesTask, UserProfile } from '../types/database';

// Importera komponenter
import PageHeader from '../components/PageHeader';
import TaskDashboardWidget from '../components/TaskDashboardWidget';
import TaskDetailModal from '../components/TaskDetailModal';
import RssFeedWidget from '../components/RssFeedWidget';
import SalesFunnelChart from '../components/SalesFunnelChart';

import IntranetDashboard from '../components/IntranetDashboard';

function SalesDashboard() {
    const { user, organisationId } = useAuth();
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // State för data
    const [kpiData, setKpiData] = useState({ totalSales: 0, newLeads: 0, conversionRate: 0, averageDealSize: 0 });
    const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
    const [selectedTask, setSelectedTask] = useState<SalesTask | null>(null);
    const [allTeamMembers, setAllTeamMembers] = useState<UserProfile[]>([]);

    const fetchDashboardData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            // Hämta all data parallellt
            const analyticsPromise = getLeadAnalytics(organisationId!, user.id);
            const profilePromise = supabase.from('user_profiles').select('*').eq('id', user.id).single();
            const membersPromise = supabase.from('user_profiles').select('id, full_name, role').eq('role', 'sales');
            const leaderboardPromise = supabase.rpc('get_sales_leaderboard');
            const totalSalesPromise = supabase.from('orders').select('invoices(amount, status)').eq('primary_salesperson_id', user.id);

            const [
                analyticsResult,
                profileResult,
                membersResult,
                leaderboardResult,
                totalSalesResult,
            ] = await Promise.all([
                analyticsPromise,
                profilePromise,
                membersPromise,
                leaderboardPromise,
                totalSalesPromise,
            ]);

            // Felhantering
            if (analyticsResult.error) throw new Error("Kunde inte ladda analysdata.");
            if (profileResult.error) throw profileResult.error;
            if (membersResult.error) throw membersResult.error;
            if (leaderboardResult.error) throw leaderboardResult.error;
            if (totalSalesResult.error) throw totalSalesResult.error;

            // Sätt state med hämtad data
            if (analyticsResult.data) {
                const totalSales = totalSalesResult.data
                    ?.flatMap(order => order.invoices)
                    .filter(invoice => invoice.status === 'paid')
                    .reduce((sum, inv) => sum + inv.amount, 0) || 0;

                setKpiData({
                    totalSales: totalSales,
                    newLeads: analyticsResult.data.totalLeads,
                    conversionRate: analyticsResult.data.conversionRate,
                    averageDealSize: analyticsResult.data.averageDealSize,
                });
            }

            setUserProfile(profileResult.data);
            setAllTeamMembers(membersResult.data || []);
            setLeaderboardData(leaderboardResult.data || []);

        } catch (err: any) {
            console.error("Error fetching dashboard data:", err);
            setError(err.message || 'Misslyckades med att ladda data.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        const name = userProfile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Användare';
        if (hour < 10) return `God morgon, ${name}!`;
        if (hour < 18) return `God eftermiddag, ${name}!`;
        return `God kväll, ${name}!`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                    <p className="mt-2 text-gray-600">Laddar dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return <div className="p-6 text-red-500"><strong>Fel:</strong> {error}</div>;
    }

    return (
        <div className="space-y-6 p-6">
            <PageHeader
                title="Instrumentpanel för Sälj"
                subtitle="Din prestation och dina uppgifter i en överblick."
                icon={TrendingUp}
            />

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{getGreeting()}</h2>
                <p className="text-gray-600 dark:text-gray-400">Här är en sammanfattning av din försäljning idag.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"><div className="flex items-center"><div className="bg-green-500 p-3 rounded-full text-white"><DollarSign size={24} /></div><div className="ml-4"><p className="text-gray-600 dark:text-gray-400">Total Försäljning</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(kpiData.totalSales)}</p></div></div></div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"><div className="flex items-center"><div className="bg-blue-500 p-3 rounded-full text-white"><Users size={24} /></div><div className="ml-4"><p className="text-gray-600 dark:text-gray-400">Antal Leads</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{kpiData.newLeads}</p></div></div></div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"><div className="flex items-center"><div className="bg-purple-500 p-3 rounded-full text-white"><Target size={24} /></div><div className="ml-4"><p className="text-gray-600 dark:text-gray-400">Konverteringsgrad</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{kpiData.conversionRate}%</p></div></div></div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"><div className="flex items-center"><div className="bg-yellow-500 p-3 rounded-full text-white"><FileText size={24} /></div><div className="ml-4"><p className="text-gray-600 dark:text-gray-400">Snittvärde Order</p><p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(kpiData.averageDealSize)}</p></div></div></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <SalesFunnelChart />
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center"><Award className="mr-2 text-yellow-400" />Topplista Säljare</h3>
                    <ul className="space-y-4">
                        {leaderboardData.map((person, index) => (
                            <li key={index} className="flex items-center">
                                <div className="bg-blue-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold">{person.avatar}</div>
                                <div className="ml-4 flex-1">
                                    <p className="font-medium text-gray-900 dark:text-white">{person.name}</p>
                                    <p className="text-gray-600 dark:text-gray-400">{formatCurrency(person.sales)}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <TaskDashboardWidget onTaskClick={setSelectedTask} />
                </div>
                <div className="lg:col-span-1">
                    <RssFeedWidget />
                </div>
                <div className="lg:col-span-1">
                    <IntranetDashboard />
                </div>
            </div>

            <TaskDetailModal
                task={selectedTask}
                members={allTeamMembers}
                onClose={() => setSelectedTask(null)}
                onUpdate={fetchDashboardData}
            />
        </div>
    );
}

export default SalesDashboard;