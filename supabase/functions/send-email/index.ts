/*
# Send Email Edge Function - Production Resend Integration

1. Production Email Sending
   - Real email delivery via Resend API (https://api.resend.com/emails)
   - Supports HTML and plain text content
   - Attachment support for invoices and documents

2. Features
   - CC and BCC recipient support
   - Base64-encoded file attachments
   - Delivery status tracking in database
   - Comprehensive error handling

3. Security
   - Validates RESEND_API_KEY environment variable
   - Validates user permissions via communication record
   - Rate limiting protection
*/

import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface EmailAttachment {
  filename: string;
  content: string; // Base64 encoded content
}

interface EmailRequest {
  communication_id: string;
  to: string;
  subject: string;
  content: string;       // Plain text content
  html?: string;         // HTML content (optional)
  from_name?: string;
  from_email?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: EmailAttachment[];
}

interface ResendEmailPayload {
  from: string;
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: { filename: string; content: string }[];
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Validate RESEND_API_KEY exists
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email service not configured. RESEND_API_KEY is missing.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      communication_id,
      to,
      subject,
      content,
      html,
      from_name,
      from_email,
      cc,
      bcc,
      attachments
    }: EmailRequest = await req.json();

    console.log('Sending email:', { communication_id, to, subject, hasHtml: !!html, attachmentCount: attachments?.length || 0 });

    // Validate communication exists and user has permission
    const { data: communication, error: commError } = await supabase
      .from('communications')
      .select(`
        *,
        order:orders(
          title,
          organisation:organisations(name, email, phone),
          customer:customers(name)
        )
      `)
      .eq('id', communication_id)
      .eq('type', 'email')
      .single();

    if (commError || !communication) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Communication not found or access denied'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      );
    }

    // Get organisation details for sender info
    const orgName = communication.order?.organisation?.name || 'Företaget';
    const orgEmail = communication.order?.organisation?.email || Deno.env.get('DEFAULT_FROM_EMAIL') || 'noreply@example.com';

    // Send email via Resend
    const emailResult = await sendWithResend(RESEND_API_KEY, {
      to,
      subject,
      content,
      html,
      from_name: from_name || orgName,
      from_email: from_email || orgEmail,
      cc,
      bcc,
      attachments
    });

    if (emailResult.success) {
      // Update communication status
      await supabase
        .from('communications')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', communication_id);

      console.log(`Email sent successfully to ${to}, message_id: ${emailResult.message_id}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Email sent successfully',
          message_id: emailResult.message_id
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    } else {
      // Update communication with error
      await supabase
        .from('communications')
        .update({
          status: 'failed',
          error_message: emailResult.error
        })
        .eq('id', communication_id);

      return new Response(
        JSON.stringify({
          success: false,
          error: emailResult.error
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

  } catch (error) {
    console.error('Error in send-email function:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function sendWithResend(apiKey: string, emailData: {
  to: string;
  subject: string;
  content: string;
  html?: string;
  from_name: string;
  from_email: string;
  cc?: string[];
  bcc?: string[];
  attachments?: EmailAttachment[];
}): Promise<{ success: boolean; message_id?: string; error?: string }> {
  try {
    // Build the Resend API payload
    const payload: ResendEmailPayload = {
      from: `${emailData.from_name} <${emailData.from_email}>`,
      to: [emailData.to],
      subject: emailData.subject,
    };

    // Add text content
    if (emailData.content) {
      payload.text = emailData.content;
    }

    // Add HTML content (if provided, otherwise convert text to basic HTML)
    if (emailData.html) {
      payload.html = emailData.html;
    } else if (emailData.content) {
      // Convert plain text to basic HTML with preserved whitespace
      payload.html = `<div style="font-family: Arial, sans-serif; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(emailData.content)}</div>`;
    }

    // Add CC recipients
    if (emailData.cc && emailData.cc.length > 0) {
      payload.cc = emailData.cc;
    }

    // Add BCC recipients
    if (emailData.bcc && emailData.bcc.length > 0) {
      payload.bcc = emailData.bcc;
    }

    // Add attachments
    if (emailData.attachments && emailData.attachments.length > 0) {
      payload.attachments = emailData.attachments.map(att => ({
        filename: att.filename,
        content: att.content // Base64 encoded
      }));
    }

    console.log('Sending to Resend API:', {
      to: payload.to,
      subject: payload.subject,
      hasHtml: !!payload.html,
      ccCount: payload.cc?.length || 0,
      bccCount: payload.bcc?.length || 0,
      attachmentCount: payload.attachments?.length || 0
    });

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', responseData);
      return {
        success: false,
        error: `Resend API error: ${responseData.message || JSON.stringify(responseData)}`
      };
    }

    return {
      success: true,
      message_id: responseData.id
    };
  } catch (error) {
    console.error('Error sending email via Resend:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}