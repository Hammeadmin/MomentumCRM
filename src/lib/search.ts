/**
 * Global Search Module
 * Provides real-time search across customers, orders, leads, and invoices
 */

import { supabase } from './supabase';

// ============================================================================
// Types
// ============================================================================

export interface SearchResult {
    id: string;
    type: 'customer' | 'order' | 'quote' | 'invoice' | 'lead' | 'event';
    title: string;
    subtitle?: string;
    url: string;
}

interface SearchOptions {
    limit?: number;
}

// ============================================================================
// Search Functions
// ============================================================================

/**
 * Search customers by name, email, or phone
 */
async function searchCustomers(
    query: string,
    organisationId: string,
    limit: number
): Promise<SearchResult[]> {
    try {
        // Use separate queries and combine - more reliable than .or() with ilike
        const searchPattern = `%${query}%`;

        console.log('[searchCustomers] Searching with:', {
            pattern: searchPattern,
            organisationId,
            query
        });

        const { data, error } = await supabase
            .from('customers')
            .select('id, name, email, city, phone_number')
            .eq('organisation_id', organisationId)
            .ilike('name', searchPattern)
            .limit(limit);

        console.log('[searchCustomers] Query result:', {
            error: error ? { message: error.message, code: error.code, hint: error.hint, details: error.details } : null,
            dataCount: data?.length,
            data
        });

        if (error) {
            console.error('Error searching customers by name:', error.message, error.code, error.hint);
        }

        // Also search by email if name search returns few results
        let emailResults: any[] = [];
        if ((data?.length || 0) < limit) {
            const { data: emailData } = await supabase
                .from('customers')
                .select('id, name, email, city, phone_number')
                .eq('organisation_id', organisationId)
                .ilike('email', searchPattern)
                .limit(limit - (data?.length || 0));
            emailResults = emailData || [];
        }

        // Also search by phone
        let phoneResults: any[] = [];
        if ((data?.length || 0) + emailResults.length < limit) {
            const { data: phoneData } = await supabase
                .from('customers')
                .select('id, name, email, city, phone_number')
                .eq('organisation_id', organisationId)
                .ilike('phone_number', searchPattern)
                .limit(limit - (data?.length || 0) - emailResults.length);
            phoneResults = phoneData || [];
        }

        // Combine and dedupe by id
        const allResults = [...(data || []), ...emailResults, ...phoneResults];
        const uniqueResults = allResults.filter((item, index, self) =>
            index === self.findIndex(t => t.id === item.id)
        );

        return uniqueResults.slice(0, limit).map(customer => ({
            id: customer.id,
            type: 'customer' as const,
            title: customer.name || 'Okänd kund',
            subtitle: customer.city || customer.email || undefined,
            url: `/kunder?id=${customer.id}`
        }));
    } catch (error) {
        console.error('Error in searchCustomers:', error);
        return [];
    }
}

/**
 * Search orders by title or order number
 */
async function searchOrders(
    query: string,
    organisationId: string,
    limit: number
): Promise<SearchResult[]> {
    try {
        const searchPattern = `%${query}%`;

        // Search by title
        const { data: titleData, error: titleError } = await supabase
            .from('orders')
            .select('id, title, order_number, status, customer_id')
            .eq('organisation_id', organisationId)
            .ilike('title', searchPattern)
            .limit(limit);

        if (titleError) {
            console.error('Error searching orders by title:', titleError);
        }

        // Search by order number
        let orderNumResults: any[] = [];
        if ((titleData?.length || 0) < limit) {
            const { data: orderData } = await supabase
                .from('orders')
                .select('id, title, order_number, status, customer_id')
                .eq('organisation_id', organisationId)
                .ilike('order_number', searchPattern)
                .limit(limit - (titleData?.length || 0));
            orderNumResults = orderData || [];
        }

        // Combine and dedupe
        const allResults = [...(titleData || []), ...orderNumResults];
        const uniqueResults = allResults.filter((item, index, self) =>
            index === self.findIndex(t => t.id === item.id)
        );

        // Get customer names for results
        const customerIds = uniqueResults.map(o => o.customer_id).filter(Boolean);
        let customerMap: Record<string, string> = {};

        if (customerIds.length > 0) {
            const { data: customers } = await supabase
                .from('customers')
                .select('id, name')
                .in('id', customerIds);

            customerMap = (customers || []).reduce((acc, c) => {
                acc[c.id] = c.name;
                return acc;
            }, {} as Record<string, string>);
        }

        return uniqueResults.slice(0, limit).map(order => ({
            id: order.id,
            type: 'order' as const,
            title: order.order_number || order.title || 'Order',
            subtitle: customerMap[order.customer_id] || order.status || undefined,
            url: `/Orderhantering?order=${order.id}`
        }));
    } catch (error) {
        console.error('Error in searchOrders:', error);
        return [];
    }
}

/**
 * Search leads by title or description
 */
