/**
 * Fortnox Integration Library
 * 
 * Handles customer and invoice sync to Fortnox accounting system.
 * Uses the fortnox-api Edge Function for OAuth and API proxy.
 */

import { supabase } from './supabase';
import type { InvoiceWithRelations, InvoiceLineItem } from './invoices';

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Customer interface based on customers table schema
 */
export interface Customer {
    id: string;
    organisation_id: string;
    name: string;
    email?: string;
    phone_number?: string;
    address?: string;
    postal_code?: string;
    city?: string;
    org_number?: string;
    customer_type: 'company' | 'private';
    vat_handling: string;
    include_rot?: boolean;
    rot_personnummer?: string;
    rot_fastighetsbeteckning?: string;
    include_rut?: boolean;
    rut_personnummer?: string;
    fortnox_customer_number?: string;
    created_at?: string;
}

/**
 * Fortnox Customer format
 */
interface FortnoxCustomer {
    CustomerNumber?: string;
    Name: string;
    Email?: string;
    Phone1?: string;
    Address1?: string;
    ZipCode?: string;
    City?: string;
    OrganisationNumber?: string;
    Type?: 'COMPANY' | 'PRIVATE';
    VATType?: 'SEVAT' | 'EUVAT' | 'EXPORT';
}

/**
 * Fortnox Invoice format
 */
interface FortnoxInvoice {
    CustomerNumber: string;
    InvoiceDate?: string;
    DueDate?: string;
    YourReference?: string;
    OurReference?: string;
    Remarks?: string;
    InvoiceRows: FortnoxInvoiceRow[];
}

/**
 * Fortnox Invoice Row format
 */
interface FortnoxInvoiceRow {
    ArticleNumber?: string;
    Description: string;
    DeliveredQuantity: number;
    Price: number;
    VAT?: number;
    Unit?: string;
}

/**
 * Fortnox connection status
 */
export interface FortnoxConnectionStatus {
    isConnected: boolean;
    isExpired: boolean;
    expiresAt?: string;
}

// ============================================================================
// Connection Management
// ============================================================================

/**
 * Check if Fortnox is connected for the organisation
 */
export async function getFortnoxConnectionStatus(
    organisationId: string
): Promise<FortnoxConnectionStatus> {
    const { data, error } = await supabase
        .from('organisations')
        .select('fortnox_access_token, fortnox_token_expires_at')
        .eq('id', organisationId)
        .single();

    if (error || !data) {
        return { isConnected: false, isExpired: false };
    }

    const hasToken = !!data.fortnox_access_token;
    const isExpired = hasToken && data.fortnox_token_expires_at
        ? new Date(data.fortnox_token_expires_at) <= new Date()
        : false;
    const isConnected = hasToken && !isExpired;

    return {
        isConnected,
        isExpired,
        expiresAt: data.fortnox_token_expires_at,
    };
}

// Client credentials (FORTNOX_CLIENT_ID / FORTNOX_CLIENT_SECRET) are app-level env
// vars on the server. They are NOT stored per-organisation in the database.

/**
 * Get Fortnox OAuth URL
 * Uses VITE_FORTNOX_CLIENT_ID from environment — the client ID is an app-level
 * credential, not per-organisation.
 */
export function getFortnoxAuthUrl(
    redirectUri: string,
    organisationId: string
): string {
    const clientId = import.meta.env.VITE_FORTNOX_CLIENT_ID;
    if (!clientId) {
        throw new Error('VITE_FORTNOX_CLIENT_ID is not configured');
    }

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'invoice customer companyinformation',
        state: organisationId,
        access_type: 'offline',
        response_type: 'code',
    });

    return `https://apps.fortnox.se/oauth-v1/auth?${params.toString()}`;
}

/**
 * Initiate Fortnox OAuth connection — navigates to Fortnox auth page
 */
