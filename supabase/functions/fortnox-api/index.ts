/*
# Fortnox API Edge Function

OAuth token exchange and API proxy for the Fortnox accounting integration.

Actions:
- `auth`    : Exchange OAuth authorization code for access + refresh tokens
- `proxy`   : Proxy any Fortnox REST API call, auto-refreshing tokens as needed
- `refresh` : Force a token refresh (used by admin/debug tooling)

Required environment variables (set in Supabase Edge Function secrets):
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- FORTNOX_CLIENT_ID
- FORTNOX_CLIENT_SECRET
*/

import { createClient } from 'jsr:@supabase/supabase-js@2';

const FORTNOX_TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token';
const FORTNOX_API_BASE = 'https://api.fortnox.se/3';

// Refresh token if it expires within 5 minutes
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

function jsonError(message: string, status = 400): Response {
    return new Response(JSON.stringify({ success: false, error: message }), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

// ─── Token Exchange ────────────────────────────────────────────────────────────

async function exchangeCode(
    supabase: ReturnType<typeof createClient>,
    organisationId: string,
    code: string,
    redirectUri: string,
    clientId: string,
    clientSecret: string,
): Promise<Response> {
    if (!organisationId || !code || !redirectUri) {
        return jsonError('Missing required fields: organisation_id, code, redirect_uri');
    }

    const tokenRes = await fetch(FORTNOX_TOKEN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
        }).toString(),
    });

    if (!tokenRes.ok) {
        const errorBody = await tokenRes.text();
        console.error('[fortnox-api] auth: token exchange failed', tokenRes.status, errorBody);
        return jsonError(`Token exchange failed (${tokenRes.status}): ${errorBody}`, 400);
    }

    const tokens = await tokenRes.json();

    if (!tokens.access_token) {
        return jsonError('Fortnox did not return an access_token');
    }

    const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString();

    const { error: dbError } = await supabase
        .from('organisations')
        .update({
            fortnox_access_token: tokens.access_token,
            fortnox_refresh_token: tokens.refresh_token ?? null,
            fortnox_token_expires_at: expiresAt,
        })
        .eq('id', organisationId);

    if (dbError) {
        console.error('[fortnox-api] auth: failed to store tokens', dbError);
        return jsonError(`Failed to store tokens: ${dbError.message}`, 500);
    }

    console.log(`[fortnox-api] auth: tokens stored for org ${organisationId}, expires ${expiresAt}`);
    return jsonResponse({ success: true, expires_at: expiresAt });
}

// ─── Token Refresh ─────────────────────────────────────────────────────────────

async function doRefreshToken(
    supabase: ReturnType<typeof createClient>,
    organisationId: string,
    refreshToken: string,
    clientId: string,
    clientSecret: string,
): Promise<{ accessToken: string | null; error?: string }> {
    const tokenRes = await fetch(FORTNOX_TOKEN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        }).toString(),
    });

    if (!tokenRes.ok) {
        const body = await tokenRes.text();
        console.error('[fortnox-api] refresh failed:', tokenRes.status, body);
        return { accessToken: null, error: `Refresh failed (${tokenRes.status}): ${body}` };
    }

    const tokens = await tokenRes.json();

    if (!tokens.access_token) {
        return { accessToken: null, error: 'No access_token in refresh response' };
    }

    const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString();

    await supabase
        .from('organisations')
        .update({
            fortnox_access_token: tokens.access_token,
            // Fortnox may or may not return a new refresh token — keep old one if not
            ...(tokens.refresh_token ? { fortnox_refresh_token: tokens.refresh_token } : {}),
            fortnox_token_expires_at: expiresAt,
        })
        .eq('id', organisationId);

    console.log(`[fortnox-api] refresh: new token stored for org ${organisationId}, expires ${expiresAt}`);
    return { accessToken: tokens.access_token };
}

// ─── Resolve Access Token (with auto-refresh) ──────────────────────────────────

async function resolveAccessToken(
    supabase: ReturnType<typeof createClient>,
    organisationId: string,
    clientId: string,
    clientSecret: string,
): Promise<{ token: string | null; error?: string }> {
    const { data: org, error } = await supabase
        .from('organisations')
        .select('fortnox_access_token, fortnox_refresh_token, fortnox_token_expires_at')
        .eq('id', organisationId)
        .single();

    if (error || !org) {
        return { token: null, error: 'Organisation not found' };
    }

    if (!org.fortnox_access_token) {
        return { token: null, error: 'Fortnox not connected for this organisation' };
    }

    const isExpiredOrSoon = org.fortnox_token_expires_at
        ? new Date(org.fortnox_token_expires_at).getTime() <= Date.now() + REFRESH_BUFFER_MS
        : false;

    if (isExpiredOrSoon) {
        if (!org.fortnox_refresh_token) {
            return { token: null, error: 'Token expired and no refresh token available — please reconnect Fortnox' };
        }
        const refreshed = await doRefreshToken(supabase, organisationId, org.fortnox_refresh_token, clientId, clientSecret);
        if (!refreshed.accessToken) {
            return { token: null, error: refreshed.error };
        }
        return { token: refreshed.accessToken };
    }

    return { token: org.fortnox_access_token };
}

