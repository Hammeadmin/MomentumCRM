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
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const clientId = Deno.env.get('FORTNOX_CLIENT_ID')!;
        const clientSecret = Deno.env.get('FORTNOX_CLIENT_SECRET')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        if (!clientId || !clientSecret) {
            return new Response(
                JSON.stringify({ success: false, error: 'Fortnox client credentials not configured on server' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            );
        }

        const requestData: FortnoxRequest = await req.json();

        if (!requestData.organisation_id) {
            return new Response(
                JSON.stringify({ success: false, error: 'Missing organisation_id' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        // Get organisation's Fortnox tokens (not client credentials — those are app-level env vars)
        const { data: org, error: orgError } = await supabase
            .from('organisations')
            .select('fortnox_access_token, fortnox_refresh_token, fortnox_token_expires_at')
            .eq('id', requestData.organisation_id)
            .single();

        if (orgError || !org) {
            return new Response(
                JSON.stringify({ success: false, error: 'Organisation not found' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            );
        }

        if (requestData.action === 'auth') {
            return handleAuth(requestData as AuthRequest, org, supabase, clientId, clientSecret);
        } else if (requestData.action === 'proxy') {
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

        if (!code) {
            return new Response(
                JSON.stringify({ success: false, error: 'Missing authorization code' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        // Exchange code for tokens
        const tokenResponse = await fetch(`${FORTNOX_AUTH_URL}/token`, {
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

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            console.error('Fortnox token error:', errorData);
            return new Response(
                JSON.stringify({ success: false, error: `Fortnox auth failed: ${errorData.error_description || tokenResponse.statusText}` }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        const tokens: FortnoxTokenResponse = await tokenResponse.json();

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
            console.error('Failed to save tokens:', updateError);
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

        // Check if token needs refresh
        if (!accessToken || isTokenExpired(org.fortnox_token_expires_at)) {
            if (!org.fortnox_refresh_token) {
                return new Response(
                    JSON.stringify({ success: false, error: 'Not authenticated with Fortnox. Please connect first.' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
                );
            }

            // Refresh the token
            const refreshResult = await refreshAccessToken(
                clientId,
                clientSecret,
                org.fortnox_refresh_token,
                request.organisation_id,
                supabase
            );

            if (!refreshResult.success) {
                return new Response(
                    JSON.stringify({ success: false, error: refreshResult.error }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
                );
            }

            accessToken = refreshResult.access_token;
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
        }

        console.log(`Fortnox API ${request.method} ${request.endpoint}`);

        const fortnoxResponse = await fetch(fortnoxUrl, fetchOptions);
        const responseData = await fortnoxResponse.json();

        if (!fortnoxResponse.ok) {
            console.error('Fortnox API error:', responseData);
            return new Response(
                JSON.stringify({
                    success: false,
                    error: responseData.ErrorInformation?.Message || 'Fortnox API error',
                    details: responseData
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: fortnoxResponse.status }
            );
        }

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
        const tokenResponse = await fetch(`${FORTNOX_AUTH_URL}/token`, {
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

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            console.error('Token refresh failed:', errorData);
            return { success: false, error: 'Token refresh failed. Please reconnect to Fortnox.' };
        }

        const tokens: FortnoxTokenResponse = await tokenResponse.json();
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
            console.error('Failed to update refreshed tokens:', updateError);
        }

        console.log(`Token refreshed for organisation ${organisationId}`);

        return { success: true, access_token: tokens.access_token };

    } catch (error) {
        console.error('Refresh error:', error);
        return { success: false, error: (error as Error).message };
    }
}