export function connectFortnox(
    organisationId: string,
    redirectUri: string
): void {
    const authUrl = getFortnoxAuthUrl(redirectUri, organisationId);
    window.location.href = authUrl;
}

/**
 * Exchange OAuth authorization code for tokens via the fortnox-api Edge Function
 */
export async function exchangeFortnoxCode(
    organisationId: string,
    code: string,
    redirectUri: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { data, error } = await supabase.functions.invoke('fortnox-api', {
            body: {
                action: 'auth',
                organisation_id: organisationId,
                code,
                redirect_uri: redirectUri,
            },
        });

        if (error) {
            return { success: false, error: error.message };
        }

        return data;
    } catch (err) {
        return { success: false, error: (err as Error).message };
    }
}

/**
 * Test the Fortnox connection by fetching company information
 */
export async function testFortnoxConnection(
    organisationId: string
): Promise<{ success: boolean; companyName?: string; error?: string }> {
    const result = await fortnoxApiRequest<{ CompanyInformation: { CompanyName: string } }>(
        organisationId,
        'GET',
        '/companyinformation'
    );

    if (!result.success) {
        return { success: false, error: result.error };
    }

    return {
        success: true,
        companyName: result.data?.CompanyInformation?.CompanyName,
    };
}

/**
 * Sync invoices TO Fortnox via the sync-fortnox Edge Function
 */
export async function syncInvoicesToFortnox(
    organisationId: string,
    ids?: string[]
): Promise<{ success: number; failed: number; errors: string[] }> {
    try {
        const { data, error } = await supabase.functions.invoke('sync-fortnox', {
            body: {
                action: 'sync-invoices',
                organisation_id: organisationId,
                ...(ids && ids.length > 0 ? { ids } : {}),
            },
        });

        if (error) {
            return { success: 0, failed: 0, errors: [error.message] };
        }

        return {
            success: data?.success || 0,
            failed: data?.failed || 0,
            errors: data?.errors || [],
        };
    } catch (err) {
        return { success: 0, failed: 0, errors: [(err as Error).message] };
    }
}

/**
 * Sync invoice statuses FROM Fortnox via the sync-from-fortnox Edge Function
 */
export async function syncInvoicesFromFortnox(
    organisationId: string
): Promise<{ success: number; failed: number; errors: string[] }> {
    try {
        const { data, error } = await supabase.functions.invoke('sync-from-fortnox', {
            body: {
                organisation_id: organisationId,
            },
        });

        if (error) {
            return { success: 0, failed: 0, errors: [error.message] };
        }

        return {
            success: data?.success || 0,
            failed: data?.failed || 0,
            errors: data?.errors || [],
        };
    } catch (err) {
        return { success: 0, failed: 0, errors: [(err as Error).message] };
    }
}

/**
 * Complete Fortnox OAuth by exchanging authorization code for tokens
 */
export async function connectToFortnox(
    organisationId: string,
    authCode: string,
    redirectUri: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { data, error } = await supabase.functions.invoke('fortnox-api', {
            body: {
                action: 'auth',
                organisation_id: organisationId,
                code: authCode,
                redirect_uri: redirectUri,
            },
        });

        if (error) {
            return { success: false, error: error.message };
        }

        return data;
    } catch (err) {
        return { success: false, error: (err as Error).message };
    }
}

/**
 * Disconnect Fortnox by clearing tokens
 */
export async function disconnectFortnox(
    organisationId: string
): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
        .from('organisations')
        .update({
            fortnox_access_token: null,
            fortnox_refresh_token: null,
            fortnox_token_expires_at: null,
        })
        .eq('id', organisationId);

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true };
}

// ============================================================================
// API Proxy
// ============================================================================

/**
 * Make a request to Fortnox API through the proxy
 */
async function fortnoxApiRequest<T>(
    organisationId: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: any
): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
        const { data, error } = await supabase.functions.invoke('fortnox-api', {
            body: {
                action: 'proxy',
                organisation_id: organisationId,
                method,
                endpoint,
                body,
            },
        });

        if (error) {
            return { success: false, error: error.message };
        }

        return data;
    } catch (err) {
        return { success: false, error: (err as Error).message };
    }
}

