import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { getOrders, type OrderWithRelations, type OrderFilters } from '../lib/orders';
import { getLeads, type LeadWithRelations } from '../lib/leads';
import { getQuotes, type QuoteWithRelations } from '../lib/quotes';
import { getTeams, type TeamWithRelations } from '../lib/teams';
import { getCustomers, getTeamMembers } from '../lib/database';
import type { Customer, UserProfile } from '../types/database';

export interface KanbanData {
    orders: OrderWithRelations[];
    leads: LeadWithRelations[];
    quotes: QuoteWithRelations[];
    customers: Customer[];
    teamMembers: UserProfile[];
    teams: TeamWithRelations[];
}

export interface UseKanbanDataResult extends KanbanData {
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
}

/**
 * Custom hook to fetch all Kanban board data using React Query.
 * Fetches orders, leads, quotes, customers, team members, and teams in parallel.
 *
 * @param filters - Optional filters for the orders query
 * @returns Object containing all Kanban data, loading state, and error
 */
export function useKanbanData(filters: OrderFilters = {}): UseKanbanDataResult {
    const { organisationId } = useAuth();

    const {
        data,
        isLoading,
        error,
        refetch,
    } = useQuery<KanbanData, Error>({
        queryKey: ['kanban-data', organisationId, filters],
        queryFn: async (): Promise<KanbanData> => {
            if (!organisationId) {
                throw new Error('Organisation ID is required');
            }

            // Fetch all data in parallel using Promise.all
            const [
                ordersResult,
                leadsResult,
                quotesResult,
                customersResult,
                teamMembersResult,
                teamsResult,
            ] = await Promise.all([
                getOrders(organisationId, filters),
                getLeads(organisationId, { status: 'new' }),
                getQuotes(organisationId, { status: 'draft' }),
                getCustomers(organisationId),
                getTeamMembers(organisationId),
                getTeams(organisationId),
            ]);

            // Check for errors and throw if any
            if (ordersResult.error) throw ordersResult.error;
            if (leadsResult.error) throw leadsResult.error;
            if (quotesResult.error) throw quotesResult.error;
            if (customersResult.error) throw customersResult.error;
            if (teamMembersResult.error) throw teamMembersResult.error;
            if (teamsResult.error) throw teamsResult.error;

            return {
                orders: ordersResult.data || [],
                leads: leadsResult.data || [],
                quotes: quotesResult.data || [],
                customers: customersResult.data || [],
                teamMembers: teamMembersResult.data || [],
                teams: teamsResult.data || [],
            };
        },
        enabled: !!organisationId, // Only run query if organisationId is available
    });

    return {
        orders: data?.orders || [],
        leads: data?.leads || [],
        quotes: data?.quotes || [],
        customers: data?.customers || [],
        teamMembers: data?.teamMembers || [],
        teams: data?.teams || [],
        isLoading,
        error: error || null,
        refetch,
    };
}

export default useKanbanData;
