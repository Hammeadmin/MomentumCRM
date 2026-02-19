/*
# Sync FROM Fortnox Edge Function

Fetches invoice statuses FROM Fortnox and updates the CRM.
- Checks all CRM invoices that have a fortnox_invoice_number and are not yet paid
- Updates status to 'paid' if Fortnox reports Balance = 0 and FinalPayDate is set
- Updates status to 'cancelled' if Fortnox reports the invoice as cancelled
- Always updates fortnox_synced_at timestamp

Required environment variables:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

---

## pg_cron: Schedule Daily Auto-Sync (Task 5)

Run the following SQL in the Supabase SQL editor to set up a daily sync
at 06:00 Stockholm time (CET). Adjust for CEST as needed.

```sql
SELECT cron.schedule(
  'sync-from-fortnox-daily',
  '0 5 * * *',  -- 05:00 UTC = 06:00 Stockholm (CET), adjust for CEST
  $$SELECT net.http_post(
    url := '{SUPABASE_URL}/functions/v1/sync-from-fortnox',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer {SERVICE_ROLE_KEY}"}'::jsonb,
    body := '{"organisation_id": "YOUR_ORG_ID"}'::jsonb
  )$$
);
```

Replace:
  - {SUPABASE_URL}      with your actual Supabase project URL
  - {SERVICE_ROLE_KEY}   with your actual service role key
  - YOUR_ORG_ID          with the target organisation's UUID

To remove the schedule:
```sql
SELECT cron.unschedule('sync-from-fortnox-daily');
```

*/

import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SyncFromFortnoxRequest {
    organisation_id: string;
}

interface SyncResult {
    success: number;
    failed: number;
    errors: string[];
}

// Batch configuration
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 500;

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const requestData: SyncFromFortnoxRequest = await req.json();

        if (!requestData.organisation_id) {
            return new Response(
                JSON.stringify({ success: false, error: 'Missing organisation_id' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        // Verify Fortnox connection exists
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

        const result = await syncFromFortnox(supabase, requestData.organisation_id);

        return new Response(
            JSON.stringify(result),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error) {
        console.error('Error in sync-from-fortnox:', error);
        return new Response(
            JSON.stringify({ success: 0, failed: 0, errors: [(error as Error).message] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});

/**
 * Fetch invoice statuses from Fortnox and update CRM accordingly
 */
async function syncFromFortnox(
    supabase: any,
    organisationId: string
): Promise<SyncResult> {
    const result: SyncResult = { success: 0, failed: 0, errors: [] };

    try {
        // Fetch CRM invoices that have been synced to Fortnox but are not yet paid
        const { data: invoices, error } = await supabase
            .from('invoices')
            .select('id, invoice_number, fortnox_invoice_number, status')
            .eq('organisation_id', organisationId)
            .not('fortnox_invoice_number', 'is', null)
            .neq('status', 'paid')
            .eq('is_credit_note', false);

        if (error) {
            result.errors.push(`Failed to fetch invoices: ${error.message}`);
            return result;
        }

        if (!invoices || invoices.length === 0) {
            return result; // No invoices to check
        }

        console.log(`Checking ${invoices.length} invoices from Fortnox`);

        // Process in batches
        for (let i = 0; i < invoices.length; i += BATCH_SIZE) {
            const batch = invoices.slice(i, i + BATCH_SIZE);

            for (const invoice of batch) {
                try {
                    // Fetch invoice status from Fortnox via the proxy
                    const { data: fortnoxData, error: invokeError } = await supabase.functions.invoke('fortnox-api', {
                        body: {
                            action: 'proxy',
                            organisation_id: organisationId,
                            method: 'GET',
                            endpoint: `/invoices/${invoice.fortnox_invoice_number}`,
                        }
                    });

                    if (invokeError || !fortnoxData?.success) {
                        result.failed++;
                        result.errors.push(
                            `Invoice ${invoice.invoice_number}: ${invokeError?.message || fortnoxData?.error || 'Unknown error'}`
                        );
                        continue;
                    }

                    const fortnoxInvoice = fortnoxData.data?.Invoice;
                    if (!fortnoxInvoice) {
                        result.failed++;
                        result.errors.push(`Invoice ${invoice.invoice_number}: No invoice data returned from Fortnox`);
                        continue;
                    }

                    const updates: Record<string, any> = {
                        fortnox_synced_at: new Date().toISOString(),
                    };

                    // Check if paid: Balance = 0 and FinalPayDate is set
                    if (
                        fortnoxInvoice.Balance !== undefined &&
                        Number(fortnoxInvoice.Balance) === 0 &&
                        fortnoxInvoice.FinalPayDate
                    ) {
                        updates.status = 'paid';
                    }
                    // Check if cancelled in Fortnox
                    else if (fortnoxInvoice.Cancelled === true) {
                        updates.status = 'cancelled';
                    }

                    // Update the CRM invoice
                    const { error: updateError } = await supabase
                        .from('invoices')
                        .update(updates)
                        .eq('id', invoice.id);

                    if (updateError) {
                        result.failed++;
                        result.errors.push(`Invoice ${invoice.invoice_number}: Update failed - ${updateError.message}`);
                        continue;
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

        console.log(`Sync from Fortnox complete: ${result.success} success, ${result.failed} failed`);
        return result;

    } catch (error) {
        result.errors.push((error as Error).message);
        return result;
    }
}
