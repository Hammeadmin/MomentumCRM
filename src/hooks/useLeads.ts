import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { getLeads, type LeadWithRelations, type LeadFilters } from '../lib/leads';
import { getCustomers, getTeamMembers } from '../lib/database';
import type { Customer, UserProfile } from '../types/database';

export interface LeadsData {
    leads: LeadWithRelations[];
    customers: Customer[];
    teamMembers: UserProfile[];
}

export interface UseLeadsResult extends LeadsData {
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
}

/**
 * Custom hook to fetch Leads data.
 * Fetches leads, customers, and team members in parallel.
 *
 * @param filters - Optional filters for the leads query
 * @returns Object containing leads data, customers, team members, loading state, and error
 */
export function useLeads(filters: LeadFilters = {}): UseLeadsResult {
    const { organisationId } = useAuth();

    const {
        data,
        isLoading,
        error,
        refetch,
    } = useQuery<LeadsData, Error>({
        queryKey: ['leads-data', organisationId, filters],
        queryFn: async (): Promise<LeadsData> => {
            if (!organisationId) {
                throw new Error('Organisation ID is required');
            }

            // Fetch all data in parallel using Promise.all
            const [
                leadsResult,
                customersResult,
                teamMembersResult,
            ] = await Promise.all([
                getLeads(organisationId, filters),
                getCustomers(organisationId),
                getTeamMembers(organisationId),
            ]);

            // Check for errors and throw if any
            if (leadsResult.error) throw leadsResult.error;
            if (customersResult.error) throw customersResult.error;
            if (teamMembersResult.error) throw teamMembersResult.error;

            return {
                leads: leadsResult.data || [],
                customers: customersResult.data || [],
                teamMembers: teamMembersResult.data || [],
            };
        },
        enabled: !!organisationId, // Only run query if organisationId is available
        staleTime: 60000, // 1 minute - prevent refetching on every render
        gcTime: 300000,   // 5 minutes - keep data in cache for garbage collection
    });

    return {
        leads: data?.leads || [],
        customers: data?.customers || [],
        teamMembers: data?.teamMembers || [],
        isLoading,
        error: error || null,
        refetch,
    };
}

export default useLeads;
