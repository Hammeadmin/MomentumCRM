import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import {
    getKanbanOrders,
    getMoreOrdersByStatus,
    type OrderWithRelations,
    type OrderFilters,
    type KanbanOrdersResult
} from '../lib/orders';
import { getLeads, type LeadWithRelations } from '../lib/leads';
import { getQuotes, type QuoteWithRelations } from '../lib/quotes';
import { getTeams, type TeamWithRelations } from '../lib/teams';
import { getCustomers, getTeamMembers } from '../lib/database';
import type { Customer, UserProfile, OrderStatus } from '../types/database';

export interface KanbanData {
    orders: OrderWithRelations[];
    leads: LeadWithRelations[];
    quotes: QuoteWithRelations[];
    customers: Customer[];
    teamMembers: UserProfile[];
    teams: TeamWithRelations[];
    orderCountsByStatus: Record<string, number>;
}

export interface UseKanbanDataResult extends KanbanData {
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
    loadMoreOrders: (status: OrderStatus, currentCount: number) => Promise<OrderWithRelations[]>;
    isLoadingMore: boolean;
}

/**
 * Custom hook to fetch all Kanban board data using React Query.
 * Uses the optimized getKanbanOrders function which fetches top 20 orders
 * per status column in parallel, rather than paginating all orders.
 *
 * @param filters - Optional filters for the orders query (currently unused for Kanban)
 * @returns Object containing all Kanban data, loading state, error, and loadMore function
 */
export function useKanbanData(filters: OrderFilters = {}): UseKanbanDataResult {
    const { organisationId } = useAuth();
    const queryClient = useQueryClient();

    const {
        data,
        isLoading,
        error,
        refetch,
    } = useQuery<KanbanData, Error>({
        queryKey: ['kanban-data', organisationId],
        queryFn: async (): Promise<KanbanData> => {
            if (!organisationId) {
                throw new Error('Organisation ID is required');
            }

            // Fetch all data in parallel using Promise.all
            // Note: getKanbanOrders fetches top 20 per status in parallel internally
            const [
                kanbanOrdersResult,
                leadsResult,
                quotesResult,
                customersResult,
                teamMembersResult,
                teamsResult,
            ] = await Promise.all([
                getKanbanOrders(organisationId),
                getLeads(organisationId, { status: 'new' }),
                getQuotes(organisationId, { status: 'draft' }),
                getCustomers(organisationId),
                getTeamMembers(organisationId),
                getTeams(organisationId),
            ]);

            // Check for errors and throw if any
            if (kanbanOrdersResult.error) throw kanbanOrdersResult.error;
            if (leadsResult.error) throw leadsResult.error;
            if (quotesResult.error) throw quotesResult.error;
            if (customersResult.error) throw customersResult.error;
            if (teamMembersResult.error) throw teamMembersResult.error;
            if (teamsResult.error) throw teamsResult.error;

            return {
                orders: kanbanOrdersResult.data || [],
                leads: leadsResult.data || [],
                quotes: quotesResult.data || [],
                customers: customersResult.data || [],
                teamMembers: teamMembersResult.data || [],
                teams: teamsResult.data || [],
                orderCountsByStatus: kanbanOrdersResult.countsByStatus || {},
            };
        },
        enabled: !!organisationId, // Only run query if organisationId is available
    });

    // Mutation for loading more orders for a specific status
    const loadMoreMutation = useMutation({
        mutationFn: async ({ status, offset }: { status: OrderStatus; offset: number }) => {
            if (!organisationId) {
                throw new Error('Organisation ID is required');
            }
            const result = await getMoreOrdersByStatus(organisationId, status, offset);
            if (result.error) throw result.error;
            return { status, orders: result.data || [] };
        },
        onSuccess: ({ status, orders }) => {
            // Merge new orders into the cache
            queryClient.setQueryData<KanbanData>(['kanban-data', organisationId], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    orders: [...old.orders, ...orders],
                };
            });
        },
    });

    /**
     * Load more orders for a specific status column
     * @param status - The status to load more orders for
     * @param currentCount - Current number of orders shown for this status (used as offset)
     * @returns Promise resolving to the new orders fetched
     */
    const loadMoreOrders = async (status: OrderStatus, currentCount: number): Promise<OrderWithRelations[]> => {
        const result = await loadMoreMutation.mutateAsync({ status, offset: currentCount });
        return result.orders;
    };

    return {
        orders: data?.orders || [],
        leads: data?.leads || [],
        quotes: data?.quotes || [],
        customers: data?.customers || [],
        teamMembers: data?.teamMembers || [],
        teams: data?.teams || [],
        orderCountsByStatus: data?.orderCountsByStatus || {},
        isLoading,
        error: error || null,
        refetch,
        loadMoreOrders,
        isLoadingMore: loadMoreMutation.isPending,
    };
}

export default useKanbanData;