// ============================================================================
// Customer Sync
// ============================================================================

/**
 * Map CRM Customer to Fortnox Customer format
 */
function mapCustomerToFortnox(customer: Customer): FortnoxCustomer {
    return {
        CustomerNumber: customer.fortnox_customer_number || undefined,
        Name: customer.name,
        Email: customer.email || undefined,
        Phone1: customer.phone_number || undefined,
        Address1: customer.address || undefined,
        ZipCode: customer.postal_code || undefined,
        City: customer.city || undefined,
        OrganisationNumber: customer.org_number || undefined,
        Type: customer.customer_type === 'company' ? 'COMPANY' : 'PRIVATE',
        VATType: 'SEVAT', // Swedish VAT
    };
}

/**
 * Export a customer to Fortnox
 */
export async function exportCustomer(
    organisationId: string,
    customer: Customer
): Promise<{ success: boolean; fortnoxCustomerNumber?: string; error?: string }> {
    const fortnoxCustomer = mapCustomerToFortnox(customer);

    let result;

    if (customer.fortnox_customer_number) {
        // Update existing customer
        result = await fortnoxApiRequest<{ Customer: { CustomerNumber: string } }>(
            organisationId,
            'PUT',
            `/customers/${customer.fortnox_customer_number}`,
            { Customer: fortnoxCustomer }
        );
    } else {
        // Create new customer
        result = await fortnoxApiRequest<{ Customer: { CustomerNumber: string } }>(
            organisationId,
            'POST',
            '/customers',
            { Customer: fortnoxCustomer }
        );
    }

    if (!result.success) {
        return { success: false, error: result.error };
    }

    const fortnoxCustomerNumber = result.data?.Customer?.CustomerNumber;

    // Save the Fortnox customer number back to our database
    if (fortnoxCustomerNumber && !customer.fortnox_customer_number) {
        await supabase
            .from('customers')
            .update({ fortnox_customer_number: fortnoxCustomerNumber })
            .eq('id', customer.id);
    }

    return { success: true, fortnoxCustomerNumber };
}

/**
 * Get customer from Fortnox
 */
export async function getFortnoxCustomer(
    organisationId: string,
    customerNumber: string
): Promise<{ success: boolean; data?: any; error?: string }> {
    return fortnoxApiRequest(organisationId, 'GET', `/customers/${customerNumber}`);
}

// ============================================================================
// Invoice Sync
// ============================================================================

/**
 * Map VAT percentage to Fortnox VAT code
 */
function mapVatToFortnoxCode(vatRate: number): number {
    switch (vatRate) {
        case 25:
            return 25;
        case 12:
            return 12;
        case 6:
            return 6;
        case 0:
            return 0;
        default:
            return 25; // Default to 25% Swedish VAT
    }
}

/**
 * Map CRM Invoice to Fortnox Invoice format
 */
function mapInvoiceToFortnox(
    invoice: InvoiceWithRelations,
    fortnoxCustomerNumber: string
): FortnoxInvoice {
    // Get line items from the invoice
    const lineItems = invoice.line_items || invoice.invoice_line_items || [];

    // Determine VAT rate from customer vat_handling
    // '25%' = standard Swedish VAT, 'omvänd byggmoms' = reverse charge (0%)
    const vatRate = invoice.customer?.vat_handling === 'omvänd byggmoms' ? 0 : 25;

    const invoiceRows: FortnoxInvoiceRow[] = lineItems.map((item: InvoiceLineItem) => ({
        Description: item.description,
        DeliveredQuantity: item.quantity,
        Price: item.unit_price,
        VAT: mapVatToFortnoxCode(vatRate),
        Unit: item.unit || 'st',
    }));

    // Format dates to Fortnox format (YYYY-MM-DD)
    const formatDate = (date: string | null | undefined): string | undefined => {
        if (!date) return undefined;
        return new Date(date).toISOString().split('T')[0];
    };

    return {
        CustomerNumber: fortnoxCustomerNumber,
        InvoiceDate: formatDate(invoice.created_at), // Use created_at as invoice date
        DueDate: formatDate(invoice.due_date),
        YourReference: invoice.customer?.name,
        OurReference: invoice.order?.title,
        Remarks: invoice.work_summary || undefined, // Use work_summary for remarks
        InvoiceRows: invoiceRows,
    };
}