async function searchLeads(
    query: string,
    organisationId: string,
    limit: number
): Promise<SearchResult[]> {
    try {
        const searchPattern = `%${query}%`;

        // Search by title
        const { data: titleData, error } = await supabase
            .from('leads')
            .select('id, title, status, customer_id, description')
            .eq('organisation_id', organisationId)
            .ilike('title', searchPattern)
            .limit(limit);

        if (error) {
            console.error('Error searching leads:', error);
        }

        // Search by description if needed
        let descResults: any[] = [];
        if ((titleData?.length || 0) < limit) {
            const { data: descData } = await supabase
                .from('leads')
                .select('id, title, status, customer_id, description')
                .eq('organisation_id', organisationId)
                .ilike('description', searchPattern)
                .limit(limit - (titleData?.length || 0));
            descResults = descData || [];
        }

        // Combine and dedupe
        const allResults = [...(titleData || []), ...descResults];
        const uniqueResults = allResults.filter((item, index, self) =>
            index === self.findIndex(t => t.id === item.id)
        );

        // Get customer names
        const customerIds = uniqueResults.map(l => l.customer_id).filter(Boolean);
        let customerMap: Record<string, string> = {};

        if (customerIds.length > 0) {
            const { data: customers } = await supabase
                .from('customers')
                .select('id, name')
                .in('id', customerIds);

            customerMap = (customers || []).reduce((acc, c) => {
                acc[c.id] = c.name;
                return acc;
            }, {} as Record<string, string>);
        }

        const statusLabels: Record<string, string> = {
            'new': 'Ny',
            'contacted': 'Kontaktad',
            'qualified': 'Kvalificerad',
            'proposal': 'Offert skickad',
            'negotiation': 'Förhandling',
            'won': 'Vunnen',
            'lost': 'Förlorad'
        };

        return uniqueResults.slice(0, limit).map(lead => ({
            id: lead.id,
            type: 'lead' as const,
            title: lead.title || 'Lead',
            subtitle: customerMap[lead.customer_id] || statusLabels[lead.status] || lead.status || undefined,
            url: `/leads?id=${lead.id}`
        }));
    } catch (error) {
        console.error('Error in searchLeads:', error);
        return [];
    }
}

/**
 * Search invoices by invoice number
 */
async function searchInvoices(
    query: string,
    organisationId: string,
    limit: number
): Promise<SearchResult[]> {
    try {
        const searchPattern = `%${query}%`;

        const { data, error } = await supabase
            .from('invoices')
            .select('id, invoice_number, status, amount, customer_id')
            .eq('organisation_id', organisationId)
            .ilike('invoice_number', searchPattern)
            .limit(limit);

        if (error) {
            console.error('Error searching invoices:', error);
            return [];
        }

        // Get customer names
        const customerIds = (data || []).map(i => i.customer_id).filter(Boolean);
        let customerMap: Record<string, string> = {};

        if (customerIds.length > 0) {
            const { data: customers } = await supabase
                .from('customers')
                .select('id, name')
                .in('id', customerIds);

            customerMap = (customers || []).reduce((acc, c) => {
                acc[c.id] = c.name;
                return acc;
            }, {} as Record<string, string>);
        }

        const formatAmount = (amount: number | null) => {
            if (!amount) return '';
            return new Intl.NumberFormat('sv-SE', {
                style: 'currency',
                currency: 'SEK',
                maximumFractionDigits: 0
            }).format(amount);
        };

        const statusLabels: Record<string, string> = {
            'draft': 'Utkast',
            'sent': 'Skickad',
            'paid': 'Betald',
            'overdue': 'Förfallen',
            'cancelled': 'Avbruten'
        };

        return (data || []).map(invoice => ({
            id: invoice.id,
            type: 'invoice' as const,
            title: invoice.invoice_number || 'Faktura',
            subtitle: [
                customerMap[invoice.customer_id],
                formatAmount(invoice.amount),
                statusLabels[invoice.status] || invoice.status
            ].filter(Boolean).join(' · '),
            url: `/fakturor?id=${invoice.id}`
        }));
    } catch (error) {
        console.error('Error in searchInvoices:', error);
        return [];
    }
}

// ============================================================================
// Main Search Function
// ============================================================================

/**
 * Perform a global search across all entities
 * Searches in parallel across customers, orders, leads, and invoices
 */
export async function searchGlobal(
    query: string,
    organisationId: string,
    options: SearchOptions = {}
): Promise<SearchResult[]> {
    const { limit = 5 } = options;

    // Don't search if query is too short
    if (!query || query.trim().length < 2) {
        return [];
    }

    const trimmedQuery = query.trim().toLowerCase();

    // DEBUG: Log the search parameters
    console.log('[GlobalSearch] Searching for:', trimmedQuery, 'in org:', organisationId);

    try {
        // Execute all searches in parallel
        const [customers, orders, leads, invoices] = await Promise.all([
            searchCustomers(trimmedQuery, organisationId, limit),
            searchOrders(trimmedQuery, organisationId, limit),
            searchLeads(trimmedQuery, organisationId, limit),
            searchInvoices(trimmedQuery, organisationId, limit)
        ]);

        // DEBUG: Log results from each search
        console.log('[GlobalSearch] Results:', {
            customers: customers.length,
            orders: orders.length,
            leads: leads.length,
            invoices: invoices.length,
            customerNames: customers.map(c => c.title)
        });

        // Combine and return results (ordered by type for better UX)
        const results: SearchResult[] = [
            ...customers,
            ...orders,
            ...leads,
            ...invoices
        ];

        // Limit total results to prevent overwhelming the UI
        return results.slice(0, limit * 4);
    } catch (error) {
        console.error('Global search error:', error);
        return [];
    }
}

export default searchGlobal;
