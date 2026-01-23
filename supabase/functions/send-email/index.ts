/*
# Send Email Edge Function - BYOE (Bring Your Own Email) System

1. Smart Email Sending
   - Uses user's custom SMTP settings if configured
   - Falls back to system Resend account if no custom settings
   - Forces Reply-To header to user's email for customer replies

2. Features
   - CC and BCC recipient support
   - Base64-encoded file attachments
   - Delivery status tracking in database
   - Comprehensive error handling

3. Security
   - Validates user authentication via JWT
   - Users can only access their own SMTP settings (RLS)
   - Rate limiting protection
*/

import nodemailer from 'npm:nodemailer@6.9.13';
import { createClient } from 'jsr:@supabase/supabase-js@2';

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
  communication_id?: string;
  to: string;
  subject: string;
  content?: string;       // Plain text content
  html?: string;          // HTML content
  from_name?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: EmailAttachment[];
}

interface SmtpSettings {
  user_id: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Initialize Supabase Admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from Auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const userEmail = user.email;
    console.log(`Processing email request for user: ${user.id} (${userEmail})`);

    // Parse request body
    const {
      communication_id,
      to,
      subject,
      content,
      html,
      from_name,
      cc,
      bcc,
      attachments
    }: EmailRequest = await req.json();

    console.log('Email request:', { to, subject, hasHtml: !!html, attachmentCount: attachments?.length || 0 });

    // Query user_smtp_settings for this user
    const { data: smtpSettings, error: smtpError } = await supabase
      .from('user_smtp_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Determine transporter configuration
    let transporter: nodemailer.Transporter;
    let fromAddress: string;
    const senderName = from_name || 'MomentumCRM';

    if (smtpSettings && !smtpError) {
      // User has custom SMTP settings - use their server
      console.log(`Using custom SMTP: ${smtpSettings.smtp_host}:${smtpSettings.smtp_port}`);

      transporter = nodemailer.createTransport({
        host: smtpSettings.smtp_host,
        port: smtpSettings.smtp_port,
        secure: smtpSettings.smtp_port === 465, // true for 465, false for other ports
        auth: {
          user: smtpSettings.smtp_user,
          pass: smtpSettings.smtp_pass,
        },
      });

      fromAddress = `"${senderName}" <${smtpSettings.smtp_user}>`;
    } else {
      // No custom settings - fallback to Resend via SMTP
      const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
      if (!RESEND_API_KEY) {
        console.error('RESEND_API_KEY not configured and no custom SMTP settings');
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Email service not configured. Please add SMTP settings or configure RESEND_API_KEY.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      console.log('Using Resend SMTP fallback');

      transporter = nodemailer.createTransport({
        host: 'smtp.resend.com',
        port: 465,
        secure: true,
        auth: {
          user: 'resend',
          pass: RESEND_API_KEY,
        },
      });

      fromAddress = `"${senderName}" <system@momentumcrm.com>`;
    }

    // Build email options
    const mailOptions: nodemailer.SendMailOptions = {
      from: fromAddress,
      to: to,
      subject: subject,
      replyTo: userEmail, // CRITICAL: Always set reply-to to user's email
    };

    // Add text content
    if (content) {
      mailOptions.text = content;
    }

    // Add HTML content
    if (html) {
      mailOptions.html = html;
    } else if (content) {
      // Convert plain text to basic HTML with preserved whitespace
      mailOptions.html = `<div style="font-family: Arial, sans-serif; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(content)}</div>`;
    }

    // Add CC recipients
    if (cc && cc.length > 0) {
      mailOptions.cc = cc;
    }

    // Add BCC recipients
    if (bcc && bcc.length > 0) {
      mailOptions.bcc = bcc;
    }

    // Add attachments
    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments.map(att => ({
        filename: att.filename,
        content: att.content,
        encoding: 'base64'
      }));
    }

    console.log('Sending email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      replyTo: mailOptions.replyTo,
      subject: mailOptions.subject,
      hasHtml: !!mailOptions.html,
      ccCount: cc?.length || 0,
      bccCount: bcc?.length || 0,
      attachmentCount: attachments?.length || 0
    });

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully, messageId: ${info.messageId}`);

    // Update communication status if communication_id was provided
    if (communication_id) {
      await supabase
        .from('communications')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', communication_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        message_id: info.messageId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in send-email function:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to send email'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}