/**
 * Export an invoice to Fortnox
 * 
 * Note: The customer must already exist in Fortnox (or be synced first)
 */
export async function exportInvoice(
    organisationId: string,
    invoice: InvoiceWithRelations
): Promise<{ success: boolean; fortnoxInvoiceNumber?: string; error?: string }> {
    // Check if customer has a Fortnox customer number
    let fortnoxCustomerNumber = invoice.customer?.fortnox_customer_number;

    if (!fortnoxCustomerNumber) {
        // Try to sync the customer first
        if (invoice.customer) {
            const customerResult = await exportCustomer(organisationId, invoice.customer as Customer);
            if (!customerResult.success) {
                return { success: false, error: `Failed to sync customer: ${customerResult.error}` };
            }
            fortnoxCustomerNumber = customerResult.fortnoxCustomerNumber;
        } else {
            return { success: false, error: 'Invoice has no customer' };
        }
    }

    if (!fortnoxCustomerNumber) {
        return { success: false, error: 'Customer could not be synced to Fortnox' };
    }

    const fortnoxInvoice = mapInvoiceToFortnox(invoice, fortnoxCustomerNumber);

    let result;

    if (invoice.fortnox_invoice_number) {
        // Update existing invoice (note: Fortnox has restrictions on updating invoices)
        result = await fortnoxApiRequest<{ Invoice: { DocumentNumber: string } }>(
            organisationId,
            'PUT',
            `/invoices/${invoice.fortnox_invoice_number}`,
            { Invoice: fortnoxInvoice }
        );
    } else {
        // Create new invoice
        result = await fortnoxApiRequest<{ Invoice: { DocumentNumber: string } }>(
            organisationId,
            'POST',
            '/invoices',
            { Invoice: fortnoxInvoice }
        );
    }

    if (!result.success) {
        return { success: false, error: result.error };
    }

    const fortnoxInvoiceNumber = result.data?.Invoice?.DocumentNumber;

    // Save the Fortnox invoice number back to our database
    if (fortnoxInvoiceNumber && !invoice.fortnox_invoice_number) {
        await supabase
            .from('invoices')
            .update({
                fortnox_invoice_number: fortnoxInvoiceNumber,
                fortnox_synced_at: new Date().toISOString()
            })
            .eq('id', invoice.id);
    }

    return { success: true, fortnoxInvoiceNumber };
}

/**
 * Get invoice from Fortnox
 */
export async function getFortnoxInvoice(
    organisationId: string,
    invoiceNumber: string
): Promise<{ success: boolean; data?: any; error?: string }> {
    return fortnoxApiRequest(organisationId, 'GET', `/invoices/${invoiceNumber}`);
}

/**
 * Book an invoice in Fortnox (finalize it)
 */
export async function bookFortnoxInvoice(
    organisationId: string,
    invoiceNumber: string
): Promise<{ success: boolean; error?: string }> {
    return fortnoxApiRequest(organisationId, 'PUT', `/invoices/${invoiceNumber}/bookkeep`);
}

/**
 * Mark invoice as paid in Fortnox
 */
