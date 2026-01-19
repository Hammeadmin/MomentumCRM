import { supabase } from './supabase';
import { UserProfile } from '../types/database';

// ==========================================
// Leaderboard Data
// ==========================================
export interface LeaderboardUser {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
    total_sales: number;
}

export async function getSalesLeaderboard(): Promise<LeaderboardUser[]> {
    // Fetch orders that are 'won' or 'completed'. 
    // Assuming 'fakturerad' or 'bokad_bekräftad' counts as sales.
    // Adjust status filter as needed.

    // First, get all potential sales orders for this month
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const { data: orders, error } = await supabase
        .from('orders')
        .select(`
      value,
      assigned_to_user_id,
      status
    `)
        .in('status', ['bokad_bekräftad', 'redo_fakturera', 'fakturerad'])
        .gte('created_at', startOfMonth)
        .not('assigned_to_user_id', 'is', null);

    if (error) {
        console.error('Error fetching leaderboard data:', error);
        return [];
    }

    // Aggregate by user
    const userSales: Record<string, number> = {};
    orders?.forEach(order => {
        if (order.assigned_to_user_id && order.value) {
            userSales[order.assigned_to_user_id] = (userSales[order.assigned_to_user_id] || 0) + order.value;
        }
    });

    // Fetch user details for the top users
    const topUserIds = Object.keys(userSales);
    if (topUserIds.length === 0) return [];

    const { data: users, error: userError } = await supabase
        .from('user_profiles')
        .select('id, full_name, avatar_url')
        .in('id', topUserIds);

    if (userError) {
        console.error('Error fetching user profiles for leaderboard:', userError);
        return [];
    }

    // Combine
    const leaderboard: LeaderboardUser[] = users.map(user => ({
        user_id: user.id,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        total_sales: userSales[user.id] || 0
    }));

    // Sort by sales descending
    return leaderboard.sort((a, b) => b.total_sales - a.total_sales).slice(0, 5);
}

// ==========================================
// My Day Data
// ==========================================
export async function getUpcomingEvents(userId: string) {
    // Get meetings/events for today/future
    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .or(`assigned_to_user_id.eq.${userId}`)
        .gte('start_time', now)
        .order('start_time', { ascending: true })
        .limit(1);

    if (error) throw error;
    return data?.[0] || null;
}

export async function getTopTasks(userId: string) {
    const { data, error } = await supabase
        .from('sales_tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('due_date', { ascending: true })
        .limit(3);

    // Note: Schema says 'user_id' or 'assigned_to_user_id' in sales_tasks?
    // Types say: user_id?: string | null; (SalesTask)
    // I will check if column exists, usually 'user_id' or 'assigned_to'

    if (error) throw error;
    return data || [];
}

// ==========================================
// Cash Flow Data
// ==========================================
export async function getCashFlowStats() {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    // Overdue
    const { data: overdue, error: err1 } = await supabase
        .from('invoices')
        .select('amount')
        .eq('status', 'overdue');

    // Paid this month
    const { data: paid, error: err2 } = await supabase
        .from('invoices')
        .select('amount')
        .eq('status', 'paid')
        .gte('created_at', startOfMonth); // or paid_at if exists

    if (err1 || err2) throw err1 || err2;

    const overdueSum = overdue?.reduce((sum, inv) => sum + inv.amount, 0) || 0;
    const paidSum = paid?.reduce((sum, inv) => sum + inv.amount, 0) || 0;

    return { overdueSum, paidSum };
}

// ==========================================
// Smart Briefing Data
// ==========================================
export async function getSmartBriefingData(userId: string) {
    // Get standard greeting data
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Count meetings today
    const { count: meetingCount, error: err1 } = await supabase
        .from('calendar_events')
        .select('*', { count: 'exact', head: true })
        .or(`assigned_to_user_id.eq.${userId}`)
        .gte('start_time', todayStart.toISOString())
        .lte('start_time', todayEnd.toISOString())
        .eq('type', 'meeting');

    // Find high value lead
    const { data: leads, error: err2 } = await supabase
        .from('leads')
        .select('title, estimated_value')
        .gt('estimated_value', 50000)
        .eq('status', 'new')
        .order('created_at', { ascending: false })
        .limit(1);

    if (err1 || err2) console.error(err1, err2);

    return {
        meetingCount: meetingCount || 0,
        topLead: leads?.[0] || null
    };
}
