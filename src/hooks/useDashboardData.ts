import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { KPIData, ActivityItem, SalesDataItem, LeadStatusItem, JobStatusItem } from '../types/dashboard';
import {
    getKPIData,
    getSalesDataByMonth,
    getLeadStatusDistribution,
    getJobStatusDistribution,
    getRecentActivity,
    getTeamMembers
} from '../lib/database';
import type { UserProfile } from '../types/database';
// Note: Removed unused orders/leads imports to keep it clean, or keep for types
import { getOrders, type OrderWithRelations } from '../lib/orders';
import { getLeads, type LeadWithRelations } from '../lib/leads';

// ============================================================================
// Types
// ============================================================================

export interface DashboardStats {
    kpiData: KPIData;
    teamMembers: UserProfile[];
}

export interface DashboardSalesData {
    salesData: SalesDataItem[];
    leadStatusData: LeadStatusItem[];
    jobStatusData: JobStatusItem[];
}

export interface DashboardActivities {
    recentActivity: ActivityItem[];
    recentOrders: OrderWithRelations[];
    recentLeads: LeadWithRelations[];
}

export interface UseDashboardDataResult {
    // New structured properties
    stats: DashboardStats;
    activities: DashboardActivities;
    salesDataObject: DashboardSalesData;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;

    // Backward-compatible properties (for Dashboard.tsx)
    kpiData: KPIData;
    allTeamMembers: UserProfile[];
    recentActivity: ActivityItem[];
    salesData: SalesDataItem[];
    leadStatusData: LeadStatusItem[];
    jobStatusData: JobStatusItem[];
    loading: boolean;
    refresh: () => void;
}

export interface UseDashboardDataOptions {
    enabledWidgets?: string[];
}

// ============================================================================
// Default Values
// ============================================================================

const defaultKpiData: KPIData = {
    totalSales: 0,
    activeLeads: 0,
    activeJobs: 0,
    overdueInvoices: 0,
    error: null
};

const defaultStats: DashboardStats = {
    kpiData: defaultKpiData,
    teamMembers: []
};


const defaultSalesData: DashboardSalesData = {
    salesData: [],
    leadStatusData: [],
    jobStatusData: []
};

// ============================================================================
// Cache Times (in milliseconds)
// ============================================================================

const STATS_STALE_TIME = 300000;     // 5 minutes for KPIs/charts
const ACTIVITY_STALE_TIME = 60000;   // 1 minute for recent activity
const GC_TIME = 600000;              // 10 minutes garbage collection

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Custom hook to fetch Dashboard data.
 * Optimized with conditional fetching based on enabledWidgets.
 */
