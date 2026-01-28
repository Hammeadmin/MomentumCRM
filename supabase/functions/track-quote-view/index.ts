/*
# Track Quote View Edge Function

Returns a 1x1 transparent GIF and logs the view to quote_views table.
Used as a tracking pixel in quote emails.

Enhanced: Now triggers in-app notifications for significant view events.

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

// View counts that trigger notifications (1st, 3rd, 5th, then every 5th)
const NOTIFICATION_VIEW_COUNTS = [1, 3, 5, 10, 15, 20];

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

        // Find quote by token with customer info
        const { data: quote, error: quoteError } = await supabase
            .from('quotes')
            .select(`
                id,
                quote_number,
                customer:customers(id, name)
            `)
            .eq('acceptance_token', token)
            .single();

        if (quote && !quoteError) {
            // Extract tracking info from request
            const ipAddress = req.headers.get('x-forwarded-for') ||
                req.headers.get('cf-connecting-ip') ||
                'unknown';
            const userAgent = req.headers.get('user-agent') || 'unknown';
            const referrer = req.headers.get('referer') || null;

            // Log the view
            const { error: insertError } = await supabase
                .from('quote_views')
                .insert({
                    quote_id: quote.id,
                    ip_address: ipAddress.split(',')[0].trim(),
                    user_agent: userAgent.substring(0, 500),
                    referrer: referrer?.substring(0, 500) || null
                });

            if (!insertError) {
                console.log(`Logged view for quote ${quote.id}`);

                // Get total view count for this quote
                const { count: viewCount } = await supabase
                    .from('quote_views')
                    .select('*', { count: 'exact', head: true })
                    .eq('quote_id', quote.id);

                const totalViews = viewCount || 1;

                // Check if we should send a notification
                const shouldNotify = NOTIFICATION_VIEW_COUNTS.includes(totalViews) ||
                    (totalViews > 20 && totalViews % 10 === 0);

                if (shouldNotify) {
                    // Check if we already sent a notification in the last hour (debounce)
                    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
                    const { count: recentNotifications } = await supabase
                        .from('notifications')
                        .select('*', { count: 'exact', head: true })
                        .ilike('message', `%${quote.quote_number}%`)
                        .ilike('title', '%Offert%')
                        .gte('created_at', oneHourAgo);

                    if (!recentNotifications || recentNotifications === 0) {
                        // Trigger notification via edge function
                        console.log(`Triggering notification for quote ${quote.id} (${totalViews} views)`);

                        try {
                            await fetch(`${supabaseUrl}/functions/v1/notify-quote-event`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${supabaseServiceKey}`
                                },
                                body: JSON.stringify({
                                    quote_id: quote.id,
                                    event_type: 'quote_viewed',
                                    metadata: {
                                        view_count: totalViews,
                                        customer_name: quote.customer?.name
                                    }
                                })
                            });
                        } catch (notifyErr) {
                            console.error('Failed to send view notification:', notifyErr);
                            // Don't block - continue returning the pixel
                        }
                    } else {
                        console.log(`Skipping notification - already sent within last hour`);
                    }
                }
            } else {
                console.error('Failed to log view:', insertError);
            }
        }

        // Always return the tracking pixel immediately
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
