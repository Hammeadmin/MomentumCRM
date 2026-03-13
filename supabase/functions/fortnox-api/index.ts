/*
# Fortnox API Edge Function

Handles OAuth authentication and API proxy to Fortnox.

Actions:
- `auth`: Exchange authorization code for tokens
- `proxy`: Forward requests to Fortnox API with token refresh

Required environment variables:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- FORTNOX_CLIENT_ID
- FORTNOX_CLIENT_SECRET
*/

import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const FORTNOX_AUTH_URL = 'https://apps.fortnox.se/oauth-v1';
const FORTNOX_API_URL = 'https://api.fortnox.se/3';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface AuthRequest {
    action: 'auth';
    organisation_id: string;
    code: string;
    redirect_uri: string;
}

interface ProxyRequest {
    action: 'proxy';
    organisation_id: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    endpoint: string; // e.g., '/customers', '/invoices'
    body?: any;
}

type FortnoxRequest = AuthRequest | ProxyRequest;

interface FortnoxTokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    scope: string;
}

Deno.serve(async (req: Request) => {
    // TEMP DIAGNOSTIC: log all env var names (not values) to debug missing CLIENT_ID
    const allEnvKeys = Object.keys(Deno.env.toObject());
    console.log(`[fortnox-api] Available env var names: ${JSON.stringify(allEnvKeys)}`);
    console.log(`[fortnox-api] FORTNOX_CLIENT_ID raw value type: ${typeof Deno.env.get('FORTNOX_CLIENT_ID')}, length: ${Deno.env.get('FORTNOX_CLIENT_ID')?.length ?? 'undefined'}`);
    console.log(`[fortnox-api] Incoming request: ${req.method} ${req.url}`);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        console.log('[fortnox-api] Responding to CORS preflight');
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    // The dashboard sometimes saves secrets with trailing \r\n attached to the key name or value
    try {
        const env = Deno.env.toObject();
        const getEnvSafe = (keyName: string) => {
            const actualKey = Object.keys(env).find(k => k.trim() === keyName);
            return actualKey ? env[actualKey]?.trim() : undefined;
        };

        const supabaseUrl = getEnvSafe('SUPABASE_URL')!;
        const supabaseServiceKey = getEnvSafe('SUPABASE_SERVICE_ROLE_KEY')!;
        const clientId = getEnvSafe('FORTNOX_CLIENT_ID')!;
        const clientSecret = getEnvSafe('FORTNOX_CLIENT_SECRET')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        console.log(`[fortnox-api] Env vars present — SUPABASE_URL: ${!!supabaseUrl}, SERVICE_KEY: ${!!supabaseServiceKey}, CLIENT_ID: ${!!clientId}, CLIENT_SECRET: ${!!clientSecret}`);

        if (!clientId || !clientSecret) {
            console.error('[fortnox-api] Missing Fortnox client credentials!');
            return new Response(
                JSON.stringify({ success: false, error: 'Fortnox client credentials not configured on server' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            );
        }

        const requestData: FortnoxRequest = await req.json();
        console.log(`[fortnox-api] Request payload:`, JSON.stringify({ action: requestData.action, organisation_id: requestData.organisation_id, ...(requestData.action === 'proxy' ? { method: (requestData as any).method, endpoint: (requestData as any).endpoint } : {}) }));

        if (!requestData.organisation_id) {
            return new Response(
                JSON.stringify({ success: false, error: 'Missing organisation_id' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        // Get organisation's Fortnox tokens (not client credentials — those are app-level env vars)
        console.log(`[fortnox-api] Fetching organisation ${requestData.organisation_id} from database...`);
        const { data: org, error: orgError } = await supabase
            .from('organisations')
            .select('fortnox_access_token, fortnox_refresh_token, fortnox_token_expires_at')
            .eq('id', requestData.organisation_id)
            .single();

        if (orgError || !org) {
            console.error(`[fortnox-api] Organisation lookup failed — orgError:`, orgError, '| org:', org);
            return new Response(
                JSON.stringify({ success: false, error: 'Organisation not found' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            );
        }

        console.log(`[fortnox-api] Organisation token state — has_access_token: ${!!org.fortnox_access_token}, has_refresh_token: ${!!org.fortnox_refresh_token}, expires_at: ${org.fortnox_token_expires_at}`);

        if (requestData.action === 'auth') {
            console.log('[fortnox-api] Routing to handleAuth');
            return handleAuth(requestData as AuthRequest, org, supabase, clientId, clientSecret);
        } else if (requestData.action === 'proxy') {
            console.log('[fortnox-api] Routing to handleProxy');
            return handleProxy(requestData as ProxyRequest, org, supabase, clientId, clientSecret);
        } else {
            return new Response(
                JSON.stringify({ success: false, error: 'Invalid action. Use "auth" or "proxy"' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

    } catch (error) {
        console.error('Error in fortnox-api:', error);
        return new Response(
            JSON.stringify({ success: false, error: (error as Error).message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});

/**
 * Handle OAuth authorization code exchange
 */
async function handleAuth(
    request: AuthRequest,
    org: any,
    supabase: any,
    clientId: string,
    clientSecret: string
): Promise<Response> {
    try {
        const { code, redirect_uri, organisation_id } = request;
        console.log(`[fortnox-api][auth] Starting auth flow — org: ${organisation_id}, has_code: ${!!code}, redirect_uri: ${redirect_uri}`);

        if (!code) {
            console.error('[fortnox-api][auth] Missing authorization code');
            return new Response(
                JSON.stringify({ success: false, error: 'Missing authorization code' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        // Exchange code for tokens
        const tokenUrl = `${FORTNOX_AUTH_URL}/token`;
        console.log(`[fortnox-api][auth] Exchanging code for tokens — POST ${tokenUrl}`);
        const tokenResponse = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri,
            }),
        });
        console.log(`[fortnox-api][auth] Token exchange response — status: ${tokenResponse.status}, statusText: ${tokenResponse.statusText}`);

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error(`[fortnox-api][auth] Token exchange FAILED — status: ${tokenResponse.status}, response body: ${errorText}`);
            let errorData: any = {};
            try { errorData = JSON.parse(errorText); } catch (_) { errorData = { raw: errorText }; }
            return new Response(
                JSON.stringify({ success: false, error: `Fortnox auth failed: ${errorData.error_description || tokenResponse.statusText}`, details: errorData }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        const tokens: FortnoxTokenResponse = await tokenResponse.json();
        console.log(`[fortnox-api][auth] Token exchange SUCCESS — token_type: ${tokens.token_type}, expires_in: ${tokens.expires_in}, scope: ${tokens.scope}`);

        // Calculate expiration time
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

        // Save tokens to database
        const { error: updateError } = await supabase
            .from('organisations')
            .update({
                fortnox_access_token: tokens.access_token,
                fortnox_refresh_token: tokens.refresh_token,
                fortnox_token_expires_at: expiresAt.toISOString(),
            })
            .eq('id', organisation_id);

        if (updateError) {
            console.error('[fortnox-api][auth] Failed to save tokens to DB:', JSON.stringify(updateError));
            return new Response(
                JSON.stringify({ success: false, error: 'Failed to save tokens' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            );
        }

        console.log(`Fortnox connected for organisation ${organisation_id}`);

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Fortnox connected successfully',
                expires_at: expiresAt.toISOString()
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error) {
        console.error('Auth error:', error);
        return new Response(
            JSON.stringify({ success: false, error: (error as Error).message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
}

/**
 * Handle API proxy requests with automatic token refresh
 */
async function handleProxy(
    request: ProxyRequest,
    org: any,
    supabase: any,
    clientId: string,
    clientSecret: string
): Promise<Response> {
    try {
        let accessToken = org.fortnox_access_token;
        const tokenExpired = isTokenExpired(org.fortnox_token_expires_at);
        console.log(`[fortnox-api][proxy] Starting proxy — method: ${request.method}, endpoint: ${request.endpoint}, has_access_token: ${!!accessToken}, token_expired: ${tokenExpired}`);

        // Check if token needs refresh
        if (!accessToken || tokenExpired) {
            if (!org.fortnox_refresh_token) {
                console.error('[fortnox-api][proxy] No refresh token available — user must reconnect');
                return new Response(
                    JSON.stringify({ success: false, error: 'Not authenticated with Fortnox. Please connect first.' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
                );
            }

            console.log(`[fortnox-api][proxy] Token expired or missing, refreshing... (expires_at: ${org.fortnox_token_expires_at})`);

            // Refresh the token
            const refreshResult = await refreshAccessToken(
                clientId,
                clientSecret,
                org.fortnox_refresh_token,
                request.organisation_id,
                supabase
            );

            if (!refreshResult.success) {
                console.error(`[fortnox-api][proxy] Token refresh failed: ${refreshResult.error}`);
                return new Response(
                    JSON.stringify({ success: false, error: refreshResult.error }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
                );
            }

            accessToken = refreshResult.access_token;
            console.log('[fortnox-api][proxy] Token refreshed successfully');
        }

        // Make request to Fortnox API
        const fortnoxUrl = `${FORTNOX_API_URL}${request.endpoint}`;

        const fetchOptions: RequestInit = {
            method: request.method,
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        };

        if (request.body && (request.method === 'POST' || request.method === 'PUT')) {
            fetchOptions.body = JSON.stringify(request.body);
            console.log(`[fortnox-api][proxy] Request body:`, JSON.stringify(request.body));
        }

        console.log(`[fortnox-api][proxy] Fetching Fortnox API — ${request.method} ${fortnoxUrl}`);

        const fortnoxResponse = await fetch(fortnoxUrl, fetchOptions);
        console.log(`[fortnox-api][proxy] Fortnox response — status: ${fortnoxResponse.status}, statusText: ${fortnoxResponse.statusText}, headers: ${JSON.stringify(Object.fromEntries(fortnoxResponse.headers.entries()))}`);
        const responseText = await fortnoxResponse.text();
        console.log(`[fortnox-api][proxy] Fortnox response body (first 2000 chars): ${responseText.substring(0, 2000)}`);

        let responseData: any;
        try {
            responseData = JSON.parse(responseText);
        } catch (parseError) {
            console.error(`[fortnox-api][proxy] Failed to parse Fortnox response as JSON — raw: ${responseText.substring(0, 500)}`);
            return new Response(
                JSON.stringify({ success: false, error: 'Invalid JSON response from Fortnox', raw_response: responseText.substring(0, 500) }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
            );
        }

        if (!fortnoxResponse.ok) {
            console.error(`[fortnox-api][proxy] Fortnox API error — status: ${fortnoxResponse.status}, error: ${JSON.stringify(responseData)}`);
            return new Response(
                JSON.stringify({
                    success: false,
                    error: responseData.ErrorInformation?.Message || 'Fortnox API error',
                    status_code: fortnoxResponse.status,
                    details: responseData
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: fortnoxResponse.status }
            );
        }

        console.log(`[fortnox-api][proxy] SUCCESS — ${request.method} ${request.endpoint}`);
        return new Response(
            JSON.stringify({ success: true, data: responseData }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error) {
        console.error('Proxy error:', error);
        return new Response(
            JSON.stringify({ success: false, error: (error as Error).message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
}

/**
 * Check if token is expired
 */
function isTokenExpired(expiresAt: string | null): boolean {
    if (!expiresAt) return true;

    const expires = new Date(expiresAt);
    const now = new Date();

    // Consider expired if within 5 minutes of expiration
    return now.getTime() > expires.getTime() - 5 * 60 * 1000;
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(
    clientId: string,
    clientSecret: string,
    refreshToken: string,
    organisationId: string,
    supabase: any
): Promise<{ success: boolean; access_token?: string; error?: string }> {
    try {
        const refreshUrl = `${FORTNOX_AUTH_URL}/token`;
        console.log(`[fortnox-api][refresh] Refreshing token — POST ${refreshUrl}, org: ${organisationId}`);

        const tokenResponse = await fetch(refreshUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
            }),
        });

        console.log(`[fortnox-api][refresh] Token refresh response — status: ${tokenResponse.status}, statusText: ${tokenResponse.statusText}`);

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error(`[fortnox-api][refresh] Token refresh FAILED — status: ${tokenResponse.status}, body: ${errorText}`);
            let errorData: any = {};
            try { errorData = JSON.parse(errorText); } catch (_) { errorData = { raw: errorText }; }
            return { success: false, error: `Token refresh failed (${tokenResponse.status}): ${errorData.error_description || errorData.raw || 'Unknown error'}. Please reconnect to Fortnox.` };
        }

        const tokens: FortnoxTokenResponse = await tokenResponse.json();
        console.log(`[fortnox-api][refresh] Token refresh SUCCESS — token_type: ${tokens.token_type}, expires_in: ${tokens.expires_in}`);
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

        // Update tokens in database
        const { error: updateError } = await supabase
            .from('organisations')
            .update({
                fortnox_access_token: tokens.access_token,
                fortnox_refresh_token: tokens.refresh_token,
                fortnox_token_expires_at: expiresAt.toISOString(),
            })
            .eq('id', organisationId);

        if (updateError) {
            console.error('[fortnox-api][refresh] Failed to update refreshed tokens in DB:', JSON.stringify(updateError));
        } else {
            console.log(`[fortnox-api][refresh] Tokens saved to DB, expires_at: ${expiresAt.toISOString()}`);
        }

        console.log(`Token refreshed for organisation ${organisationId}`);

        return { success: true, access_token: tokens.access_token };

    } catch (error) {
        console.error('Refresh error:', error);
        return { success: false, error: (error as Error).message };
    }
}