export function useDashboardData(options: UseDashboardDataOptions = {}): UseDashboardDataResult {
    const { organisationId } = useAuth();
    const { enabledWidgets } = options;

    // Data category mapping
    // If enabledWidgets is undefined, we assume we need everything (backward compatibility)
    const needsStats = !enabledWidgets || enabledWidgets.some(w => ['kpis', 'sales_goal', 'leaderboard', 'cash_flow', 'job_status'].includes(w));
    const needsSalesData = !enabledWidgets || enabledWidgets.some(w => ['sales_chart', 'lead_distribution', 'job_status'].includes(w));
    const needsActivity = !enabledWidgets || enabledWidgets.some(w => ['activity_feed'].includes(w));

    // Default disable these unless explicitly needed (currently not used in main grid, passing for detail views maybe?)
    const needsOrders = false;
    const needsLeads = false;

    // Query 1: KPI Stats
    const statsQuery = useQuery<DashboardStats, Error>({
        queryKey: ['dashboard-stats', organisationId],
        queryFn: async (): Promise<DashboardStats> => {
            if (!organisationId) throw new Error('Organisation ID is required');
            const [kpiResult, membersResult] = await Promise.all([
                getKPIData(organisationId),
                getTeamMembers(organisationId)
            ]);
            if (kpiResult.error) throw new Error(kpiResult.error);
            if (membersResult.error) throw membersResult.error;
            return { kpiData: kpiResult, teamMembers: membersResult.data || [] };
        },
        enabled: !!organisationId && needsStats,
        staleTime: STATS_STALE_TIME,
        gcTime: GC_TIME
    });

    // Query 2: Sales/Chart Data
    const salesDataQuery = useQuery<DashboardSalesData, Error>({
        queryKey: ['dashboard-sales', organisationId],
        queryFn: async (): Promise<DashboardSalesData> => {
            if (!organisationId) throw new Error('Organisation ID is required');
            const [salesByMonth, leadDistribution, jobDistribution] = await Promise.all([
                getSalesDataByMonth(organisationId, 6),
                getLeadStatusDistribution(organisationId),
                getJobStatusDistribution(organisationId)
            ]);
            return {
                salesData: (salesByMonth || []) as unknown as SalesDataItem[],
                leadStatusData: (leadDistribution || []) as LeadStatusItem[],
                jobStatusData: (jobDistribution || []) as JobStatusItem[]
            };
        },
        enabled: !!organisationId && needsSalesData,
        staleTime: STATS_STALE_TIME,
        gcTime: GC_TIME
    });

    // Query 3: Recent Activity
    const activityQuery = useQuery<ActivityItem[], Error>({
        queryKey: ['dashboard-activity', organisationId],
        queryFn: async (): Promise<ActivityItem[]> => {
            if (!organisationId) throw new Error('Organisation ID is required');
            return await getRecentActivity(organisationId, 8);
        },
        enabled: !!organisationId && needsActivity,
        staleTime: ACTIVITY_STALE_TIME,
        gcTime: GC_TIME
    });

    // Query 4: Recent Orders
    const recentOrdersQuery = useQuery<OrderWithRelations[], Error>({
        queryKey: ['orders', organisationId, { limit: 5 }],
        queryFn: async (): Promise<OrderWithRelations[]> => {
            if (!organisationId) throw new Error('Organisation ID is required');
            const result = await getOrders(organisationId, {});
            if (result.error) throw result.error;
            return (result.data || []).slice(0, 5);
        },
        enabled: !!organisationId && needsOrders,
        staleTime: ACTIVITY_STALE_TIME,
        gcTime: GC_TIME
    });

    // Query 5: Recent Leads
    const recentLeadsQuery = useQuery<LeadWithRelations[], Error>({
        queryKey: ['leads', organisationId, { limit: 5 }],
        queryFn: async (): Promise<LeadWithRelations[]> => {
            if (!organisationId) throw new Error('Organisation ID is required');
            const result = await getLeads(organisationId, {});
            if (result.error) throw result.error;
            return (result.data || []).slice(0, 5);
        },
        enabled: !!organisationId && needsLeads,
        staleTime: ACTIVITY_STALE_TIME,
        gcTime: GC_TIME
    });

    // Combine loading types
    const isLoading =
        (needsStats && statsQuery.isLoading) ||
        (needsSalesData && salesDataQuery.isLoading) ||
        (needsActivity && activityQuery.isLoading);

    const error =
        statsQuery.error ||
        salesDataQuery.error ||
        activityQuery.error ||
        recentOrdersQuery.error ||
        recentLeadsQuery.error ||
        null;

    const refetch = () => {
        if (needsStats) statsQuery.refetch();
        if (needsSalesData) salesDataQuery.refetch();
        if (needsActivity) activityQuery.refetch();
        if (needsOrders) recentOrdersQuery.refetch();
        if (needsLeads) recentLeadsQuery.refetch();
    };

    return {
        stats: statsQuery.data || defaultStats,
        activities: {
            recentActivity: activityQuery.data || [],
            recentOrders: recentOrdersQuery.data || [],
            recentLeads: recentLeadsQuery.data || []
        },
        salesDataObject: salesDataQuery.data || defaultSalesData,
        isLoading,
        error,
        refetch,

        // Backward compatibility
        kpiData: statsQuery.data?.kpiData || defaultKpiData,
        allTeamMembers: statsQuery.data?.teamMembers || [],
        recentActivity: activityQuery.data || [],
        salesData: salesDataQuery.data?.salesData || [],
        leadStatusData: salesDataQuery.data?.leadStatusData || [],
        jobStatusData: salesDataQuery.data?.jobStatusData || [],
        loading: isLoading,
        refresh: refetch
    };
}

export default useDashboardData;
