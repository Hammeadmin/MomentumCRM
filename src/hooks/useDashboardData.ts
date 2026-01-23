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
    const needsKpis = !enabledWidgets || enabledWidgets.some(w => ['kpis', 'sales_goal', 'cash_flow'].includes(w));
    const needsTeamMembers = !enabledWidgets || enabledWidgets.some(w => ['leaderboard'].includes(w));
    const needsSalesChart = !enabledWidgets || enabledWidgets.some(w => ['sales_chart'].includes(w));
    const needsLeadDistribution = !enabledWidgets || enabledWidgets.some(w => ['lead_distribution'].includes(w));
    const needsJobStatus = !enabledWidgets || enabledWidgets.some(w => ['job_status'].includes(w));
    const needsActivity = !enabledWidgets || enabledWidgets.some(w => ['activity_feed'].includes(w));

    // Default disable these unless explicitly needed
    const needsOrders = false;
    const needsLeads = false;

    // ========================================================================
    // Independent Queries - Each loads and renders independently
    // ========================================================================

    // Query 1: KPI Data
    const kpiQuery = useQuery<KPIData, Error>({
        queryKey: ['dashboard-kpi', organisationId],
        queryFn: async (): Promise<KPIData> => {
            if (!organisationId) throw new Error('Organisation ID is required');
            const result = await getKPIData(organisationId);
            if (result.error) throw new Error(result.error);
            return result;
        },
        enabled: !!organisationId && needsKpis,
        staleTime: STATS_STALE_TIME,
        gcTime: GC_TIME
    });

    // Query 2: Team Members
    const teamMembersQuery = useQuery<UserProfile[], Error>({
        queryKey: ['dashboard-team-members', organisationId],
        queryFn: async (): Promise<UserProfile[]> => {
            if (!organisationId) throw new Error('Organisation ID is required');
            const result = await getTeamMembers(organisationId);
            if (result.error) throw result.error;
            return result.data || [];
        },
        enabled: !!organisationId && needsTeamMembers,
        staleTime: STATS_STALE_TIME,
        gcTime: GC_TIME
    });

    // Query 3: Sales Chart Data
    const salesChartQuery = useQuery<SalesDataItem[], Error>({
        queryKey: ['dashboard-sales-chart', organisationId],
        queryFn: async (): Promise<SalesDataItem[]> => {
            if (!organisationId) throw new Error('Organisation ID is required');
            const result = await getSalesDataByMonth(organisationId, 6);
            return (result || []) as unknown as SalesDataItem[];
        },
        enabled: !!organisationId && needsSalesChart,
        staleTime: STATS_STALE_TIME,
        gcTime: GC_TIME
    });

    // Query 4: Lead Status Distribution
    const leadStatusQuery = useQuery<LeadStatusItem[], Error>({
        queryKey: ['dashboard-lead-status', organisationId],
        queryFn: async (): Promise<LeadStatusItem[]> => {
            if (!organisationId) throw new Error('Organisation ID is required');
            const result = await getLeadStatusDistribution(organisationId);
            return (result || []) as LeadStatusItem[];
        },
        enabled: !!organisationId && needsLeadDistribution,
        staleTime: STATS_STALE_TIME,
        gcTime: GC_TIME
    });

    // Query 5: Job Status Distribution
    const jobStatusQuery = useQuery<JobStatusItem[], Error>({
        queryKey: ['dashboard-job-status', organisationId],
        queryFn: async (): Promise<JobStatusItem[]> => {
            if (!organisationId) throw new Error('Organisation ID is required');
            const result = await getJobStatusDistribution(organisationId);
            return (result || []) as JobStatusItem[];
        },
        enabled: !!organisationId && needsJobStatus,
        staleTime: STATS_STALE_TIME,
        gcTime: GC_TIME
    });

    // Query 6: Recent Activity
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

    // Query 7: Recent Orders (disabled by default)
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

    // Query 8: Recent Leads (disabled by default)
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

    // ========================================================================
    // Combined State
    // ========================================================================

    // isLoading is true only if ANY enabled query is still loading
    // This allows widgets to render as soon as their specific data is ready
    const isLoading =
        (needsKpis && kpiQuery.isLoading) ||
        (needsTeamMembers && teamMembersQuery.isLoading) ||
        (needsSalesChart && salesChartQuery.isLoading) ||
        (needsLeadDistribution && leadStatusQuery.isLoading) ||
        (needsJobStatus && jobStatusQuery.isLoading) ||
        (needsActivity && activityQuery.isLoading);

    const error =
        kpiQuery.error ||
        teamMembersQuery.error ||
        salesChartQuery.error ||
        leadStatusQuery.error ||
        jobStatusQuery.error ||
        activityQuery.error ||
        recentOrdersQuery.error ||
        recentLeadsQuery.error ||
        null;

    const refetch = () => {
        if (needsKpis) kpiQuery.refetch();
        if (needsTeamMembers) teamMembersQuery.refetch();
        if (needsSalesChart) salesChartQuery.refetch();
        if (needsLeadDistribution) leadStatusQuery.refetch();
        if (needsJobStatus) jobStatusQuery.refetch();
        if (needsActivity) activityQuery.refetch();
        if (needsOrders) recentOrdersQuery.refetch();
        if (needsLeads) recentLeadsQuery.refetch();
    };

    return {
        // Structured properties
        stats: {
            kpiData: kpiQuery.data || defaultKpiData,
            teamMembers: teamMembersQuery.data || []
        },
        activities: {
            recentActivity: activityQuery.data || [],
            recentOrders: recentOrdersQuery.data || [],
            recentLeads: recentLeadsQuery.data || []
        },
        salesDataObject: {
            salesData: salesChartQuery.data || [],
            leadStatusData: leadStatusQuery.data || [],
            jobStatusData: jobStatusQuery.data || []
        },
        isLoading,
        error,
        refetch,

        // Backward-compatible properties (for Dashboard.tsx)
        kpiData: kpiQuery.data || defaultKpiData,
        allTeamMembers: teamMembersQuery.data || [],
        recentActivity: activityQuery.data || [],
        salesData: salesChartQuery.data || [],
        leadStatusData: leadStatusQuery.data || [],
        jobStatusData: jobStatusQuery.data || [],
        loading: isLoading,
        refresh: refetch
    };
}

export default useDashboardData;
