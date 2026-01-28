/*
# Notify Quote Event Edge Function

Creates in-app notifications for quote-related events:
- quote_accepted: When a customer accepts a quote
- quote_declined: When a customer declines a quote  
- quote_viewed: When a quote is viewed (with smart debouncing)

Can be called from:
- track-quote-view (for view events)
- QuoteAcceptance page (for accept/decline events)
*/

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface QuoteEventRequest {
    quote_id: string;
    event_type: 'quote_accepted' | 'quote_declined' | 'quote_viewed';
    metadata?: {
        view_count?: number;
        decline_reason?: string;
        customer_name?: string;
    };
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { quote_id, event_type, metadata }: QuoteEventRequest = await req.json();

        if (!quote_id || !event_type) {
            return new Response(
                JSON.stringify({ success: false, error: 'Missing quote_id or event_type' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
        }

        console.log(`Processing quote event: ${event_type} for quote ${quote_id}`);

        // Fetch quote details with organisation and customer
        const { data: quote, error: quoteError } = await supabase
            .from('quotes')
            .select(`
        id,
        quote_number,
        title,
        customer:customers(id, name),
        organisation:organisations(id, name),
        organisation_id
      `)
            .eq('id', quote_id)
            .single();

        if (quoteError || !quote) {
            console.error('Quote not found:', quoteError);
            return new Response(
                JSON.stringify({ success: false, error: 'Quote not found' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            );
        }

        // Get all admin users in the organisation to notify
        const { data: orgUsers, error: usersError } = await supabase
            .from('user_profiles')
            .select('id, full_name, role')
            .eq('organisation_id', quote.organisation_id)
            .eq('is_active', true)
            .in('role', ['admin', 'sales']);

        if (usersError || !orgUsers || orgUsers.length === 0) {
            console.log('No users to notify in organisation');
            return new Response(
                JSON.stringify({ success: true, message: 'No users to notify' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
        }

        // Build notification content based on event type
        const customerName = metadata?.customer_name || quote.customer?.name || 'Kund';
        const quoteNumber = quote.quote_number || quote.id.substring(0, 8);

        let title: string;
        let message: string;
        let notificationType: string;

        switch (event_type) {
            case 'quote_accepted':
                title = '🎉 Offert godkänd!';
                message = `${customerName} har godkänt offert ${quoteNumber} - "${quote.title}"`;
                notificationType = 'status_update';
                break;

            case 'quote_declined':
                title = '❌ Offert avvisad';
                message = metadata?.decline_reason
                    ? `${customerName} har avvisat offert ${quoteNumber}. Skäl: ${metadata.decline_reason}`
                    : `${customerName} har avvisat offert ${quoteNumber}`;
                notificationType = 'status_update';
                break;

            case 'quote_viewed':
                const viewCount = metadata?.view_count || 1;
                if (viewCount === 1) {
                    title = '👁️ Offert öppnad';
                    message = `${customerName} har öppnat offert ${quoteNumber} för första gången`;
                } else if (viewCount >= 5) {
                    title = '🔥 Het lead!';
                    message = `${customerName} har öppnat offert ${quoteNumber} ${viewCount} gånger - Ring nu!`;
                } else {
                    title = '👁️ Offert visad igen';
                    message = `${customerName} har öppnat offert ${quoteNumber} (${viewCount} visningar)`;
                }
                notificationType = 'system';
                break;

            default:
                return new Response(
                    JSON.stringify({ success: false, error: 'Invalid event type' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
                );
        }

        // Create notifications for all relevant users
        const notifications = orgUsers.map(user => ({
            user_id: user.id,
            type: notificationType,
            title,
            message,
            is_read: false,
            action_url: `/app/offert/${quote_id}`,
            created_at: new Date().toISOString()
        }));

        const { error: insertError } = await supabase
            .from('notifications')
            .insert(notifications);

        if (insertError) {
            console.error('Failed to create notifications:', insertError);
            return new Response(
                JSON.stringify({ success: false, error: insertError.message }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            );
        }

        console.log(`Created ${notifications.length} notifications for ${event_type}`);

        return new Response(
            JSON.stringify({
                success: true,
                notifications_created: notifications.length,
                event_type
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error) {
        console.error('Error in notify-quote-event:', error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});