// ─── API Proxy ─────────────────────────────────────────────────────────────────

async function proxyRequest(
    supabase: ReturnType<typeof createClient>,
    body: Record<string, unknown>,
    clientId: string,
    clientSecret: string,
): Promise<Response> {
    const { organisation_id, method, endpoint, body: requestBody } = body as {
        organisation_id: string;
        method: string;
        endpoint: string;
        body?: unknown;
    };

    if (!organisation_id || !method || !endpoint) {
        return jsonError('Missing required fields: organisation_id, method, endpoint');
    }

    const { token, error: tokenError } = await resolveAccessToken(supabase, organisation_id as string, clientId, clientSecret);

    if (!token) {
        return jsonError(tokenError ?? 'Could not obtain access token', 401);
    }

    const url = `${FORTNOX_API_BASE}${endpoint}`;

    const fetchOptions: RequestInit = {
        method: method as string,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
    };

    if (requestBody && method !== 'GET' && method !== 'DELETE') {
        fetchOptions.body = JSON.stringify(requestBody);
    }

    let responseText: string;
    let httpStatus: number;

    try {
        const res = await fetch(url, fetchOptions);
        httpStatus = res.status;
        responseText = await res.text();
    } catch (fetchErr) {
        console.error('[fortnox-api] proxy: network error', fetchErr);
        return jsonError(`Network error calling Fortnox: ${(fetchErr as Error).message}`, 502);
    }

    let responseData: unknown;
    try {
        responseData = JSON.parse(responseText);
    } catch {
        responseData = { raw: responseText };
    }

    if (httpStatus < 200 || httpStatus >= 300) {
        const rd = responseData as Record<string, unknown>;
        const fortnoxMsg =
            (rd?.ErrorInformation as Record<string, unknown>)?.message as string ??
            (rd?.ErrorInformation as Record<string, unknown>)?.Message as string ??
            (rd as Record<string, unknown>)?.message as string ??
            `HTTP ${httpStatus}`;

        console.error(`[fortnox-api] proxy: Fortnox returned ${httpStatus} for ${method} ${endpoint}:`, fortnoxMsg);
        return jsonResponse({ success: false, error: fortnoxMsg, statusCode: httpStatus, details: responseData });
    }

    return jsonResponse({ success: true, data: responseData });
}

// ─── Force Refresh Endpoint ────────────────────────────────────────────────────

async function forceRefresh(
    supabase: ReturnType<typeof createClient>,
    organisationId: string,
    clientId: string,
    clientSecret: string,
): Promise<Response> {
    if (!organisationId) return jsonError('Missing organisation_id');

    const { data: org } = await supabase
        .from('organisations')
        .select('fortnox_refresh_token')
        .eq('id', organisationId)
        .single();

    if (!org?.fortnox_refresh_token) {
        return jsonError('No refresh token available — please reconnect Fortnox');
    }

    const result = await doRefreshToken(supabase, organisationId, org.fortnox_refresh_token, clientId, clientSecret);

    if (!result.accessToken) {
        return jsonError(result.error ?? 'Token refresh failed');
    }

    return jsonResponse({ success: true });
}

// ─── Main Handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const clientId = Deno.env.get('FORTNOX_CLIENT_ID') ?? '';
        const clientSecret = Deno.env.get('FORTNOX_CLIENT_SECRET') ?? '';

        if (!clientId || !clientSecret) {
            console.error('[fortnox-api] FORTNOX_CLIENT_ID or FORTNOX_CLIENT_SECRET not set');
            return jsonError('Fortnox credentials not configured on server', 500);
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const body = (await req.json()) as Record<string, unknown>;

        switch (body.action) {
            case 'auth':
                return await exchangeCode(
                    supabase,
                    body.organisation_id as string,
                    body.code as string,
                    body.redirect_uri as string,
                    clientId,
                    clientSecret,
                );

            case 'proxy':
                return await proxyRequest(supabase, body, clientId, clientSecret);

            case 'refresh':
                return await forceRefresh(supabase, body.organisation_id as string, clientId, clientSecret);

            default:
                return jsonError(`Unknown action "${body.action}". Use: auth | proxy | refresh`, 400);
        }
    } catch (err) {
        console.error('[fortnox-api] Unhandled error:', err);
        return jsonError((err as Error).message, 500);
    }
});
