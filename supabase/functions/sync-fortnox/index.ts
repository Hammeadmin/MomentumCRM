/*
# Sync Fortnox Edge Function

Handles batch synchronization of customers and invoices to Fortnox.
Moves looping/batching from client-side to server-side to prevent browser timeouts.

Actions:
- `sync-customers`: Sync all unsynced customers to Fortnox
- `sync-invoices`: Sync all unsynced invoices to Fortnox

Required environment variables:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
*/

import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SyncRequest {
    action: 'sync-customers' | 'sync-invoices';
    organisation_id: string;
    ids?: string[]; // Optional: specific IDs to sync, otherwise sync all unsynced
}

interface SyncResult {
    success: number;
    failed: number;
    errors: string[];
}

// Batch configuration
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 500; // Delay between batches to avoid rate limiting

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const requestData: SyncRequest = await req.json();

        if (!requestData.organisation_id) {
            return new Response(
                JSON.stringify({ success: false, error: 'Missing organisation_id' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        if (!requestData.action) {
            return new Response(
                JSON.stringify({ success: false, error: 'Missing action. Use "sync-customers" or "sync-invoices"' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        // Get organisation's Fortnox credentials to verify connection
        const { data: org, error: orgError } = await supabase
            .from('organisations')
            .select('fortnox_access_token, fortnox_token_expires_at')
            .eq('id', requestData.organisation_id)
            .single();

        if (orgError || !org) {
            return new Response(
                JSON.stringify({ success: false, error: 'Organisation not found' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            );
        }

        if (!org.fortnox_access_token) {
            return new Response(
                JSON.stringify({ success: false, error: 'Fortnox is not connected for this organisation' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        let result: SyncResult;

        if (requestData.action === 'sync-customers') {
            result = await syncCustomers(supabase, requestData.organisation_id, requestData.ids);
        } else if (requestData.action === 'sync-invoices') {
            result = await syncInvoices(supabase, requestData.organisation_id, requestData.ids);
        } else {
            return new Response(
                JSON.stringify({ success: false, error: 'Invalid action. Use "sync-customers" or "sync-invoices"' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        return new Response(
            JSON.stringify(result),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error) {
        console.error('Error in sync-fortnox:', error);
        return new Response(
            JSON.stringify({ success: 0, failed: 0, errors: [(error as Error).message] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});

/**
 * Sync customers to Fortnox in batches
 */
async function syncCustomers(
    supabase: any,
    organisationId: string,
    specificIds?: string[]
): Promise<SyncResult> {
    const result: SyncResult = { success: 0, failed: 0, errors: [] };

    try {
        // Fetch customers to sync
        let query = supabase
            .from('customers')
            .select('*')
            .eq('organisation_id', organisationId);

        if (specificIds && specificIds.length > 0) {
            query = query.in('id', specificIds);
        } else {
            // Only unsynced customers (no fortnox_customer_number)
            query = query.is('fortnox_customer_number', null);
        }

        const { data: customers, error } = await query;

        if (error) {
            result.errors.push(`Failed to fetch customers: ${error.message}`);
            return result;
        }

        if (!customers || customers.length === 0) {
            return result; // No customers to sync
        }

        console.log(`Syncing ${customers.length} customers to Fortnox`);

        // Process in batches
        for (let i = 0; i < customers.length; i += BATCH_SIZE) {
            const batch = customers.slice(i, i + BATCH_SIZE);

            for (const customer of batch) {
                try {
                    // Call fortnox-api edge function to export customer
                    const { data, error: invokeError } = await supabase.functions.invoke('fortnox-api', {
                        body: {
                            action: 'proxy',
                            organisation_id: organisationId,
                            method: 'POST',
                            endpoint: '/customers',
                            body: {
                                Customer: {
                                    Name: customer.name,
                                    Email: customer.email || undefined,
                                    Phone1: customer.phone_number || undefined,
                                    Address1: customer.address || undefined,
                                    ZipCode: customer.postal_code || undefined,
                                    City: customer.city || undefined,
                                    OrganisationNumber: customer.org_number || undefined,
                                    Type: customer.customer_type === 'company' ? 'COMPANY' : 'PRIVATE',
                                    VATType: 'SEVAT',
                                }
                            }
                        }
                    });

                    if (invokeError || !data?.success) {
                        result.failed++;
                        result.errors.push(`${customer.name}: ${invokeError?.message || data?.error || 'Unknown error'}`);
                        continue;
                    }

                    const fortnoxCustomerNumber = data.data?.Customer?.CustomerNumber;

                    // Update customer with Fortnox number
                    if (fortnoxCustomerNumber) {
                        await supabase
                            .from('customers')
                            .update({ fortnox_customer_number: fortnoxCustomerNumber })
                            .eq('id', customer.id);
                    }

                    result.success++;
                } catch (err) {
                    result.failed++;
                    result.errors.push(`${customer.name}: ${(err as Error).message}`);
                }
            }

            // Delay between batches to avoid rate limiting
            if (i + BATCH_SIZE < customers.length) {
                await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
            }
        }

        console.log(`Customer sync complete: ${result.success} success, ${result.failed} failed`);
        return result;

    } catch (error) {
        result.errors.push((error as Error).message);
        return result;
    }
}

/**
 * Sync invoices to Fortnox in batches
 */
async function syncInvoices(
    supabase: any,
    organisationId: string,
    specificIds?: string[]
): Promise<SyncResult> {
    const result: SyncResult = { success: 0, failed: 0, errors: [] };

    try {
        // Fetch invoices to sync with related data
        let query = supabase
            .from('invoices')
            .select(`
                *,
                customer:customers(*),
                line_items:invoice_line_items(*)
            `)
            .eq('organisation_id', organisationId);

        if (specificIds && specificIds.length > 0) {
            query = query.in('id', specificIds);
        } else {
            // Only unsynced invoices (no fortnox_invoice_number)
            query = query.is('fortnox_invoice_number', null);
        }

        const { data: invoices, error } = await query;

        if (error) {
            result.errors.push(`Failed to fetch invoices: ${error.message}`);
            return result;
        }

        if (!invoices || invoices.length === 0) {
            return result; // No invoices to sync
        }

        console.log(`Syncing ${invoices.length} invoices to Fortnox`);

        // Process in batches
        for (let i = 0; i < invoices.length; i += BATCH_SIZE) {
            const batch = invoices.slice(i, i + BATCH_SIZE);

            for (const invoice of batch) {
                try {
                    // Check if customer has Fortnox number
                    let fortnoxCustomerNumber = invoice.customer?.fortnox_customer_number;

                    if (!fortnoxCustomerNumber) {
                        // Need to sync customer first
                        if (!invoice.customer) {
                            result.failed++;
                            result.errors.push(`Invoice ${invoice.invoice_number}: No customer`);
                            continue;
                        }

                        // Sync customer
                        const customerResult = await syncCustomers(supabase, organisationId, [invoice.customer.id]);
                        if (customerResult.success === 0) {
                            result.failed++;
                            result.errors.push(`Invoice ${invoice.invoice_number}: Could not sync customer`);
                            continue;
                        }

                        // Re-fetch customer to get Fortnox number
                        const { data: updatedCustomer } = await supabase
                            .from('customers')
                            .select('fortnox_customer_number')
                            .eq('id', invoice.customer.id)
                            .single();

                        fortnoxCustomerNumber = updatedCustomer?.fortnox_customer_number;

                        if (!fortnoxCustomerNumber) {
                            result.failed++;
                            result.errors.push(`Invoice ${invoice.invoice_number}: Customer sync failed`);
                            continue;
                        }
                    }

                    // Prepare invoice rows
                    const lineItems = invoice.line_items || [];
                    const vatRate = invoice.customer?.vat_handling === 'omvänd byggmoms' ? 0 : 25;

                    const invoiceRows = lineItems.map((item: any) => ({
                        Description: item.description,
                        DeliveredQuantity: item.quantity,
                        Price: item.unit_price,
                        VAT: vatRate,
                        Unit: item.unit || 'st',
                    }));

                    // Format dates
                    const formatDate = (date: string | null): string | undefined => {
                        if (!date) return undefined;
                        return new Date(date).toISOString().split('T')[0];
                    };

                    // Call fortnox-api edge function to export invoice
                    const { data, error: invokeError } = await supabase.functions.invoke('fortnox-api', {
                        body: {
                            action: 'proxy',
                            organisation_id: organisationId,
                            method: 'POST',
                            endpoint: '/invoices',
                            body: {
                                Invoice: {
                                    CustomerNumber: fortnoxCustomerNumber,
                                    InvoiceDate: formatDate(invoice.created_at),
                                    DueDate: formatDate(invoice.due_date),
                                    YourReference: invoice.customer?.name,
                                    Remarks: invoice.work_summary || undefined,
                                    InvoiceRows: invoiceRows,
                                }
                            }
                        }
                    });

                    if (invokeError || !data?.success) {
                        result.failed++;
                        result.errors.push(`Invoice ${invoice.invoice_number}: ${invokeError?.message || data?.error || 'Unknown error'}`);
                        continue;
                    }

                    const fortnoxInvoiceNumber = data.data?.Invoice?.DocumentNumber;

                    // Update invoice with Fortnox number
                    if (fortnoxInvoiceNumber) {
                        await supabase
                            .from('invoices')
                            .update({
                                fortnox_invoice_number: fortnoxInvoiceNumber,
                                fortnox_synced_at: new Date().toISOString()
                            })
                            .eq('id', invoice.id);
                    }

                    result.success++;
                } catch (err) {
                    result.failed++;
                    result.errors.push(`Invoice ${invoice.invoice_number}: ${(err as Error).message}`);
                }
            }

            // Delay between batches to avoid rate limiting
            if (i + BATCH_SIZE < invoices.length) {
                await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
            }
        }

        console.log(`Invoice sync complete: ${result.success} success, ${result.failed} failed`);
        return result;

    } catch (error) {
        result.errors.push((error as Error).message);
        return result;
    }
}