export async function markFortnoxInvoicePaid(
    organisationId: string,
    invoiceNumber: string
): Promise<{ success: boolean; error?: string }> {
    // Fortnox uses payments API to mark invoices as paid
    // This would typically create a payment record
    return fortnoxApiRequest(organisationId, 'POST', '/invoicepayments', {
        InvoicePayment: {
            InvoiceNumber: invoiceNumber,
            Amount: 0, // Should be filled with actual amount
            AmountCurrency: 0,
            PaymentDate: new Date().toISOString().split('T')[0],
        }
    });
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Sync all unsynced customers to Fortnox (using Edge Function)
 */
export async function syncAllCustomers(
    organisationId: string
): Promise<{ success: number; failed: number; errors: string[] }> {
    try {
        // Try the optimized Edge Function first
        const { data, error } = await supabase.functions.invoke('sync-fortnox', {
            body: {
                action: 'sync-customers',
                organisation_id: organisationId,
            },
        });

        if (!error && data) {
            console.info('Using optimized sync-fortnox Edge Function');
            return {
                success: data.success || 0,
                failed: data.failed || 0,
                errors: data.errors || []
            };
        }

        // Fallback to legacy implementation
        console.info('Edge Function not available, using legacy sync');
        return syncAllCustomersLegacy(organisationId);
    } catch (err) {
        console.error('Error in syncAllCustomers:', err);
        // Fallback to legacy on any error
        return syncAllCustomersLegacy(organisationId);
    }
}

/**
 * Legacy: Sync all unsynced customers to Fortnox (client-side loop)
 */
export async function syncAllCustomersLegacy(
    organisationId: string
): Promise<{ success: number; failed: number; errors: string[] }> {
    const { data: customers, error } = await supabase
        .from('customers')
        .select('*')
        .eq('organisation_id', organisationId)
        .is('fortnox_customer_number', null);

    if (error || !customers) {
        return { success: 0, failed: 0, errors: [error?.message || 'Failed to fetch customers'] };
    }

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const customer of customers) {
        const result = await exportCustomer(organisationId, customer);
        if (result.success) {
            successCount++;
        } else {
            failedCount++;
            errors.push(`${customer.name}: ${result.error}`);
        }
    }

    return { success: successCount, failed: failedCount, errors };
}

/**
 * Sync all unsynced invoices to Fortnox (using Edge Function)
 */
export async function syncAllInvoices(
    organisationId: string
): Promise<{ success: number; failed: number; errors: string[] }> {
    try {
        // Try the optimized Edge Function first
        const { data, error } = await supabase.functions.invoke('sync-fortnox', {
            body: {
                action: 'sync-invoices',
                organisation_id: organisationId,
            },
        });

        if (!error && data) {
            console.info('Using optimized sync-fortnox Edge Function');
            return {
                success: data.success || 0,
                failed: data.failed || 0,
                errors: data.errors || []
            };
        }

        // Fallback to legacy implementation
        console.info('Edge Function not available, using legacy sync');
        return syncAllInvoicesLegacy(organisationId);
    } catch (err) {
        console.error('Error in syncAllInvoices:', err);
        // Fallback to legacy on any error
        return syncAllInvoicesLegacy(organisationId);
    }
}

/**
 * Legacy: Sync all unsynced invoices to Fortnox (client-side loop)
 */
export async function syncAllInvoicesLegacy(
    organisationId: string
): Promise<{ success: number; failed: number; errors: string[] }> {
    const { data: invoices, error } = await supabase
        .from('invoices')
        .select(`
      *,
      customer:customers(*),
      line_items:invoice_line_items(*)
    `)
        .eq('organisation_id', organisationId)
        .is('fortnox_invoice_number', null);

    if (error || !invoices) {
        return { success: 0, failed: 0, errors: [error?.message || 'Failed to fetch invoices'] };
    }

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const invoice of invoices) {
        const result = await exportInvoice(organisationId, invoice as InvoiceWithRelations);
        if (result.success) {
            successCount++;
        } else {
            failedCount++;
            errors.push(`Invoice ${invoice.invoice_number}: ${result.error}`);
        }
    }

    return { success: successCount, failed: failedCount, errors };
}

