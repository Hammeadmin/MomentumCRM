/*
# Webhook Dispatcher Edge Function

Dispatches webhook payloads to external URLs.
Called by the webhooks.ts library when events occur.

Inputs:
- webhook_id: ID of the webhook configuration
- target_url: URL to send the payload to
- payload: JSON payload to send
- secret: Optional HMAC secret for signature
- headers: Optional custom headers

Features:
- HMAC signature for payload verification
- Retry once on failure
- Logs results to webhook_logs table
*/

import { createClient } from 'npm:@supabase/supabase-js@2.39.3';
import { createHmac } from 'node:crypto';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface WebhookRequest {
    webhook_id: string;
    organisation_id: string;
    event_type: string;
    target_url: string;
    payload: any;
    secret?: string;
    headers?: Record<string, string>;
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    const startTime = Date.now();

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const request: WebhookRequest = await req.json();
        const { webhook_id, organisation_id, event_type, target_url, payload, secret, headers = {} } = request;

        if (!target_url || !payload) {
            return new Response(
                JSON.stringify({ success: false, error: 'Missing target_url or payload' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        console.log(`Dispatching webhook to ${target_url} for event ${event_type}`);

        const payloadString = JSON.stringify(payload);

        // Build headers
        const webhookHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            'User-Agent': 'MomentumCRM-Webhook/1.0',
            'X-Webhook-Event': event_type,
            'X-Webhook-Timestamp': new Date().toISOString(),
            ...headers
        };

        // Add HMAC signature if secret is provided
        if (secret) {
            const signature = createHmac('sha256', secret)
                .update(payloadString)
                .digest('hex');
            webhookHeaders['X-Webhook-Signature'] = `sha256=${signature}`;
        }

        // Attempt to send webhook (with retry)
        let response: Response | null = null;
        let success = false;
        let errorMessage: string | null = null;
        let responseStatus: number | null = null;
        let responseBody: string | null = null;

        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                response = await fetch(target_url, {
                    method: 'POST',
                    headers: webhookHeaders,
                    body: payloadString,
                });

                responseStatus = response.status;
                responseBody = await response.text();

                if (response.ok) {
                    success = true;
                    console.log(`Webhook delivered successfully to ${target_url}`);
                    break;
                } else {
                    errorMessage = `HTTP ${response.status}: ${responseBody.substring(0, 500)}`;
                    console.error(`Webhook failed (attempt ${attempt + 1}): ${errorMessage}`);
                }
            } catch (fetchError) {
                errorMessage = (fetchError as Error).message;
                console.error(`Webhook fetch error (attempt ${attempt + 1}): ${errorMessage}`);
            }

            // Wait before retry
            if (attempt === 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        const durationMs = Date.now() - startTime;

        // Log the result
        if (webhook_id && organisation_id) {
            await supabase.from('webhook_logs').insert({
                webhook_id,
                organisation_id,
                event_type,
                payload,
                response_status: responseStatus,
                response_body: responseBody?.substring(0, 2000),
                success,
                error_message: errorMessage,
                duration_ms: durationMs
            });
        }

        return new Response(
            JSON.stringify({
                success,
                error: errorMessage,
                duration_ms: durationMs
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: success ? 200 : 500 }
        );

    } catch (error: unknown) {
        console.error('Error in dispatch-webhook:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(
            JSON.stringify({ success: false, error: errorMessage }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});
