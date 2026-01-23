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
 * Optimized: Uses single .or() query and starts-with pattern for index utilization
 */
async function searchCustomers(
    query: string,
    organisationId: string,
    limit: number
): Promise<SearchResult[]> {
    try {
        // Use starts-with pattern for index utilization, fallback to contains if no results
        const startsWithPattern = `${query}%`;
        const containsPattern = `%${query}%`;

        // Single query with .or() instead of daisy-chaining multiple queries
        const { data, error } = await supabase
            .from('customers')
            .select('id, name, email, city, phone_number')
            .eq('organisation_id', organisationId)
            .or(`name.ilike.${startsWithPattern},email.ilike.${startsWithPattern},phone_number.ilike.${startsWithPattern}`)
            .limit(limit);

        if (error) {
            console.error('Error searching customers:', error.message);
        }

        // If starts-with returns few results, try contains pattern (slower but more thorough)
        let allResults = data || [];
        if (allResults.length < limit) {
            const { data: containsData } = await supabase
                .from('customers')
                .select('id, name, email, city, phone_number')
                .eq('organisation_id', organisationId)
                .or(`name.ilike.${containsPattern},email.ilike.${containsPattern},phone_number.ilike.${containsPattern}`)
                .limit(limit);

            // Merge and dedupe
            const existingIds = new Set(allResults.map((r: any) => r.id));
            const newResults = (containsData || []).filter((r: any) => !existingIds.has(r.id));
            allResults = [...allResults, ...newResults];
        }

        return allResults.slice(0, limit).map((customer: any) => ({
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
 * Search orders by title
 * Optimized: Uses starts-with pattern for index utilization
 * Note: orders table has 'title' column, NOT 'order_number'
 */
async function searchOrders(
    query: string,
    organisationId: string,
    limit: number
): Promise<SearchResult[]> {
    try {
        const startsWithPattern = `${query}%`;
        const containsPattern = `%${query}%`;

        // Search by title only (no order_number column exists)
        const { data, error } = await supabase
            .from('orders')
            .select('id, title, status, customer_id')
            .eq('organisation_id', organisationId)
            .ilike('title', startsWithPattern)
            .limit(limit);

        if (error) {
            console.error('Error searching orders:', error);
        }

        // Fallback to contains if starts-with returns few results
        let allResults = data || [];
        if (allResults.length < limit) {
            const { data: containsData } = await supabase
                .from('orders')
                .select('id, title, status, customer_id')
                .eq('organisation_id', organisationId)
                .ilike('title', containsPattern)
                .limit(limit);

            const existingIds = new Set(allResults.map((r: any) => r.id));
            const newResults = (containsData || []).filter((r: any) => !existingIds.has(r.id));
            allResults = [...allResults, ...newResults];
        }

        // Get customer names for results
        const customerIds = allResults.map((o: any) => o.customer_id).filter(Boolean);
        let customerMap: Record<string, string> = {};

        if (customerIds.length > 0) {
            const { data: customers } = await supabase
                .from('customers')
                .select('id, name')
                .in('id', customerIds);

            customerMap = (customers || []).reduce((acc: Record<string, string>, c: any) => {
                acc[c.id] = c.name;
                return acc;
            }, {});
        }

        return allResults.slice(0, limit).map((order: any) => ({
            id: order.id,
            type: 'order' as const,
            title: order.title || 'Order',
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
 * Optimized: Uses single .or() query and starts-with pattern
 */
async function searchLeads(
    query: string,
    organisationId: string,
    limit: number
): Promise<SearchResult[]> {
    try {
        const startsWithPattern = `${query}%`;
        const containsPattern = `%${query}%`;

        // Single query with .or() for title and description
        const { data, error } = await supabase
            .from('leads')
            .select('id, title, status, customer_id, description')
            .eq('organisation_id', organisationId)
            .or(`title.ilike.${startsWithPattern},description.ilike.${startsWithPattern}`)
            .limit(limit);

        if (error) {
            console.error('Error searching leads:', error);
        }

        // Fallback to contains if starts-with returns few results
        let allResults = data || [];
        if (allResults.length < limit) {
            const { data: containsData } = await supabase
                .from('leads')
                .select('id, title, status, customer_id, description')
                .eq('organisation_id', organisationId)
                .or(`title.ilike.${containsPattern},description.ilike.${containsPattern}`)
                .limit(limit);

            const existingIds = new Set(allResults.map((r: any) => r.id));
            const newResults = (containsData || []).filter((r: any) => !existingIds.has(r.id));
            allResults = [...allResults, ...newResults];
        }

        // Get customer names
        const customerIds = allResults.map((l: any) => l.customer_id).filter(Boolean);
        let customerMap: Record<string, string> = {};

        if (customerIds.length > 0) {
            const { data: customers } = await supabase
                .from('customers')
                .select('id, name')
                .in('id', customerIds);

            customerMap = (customers || []).reduce((acc: Record<string, string>, c: any) => {
                acc[c.id] = c.name;
                return acc;
            }, {});
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

        return allResults.slice(0, limit).map((lead: any) => ({
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
 * Optimized: Uses starts-with pattern for index utilization
 */
async function searchInvoices(
    query: string,
    organisationId: string,
    limit: number
): Promise<SearchResult[]> {
    try {
        const startsWithPattern = `${query}%`;
        const containsPattern = `%${query}%`;

        // Try starts-with first for index utilization
        let { data, error } = await supabase
            .from('invoices')
            .select('id, invoice_number, status, amount, customer_id')
            .eq('organisation_id', organisationId)
            .ilike('invoice_number', startsWithPattern)
            .limit(limit);

        if (error) {
            console.error('Error searching invoices:', error);
            return [];
        }

        // Fallback to contains if starts-with returns few results
        let allResults = data || [];
        if (allResults.length < limit) {
            const { data: containsData } = await supabase
                .from('invoices')
                .select('id, invoice_number, status, amount, customer_id')
                .eq('organisation_id', organisationId)
                .ilike('invoice_number', containsPattern)
                .limit(limit);

            const existingIds = new Set(allResults.map((r: any) => r.id));
            const newResults = (containsData || []).filter((r: any) => !existingIds.has(r.id));
            allResults = [...allResults, ...newResults];
        }

        // Get customer names
        const customerIds = allResults.map((i: any) => i.customer_id).filter(Boolean);
        let customerMap: Record<string, string> = {};

        if (customerIds.length > 0) {
            const { data: customers } = await supabase
                .from('customers')
                .select('id, name')
                .in('id', customerIds);

            customerMap = (customers || []).reduce((acc: Record<string, string>, c: any) => {
                acc[c.id] = c.name;
                return acc;
            }, {});
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

        return allResults.slice(0, limit).map((invoice: any) => ({
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
