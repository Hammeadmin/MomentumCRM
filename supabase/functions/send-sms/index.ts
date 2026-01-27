/*
# Send SMS Edge Function (46elks)

Sends SMS messages using the 46elks API.
Each organisation provides their own API credentials (BYOK model).

Required inputs:
- to: Phone number in E.164 format (+46123456789)
- message: SMS content
- organisation_id: To fetch API credentials

Optional inputs:
- order_id: Link to order for communication log
- created_by_user_id: Who sent the SMS

Environment variables:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
*/

import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const ELKS_API_URL = 'https://api.46elks.com/a1/sms';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SmsRequest {
  to: string;
  message: string;
  organisation_id: string;
  order_id?: string;
  created_by_user_id?: string;
}

interface ElksResponse {
  id: string;
  from: string;
  to: string;
  message: string;
  direction: string;
  status: string;
  created: string;
  cost: number;
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

    const requestData: SmsRequest = await req.json();
    const { to, message, organisation_id, order_id, created_by_user_id } = requestData;

    // Validate inputs
    if (!to || !message || !organisation_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: to, message, organisation_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate phone number format (E.164)
    const phoneRegex = /^\+[1-9]\d{6,14}$/;
    if (!phoneRegex.test(to)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid phone number format. Use E.164 format (e.g., +46701234567)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Fetch organisation's SMS credentials
    const { data: org, error: orgError } = await supabase
      .from('organisations')
      .select('sms_api_username, sms_api_password, sms_sender_name')
      .eq('id', organisation_id)
      .single();

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ success: false, error: 'Organisation not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    if (!org.sms_api_username || !org.sms_api_password) {
      return new Response(
        JSON.stringify({ success: false, error: 'SMS not configured. Please add 46elks API credentials in Settings.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const senderName = (org.sms_sender_name || 'Momentum').substring(0, 11); // Max 11 chars

    // Send SMS via 46elks API
    console.log(`Sending SMS to ${to} from ${senderName}`);

    const authHeader = 'Basic ' + btoa(`${org.sms_api_username}:${org.sms_api_password}`);

    const elksResponse = await fetch(ELKS_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        from: senderName,
        to: to,
        message: message,
      }),
    });

    const responseText = await elksResponse.text();
    let elksData: ElksResponse | null = null;
    let smsStatus: 'sent' | 'failed' = 'failed';
    let errorMessage: string | null = null;

    if (elksResponse.ok) {
      try {
        elksData = JSON.parse(responseText);
        smsStatus = 'sent';
        console.log(`SMS sent successfully. ID: ${elksData?.id}`);
      } catch {
        errorMessage = 'Failed to parse 46elks response';
      }
    } else {
      console.error('46elks API error:', responseText);
      errorMessage = `46elks error: ${responseText}`;
    }

    // Log to communications table
    const communicationData: Record<string, unknown> = {
      organisation_id,
      type: 'sms',
      recipient: to,
      content: message,
      status: smsStatus,
      created_by_user_id: created_by_user_id || null,
      sent_at: smsStatus === 'sent' ? new Date().toISOString() : null,
      error_message: errorMessage,
    };

    // Only add order_id if provided
    if (order_id) {
      communicationData.order_id = order_id;
    }

    const { error: logError } = await supabase
      .from('communications')
      .insert(communicationData);

    if (logError) {
      console.error('Failed to log SMS communication:', logError);
    }

    if (smsStatus === 'failed') {
      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'SMS sent successfully',
        sms_id: elksData?.id,
        cost: elksData?.cost,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: unknown) {
    console.error('Error in send-sms:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});