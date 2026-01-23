/*
# Track Quote View Edge Function

Returns a 1x1 transparent GIF and logs the view to quote_views table.
Used as a tracking pixel in quote emails.

Usage: <img src="https://[project].supabase.co/functions/v1/track-quote-view?token=ABC123" />
*/

import { createClient } from 'jsr:@supabase/supabase-js@2';

// 1x1 transparent GIF (43 bytes)
const TRANSPARENT_GIF = new Uint8Array([
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
    0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21,
    0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00,
    0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
    0x01, 0x00, 0x3b
]);

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        // Get token from query params
        const url = new URL(req.url);
        const token = url.searchParams.get('token');

        if (!token) {
            // Still return the pixel, just don't log
            return new Response(TRANSPARENT_GIF, {
                headers: {
                    'Content-Type': 'image/gif',
                    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
                    ...corsHeaders
                }
            });
        }

        // Initialize Supabase with service role (to bypass RLS for finding quote)
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Find quote by token
        const { data: quote, error: quoteError } = await supabase
            .from('quotes')
            .select('id')
            .eq('acceptance_token', token)
            .single();

        if (quote && !quoteError) {
            // Extract tracking info from request
            const ipAddress = req.headers.get('x-forwarded-for') ||
                req.headers.get('cf-connecting-ip') ||
                'unknown';
            const userAgent = req.headers.get('user-agent') || 'unknown';
            const referrer = req.headers.get('referer') || null;

            // Log the view (don't await - fire and forget for speed)
            supabase
                .from('quote_views')
                .insert({
                    quote_id: quote.id,
                    ip_address: ipAddress.split(',')[0].trim(), // Get first IP if multiple
                    user_agent: userAgent.substring(0, 500), // Truncate long user agents
                    referrer: referrer?.substring(0, 500) || null
                })
                .then(() => console.log(`Logged view for quote ${quote.id}`))
                .catch((err) => console.error('Failed to log view:', err));
        }

        // Always return the tracking pixel
        return new Response(TRANSPARENT_GIF, {
            headers: {
                'Content-Type': 'image/gif',
                'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
                'Pragma': 'no-cache',
                'Expires': '0',
                ...corsHeaders
            }
        });

    } catch (error) {
        console.error('Error in track-quote-view:', error);

        // Still return pixel on error
        return new Response(TRANSPARENT_GIF, {
            headers: {
                'Content-Type': 'image/gif',
                'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
                ...corsHeaders
            }
        });
    }
});
