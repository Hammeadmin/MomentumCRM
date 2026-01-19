import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { getInvoices, type InvoiceWithRelations, type InvoiceFilters } from '../lib/invoices';
import { getCreditNotes, type CreditNote } from '../lib/creditNotes';
import { getOrders, type OrderWithRelations } from '../lib/orders';
import { getCustomers, getTeamMembers, getSystemSettings, getSavedLineItems, getOrganisation } from '../lib/database';
import { getTeams, type TeamWithRelations } from '../lib/teams';
import { getQuoteTemplates, type QuoteTemplate } from '../lib/quoteTemplates';
import type { Customer, UserProfile, Organisation, SystemSettings, SavedLineItem } from '../types/database';

export interface InvoiceData {
    invoices: InvoiceWithRelations[];
    readyToInvoiceOrders: OrderWithRelations[];
    creditNotes: CreditNote[];
    customers: Customer[];
    teamMembers: UserProfile[];
    teams: TeamWithRelations[];
    systemSettings: SystemSettings | null;
    savedLineItems: SavedLineItem[];
    templates: QuoteTemplate[];
    organisation: Organisation | null;
}

export interface UseInvoicesResult extends InvoiceData {
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
}

/**
 * Custom hook to fetch all Invoice management data using React Query.
 * Fetches invoices, ready-to-invoice orders, credit notes, customers,
 * team members, teams, settings, saved line items, templates, and organisation in parallel.
 *
 * @param filters - Optional filters for the invoices query
 * @param activeTab - Current active tab ('invoices' | 'ready-to-invoice' | 'credit_notes')
 * @returns Object containing all invoice data, loading state, and error
 */
export function useInvoices(
    filters: InvoiceFilters = {},
    activeTab: 'invoices' | 'ready-to-invoice' | 'credit_notes' = 'invoices'
): UseInvoicesResult {
    const { organisationId } = useAuth();

    const {
        data,
        isLoading,
        error,
        refetch,
    } = useQuery<InvoiceData, Error>({
        queryKey: ['invoice-data', organisationId, filters, activeTab],
        queryFn: async (): Promise<InvoiceData> => {
            if (!organisationId) {
                throw new Error('Organisation ID is required');
            }

            // Fetch all common data in parallel
            const [
                customersResult,
                teamMembersResult,
                teamsResult,
                settingsResult,
                savedItemsResult,
                orgResult,
                templatesResult,
                ordersResult,
            ] = await Promise.all([
                getCustomers(organisationId),
                getTeamMembers(organisationId),
                getTeams(organisationId),
                getSystemSettings(organisationId),
                getSavedLineItems(organisationId),
                getOrganisation(organisationId),
                getQuoteTemplates(organisationId),
                getOrders(organisationId, { status: 'redo_fakturera' }),
            ]);

            // Check for critical errors
            if (customersResult.error) throw customersResult.error;
            if (teamMembersResult.error) throw teamMembersResult.error;
            if (teamsResult.error) throw teamsResult.error;
            if (orgResult.error) throw orgResult.error;

            // Filter templates to only invoice templates
            const invoiceTemplates = (templatesResult.data || []).filter(
                t => t.settings?.template_type === 'invoice'
            );

            // Fetch tab-specific data based on activeTab
            let invoicesData: InvoiceWithRelations[] = [];
            let creditNotesData: CreditNote[] = [];

            if (activeTab === 'invoices') {
                const invoicesResult = await getInvoices(organisationId, filters);
                if (invoicesResult.error) throw invoicesResult.error;
                invoicesData = invoicesResult.data || [];
            }

            if (activeTab === 'credit_notes') {
                const creditNotesResult = await getCreditNotes(organisationId);
                if (creditNotesResult.error) throw creditNotesResult.error;
                creditNotesData = creditNotesResult.data || [];
            }

            return {
                invoices: invoicesData,
                readyToInvoiceOrders: ordersResult.data || [],
                creditNotes: creditNotesData,
                customers: customersResult.data || [],
                teamMembers: teamMembersResult.data || [],
                teams: teamsResult.data || [],
                systemSettings: settingsResult.data || null,
                savedLineItems: savedItemsResult.data || [],
                templates: invoiceTemplates,
                organisation: orgResult.data || null,
            };
        },
        enabled: !!organisationId,
        staleTime: 60000, // 1 minute - prevent refetching on every render
        gcTime: 300000,   // 5 minutes - keep data in cache for garbage collection
    });

    return {
        invoices: data?.invoices || [],
        readyToInvoiceOrders: data?.readyToInvoiceOrders || [],
        creditNotes: data?.creditNotes || [],
        customers: data?.customers || [],
        teamMembers: data?.teamMembers || [],
        teams: data?.teams || [],
        systemSettings: data?.systemSettings || null,
        savedLineItems: data?.savedLineItems || [],
        templates: data?.templates || [],
        organisation: data?.organisation || null,
        isLoading,
        error: error || null,
        refetch,
    };
}

export default useInvoices;
