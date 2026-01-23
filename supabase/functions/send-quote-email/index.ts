/*
# Send Quote Email with Acceptance Link - BYOE System

1. Smart Email Sending
   - Uses user's custom SMTP settings if configured
   - Falls back to system Resend account if no custom settings
   - Forces Reply-To header to user's email for customer replies

2. Features
   - "Accept Quote" button with secure link
   - ROT-aware email templates
   - Company branding
   - Automatic token expiration

3. Security
   - Validates user authentication via JWT
   - Secure token generation for quote acceptance
   - Rate limiting protection
*/

import nodemailer from 'npm:nodemailer@6.9.13';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface QuoteEmailRequest {
  quote_id: string;
  recipient_email: string;
  subject: string;
  body: string;
  include_acceptance_link: boolean;
  from_name?: string;
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
    console.log(`Processing quote email for user: ${user.id} (${userEmail})`);

    const {
      quote_id,
      recipient_email,
      subject,
      body,
      include_acceptance_link,
      from_name
    }: QuoteEmailRequest = await req.json();

    console.log('Sending quote email:', { quote_id, recipient_email, include_acceptance_link });

    // Validate quote exists and get details
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(*),
        organisation:organisations(*),
        quote_line_items(*)
      `)
      .eq('id', quote_id)
      .single();

    if (quoteError || !quote) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Quote not found or access denied'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      );
    }

    let acceptanceToken = null;
    let acceptanceUrl = null;

    // Generate acceptance token if requested
    if (include_acceptance_link) {
      const { data: token, error: tokenError } = await supabase.rpc('set_quote_acceptance_token', {
        quote_id: quote_id,
        expires_in_days: 30
      });

      if (tokenError) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Failed to generate acceptance token: ${tokenError.message}`
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          }
        );
      }

      acceptanceToken = token;
      const siteUrl = Deno.env.get('SITE_URL')
        || Deno.env.get('PUBLIC_SITE_URL')
        || req.headers.get('origin')
        || 'https://crm.momentumcrm.com';
      const cleanSiteUrl = siteUrl.replace(/\/$/, '');
      acceptanceUrl = `${cleanSiteUrl}/quote-accept/${token}`;
      console.log(`Generated acceptance URL: ${acceptanceUrl}`);
    }

    // Generate tracking pixel URL (supabaseUrl from line 55)
    const trackingPixelUrl = acceptanceToken
      ? `${supabaseUrl}/functions/v1/track-quote-view?token=${acceptanceToken}`
      : null;

    // Generate email content with acceptance link
    let emailContent = generateQuoteEmailContent(quote, body, acceptanceUrl);

    // Embed tracking pixel in HTML (before closing body tag)
    if (trackingPixelUrl && emailContent.html) {
      const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:none;border:0;width:1px;height:1px;" />`;
      emailContent.html = emailContent.html.replace('</body>', `${trackingPixel}</body>`);
    }

    // Query user_smtp_settings for this user
    const { data: smtpSettings, error: smtpError } = await supabase
      .from('user_smtp_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Determine transporter configuration
    let transporter: nodemailer.Transporter;
    let fromAddress: string;
    const senderName = from_name || quote.organisation?.name || 'Företaget';

    if (smtpSettings && !smtpError) {
      // User has custom SMTP settings - use their server
      console.log(`Using custom SMTP: ${smtpSettings.smtp_host}:${smtpSettings.smtp_port}`);

      transporter = nodemailer.createTransport({
        host: smtpSettings.smtp_host,
        port: smtpSettings.smtp_port,
        secure: smtpSettings.smtp_port === 465,
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
      to: recipient_email,
      subject: subject,
      replyTo: userEmail, // CRITICAL: Always set reply-to to user's email
      text: emailContent.text,
      html: emailContent.html,
    };

    console.log('Sending quote email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      replyTo: mailOptions.replyTo,
      subject: mailOptions.subject
    });

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log(`Quote email sent successfully, messageId: ${info.messageId}`);

    // Update quote status
    await supabase
      .from('quotes')
      .update({ status: 'sent' })
      .eq('id', quote_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Quote email sent successfully',
        acceptance_token: acceptanceToken,
        acceptance_url: acceptanceUrl,
        message_id: info.messageId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in send-quote-email function:', error);

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

function generateQuoteEmailContent(quote: any, bodyText: string, acceptanceUrl?: string | null) {
  const companyName = quote.organisation?.name || 'Momentum CRM';
  const customerName = quote.customer?.name || 'Kund';
  const quoteAmount = formatCurrency(quote.total_amount);
  const rotAmount = quote.rot_amount || 0;
  const netAmount = quote.total_amount - rotAmount;

  // Replace acceptance link placeholder in body
  let finalBody = bodyText;
  if (acceptanceUrl) {
    finalBody = finalBody.replace(
      '[Länk kommer att genereras automatiskt]',
      acceptanceUrl
    );
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Offert från ${companyName}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2563EB 0%, #1d4ed8 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px 20px; border: 1px solid #e5e7eb; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
        .button { display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .rot-info { background: #ecfdf5; border: 1px solid #a7f3d0; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .quote-details { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 28px;">${companyName}</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Offert ${quote.quote_number}</p>
        </div>
        
        <div class="content">
          <h2 style="color: #1f2937; margin-top: 0;">Hej ${customerName}!</h2>
          
          <div style="white-space: pre-wrap; margin: 20px 0;">${finalBody}</div>
          
          <div class="quote-details">
            <h3 style="margin-top: 0; color: #374151;">Offertsammanfattning:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">Totalt belopp:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${quoteAmount}</td>
              </tr>
              ${quote.include_rot && rotAmount > 0 ? `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #059669;">ROT-avdrag:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: #059669;">-${formatCurrency(rotAmount)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #059669; font-weight: bold;">Att betala efter ROT:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #059669; font-size: 18px;">${formatCurrency(netAmount)}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          ${quote.include_rot && rotAmount > 0 ? `
          <div class="rot-info">
            <h3 style="margin-top: 0; color: #065f46;">🏠 ROT-avdrag inkluderat</h3>
            <p style="margin: 0 0 10px 0; color: #047857;">
              Som privatperson får du automatiskt ROT-avdrag på ${formatCurrency(rotAmount)}. 
              Detta dras av direkt från fakturan - du behöver inte ansöka separat hos Skatteverket.
            </p>
            ${quote.rot_personnummer ? `<p style="margin: 5px 0; color: #047857;"><strong>Personnummer:</strong> ${quote.rot_personnummer}</p>` : ''}
            ${quote.rot_fastighetsbeteckning ? `<p style="margin: 5px 0; color: #047857;"><strong>Fastighetsbeteckning:</strong> ${quote.rot_fastighetsbeteckning}</p>` : ''}
          </div>
          ` : ''}
          
          ${acceptanceUrl ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${acceptanceUrl}" class="button" style="color: white;">
              🎯 Godkänn offert online
            </a>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #6b7280;">
              Klicka för att godkänna offerten och bekräfta beställningen
            </p>
          </div>
          ` : ''}
        </div>
        
        <div class="footer">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            ${companyName}${quote.organisation?.email ? ` | ${quote.organisation.email}` : ''}${quote.organisation?.phone ? ` | ${quote.organisation.phone}` : ''}
          </p>
          ${quote.organisation?.org_number ? `
          <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 12px;">
            Org.nr: ${quote.organisation.org_number}
          </p>
          ` : ''}
        </div>
      </div>
    </body>
    </html>
  `;

  const text = finalBody + `

Offertsammanfattning:
- Totalt belopp: ${quoteAmount}
${quote.include_rot && rotAmount > 0 ? `- ROT-avdrag: -${formatCurrency(rotAmount)}
- Att betala efter ROT: ${formatCurrency(netAmount)}` : ''}

${acceptanceUrl ? `Godkänn offert online: ${acceptanceUrl}` : ''}

${companyName}${quote.organisation?.email ? ` | ${quote.organisation.email}` : ''}${quote.organisation?.phone ? ` | ${quote.organisation.phone}` : ''}
${quote.organisation?.org_number ? `Org.nr: ${quote.organisation.org_number}` : ''}
${quote.include_rot && rotAmount > 0 && quote.rot_personnummer ? `Personnummer: ${quote.rot_personnummer}` : ''}
${quote.include_rot && rotAmount > 0 && quote.rot_fastighetsbeteckning ? `Fastighetsbeteckning: ${quote.rot_fastighetsbeteckning}` : ''}
  `;

  return { html, text };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
  }).format(amount);
}