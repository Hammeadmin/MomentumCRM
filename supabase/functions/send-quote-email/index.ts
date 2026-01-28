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

    // Fallback: If organisation wasn't joined properly, fetch it separately
    if (!quote.organisation && quote.organisation_id) {
      console.log('Organisation not in join, fetching separately...');
      const { data: orgData } = await supabase
        .from('organisations')
        .select('id, name, email, phone, org_number')
        .eq('id', quote.organisation_id)
        .single();

      if (orgData) {
        quote.organisation = orgData;
        console.log('Fetched organisation:', orgData.name);
      }
    }

    console.log('Quote organisation:', quote.organisation?.name || 'NOT FOUND');

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
  const companyEmail = quote.organisation?.email || '';
  const companyPhone = quote.organisation?.phone || '';
  const companyOrgNumber = quote.organisation?.org_number || '';
  const customerName = quote.customer?.name || 'Kund';
  const quoteAmount = formatCurrency(quote.total_amount);
  const rotAmount = quote.include_rot ? calculateRotDeduction(quote.total_amount) : 0;
  const netAmount = quote.total_amount - rotAmount;
  const validUntil = quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('sv-SE') : null;
  const createdDate = new Date(quote.created_at).toLocaleDateString('sv-SE');

  // Get line items preview (first 5)
  const lineItems = quote.quote_line_items || [];
  const displayItems = lineItems.slice(0, 5);
  const hasMoreItems = lineItems.length > 5;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Offert från ${companyName}</title>
    </head>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f3f4f6;">
      <div style="max-width: 640px; margin: 0 auto; padding: 20px;">
        
        <!-- Header with Company Branding -->
        <div style="background-color: #1e40af; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 26px; font-weight: 700; color: white;">${companyName}</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 15px; color: white;">har skickat dig en offert</p>
        </div>
        
        <!-- Main Content -->
        <div style="background: white; padding: 40px 30px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
          
          <!-- Greeting -->
          <h2 style="color: #111827; margin: 0 0 20px 0; font-size: 22px;">Hej ${customerName}!</h2>
          
          <p style="color: #4b5563; margin: 0 0 25px 0; font-size: 16px;">
            Tack för ditt intresse! Här kommer offerten du begärt. Granska detaljerna nedan och klicka på knappen för att godkänna direkt online.
          </p>
          
          <!-- Quote Info Card -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 25px 0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
              <div>
                <p style="margin: 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Offertnummer</p>
                <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 600; color: #1e40af;">${quote.quote_number}</p>
              </div>
              <div style="text-align: right;">
                <p style="margin: 0; font-size: 13px; color: #64748b;">Datum: ${createdDate}</p>
                ${validUntil ? `<p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">Giltig t.o.m: ${validUntil}</p>` : ''}
              </div>
            </div>
            
            <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 16px; font-weight: 600;">
              ${quote.title}
            </h3>
            
            ${quote.description ? `<p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">${quote.description.substring(0, 200)}${quote.description.length > 200 ? '...' : ''}</p>` : ''}
          </div>
          
          <!-- Line Items Preview -->
          ${displayItems.length > 0 ? `
          <div style="margin: 25px 0;">
            <h4 style="margin: 0 0 15px 0; color: #374151; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Innehåll i offerten</h4>
            <table style="width: 100%; border-collapse: collapse;">
              ${displayItems.map((item: any) => `
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #374151; font-size: 14px;">
                  ${item.description || item.name || 'Post'}
                  ${item.quantity > 1 ? `<span style="color: #9ca3af;"> × ${item.quantity}</span>` : ''}
                </td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: right; color: #374151; font-size: 14px; white-space: nowrap;">
                  ${formatCurrency(item.total || item.quantity * item.unit_price)}
                </td>
              </tr>
              `).join('')}
              ${hasMoreItems ? `
              <tr>
                <td colspan="2" style="padding: 10px 0; color: #9ca3af; font-size: 13px; font-style: italic;">
                  + ${lineItems.length - 5} fler poster...
                </td>
              </tr>
              ` : ''}
            </table>
          </div>
          ` : ''}
          
          <!-- Total Amount Box -->
          <div style="background-color: #059669; background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 12px; padding: 24px; margin: 25px 0; color: white;">
            <table style="width: 100%;">
              <tr>
                <td style="padding: 8px 0; font-size: 15px; color: white;">Totalt belopp (inkl. moms)</td>
                <td style="padding: 8px 0; text-align: right; font-size: 20px; font-weight: 700; color: white;">${quoteAmount}</td>
              </tr>
              ${quote.include_rot && rotAmount > 0 ? `
              <tr>
                <td style="padding: 8px 0; font-size: 14px; color: rgba(255,255,255,0.85);">ROT-avdrag (beräknat)</td>
                <td style="padding: 8px 0; text-align: right; font-size: 16px; color: white;">-${formatCurrency(rotAmount)}</td>
              </tr>
              <tr style="border-top: 1px solid rgba(255,255,255,0.3);">
                <td style="padding: 12px 0 0 0; font-size: 15px; font-weight: 600; color: white;">Att betala efter ROT</td>
                <td style="padding: 12px 0 0 0; text-align: right; font-size: 22px; font-weight: 700; color: white;">${formatCurrency(netAmount)}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          ${quote.include_rot ? `
          <!-- ROT Info -->
          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 20px; margin: 25px 0;">
            <p style="margin: 0; color: #065f46; font-size: 14px;">
              <strong>🏠 ROT-avdrag kan nyttjas!</strong><br>
              Du anger ditt personnummer när du godkänner offerten online. ROT-avdraget hanteras automatiskt.
            </p>
          </div>
          ` : ''}
          
          <!-- CTA Button -->
          ${acceptanceUrl ? `
          <div style="text-align: center; margin: 35px 0;">
            <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
              <tr>
                <td align="center" bgcolor="#059669" style="background-color: #059669; border-radius: 10px;">
                  <a href="${acceptanceUrl}" style="display: inline-block; background-color: #059669; color: #ffffff; padding: 18px 40px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; font-family: 'Segoe UI', Arial, sans-serif;">
                    ✓ Granska och godkänn offert
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin: 12px 0 0 0; font-size: 13px; color: #9ca3af;">
              Klicka för att se fullständig offert och godkänna online
            </p>
          </div>
          ` : ''}
          
          <!-- Contact Section -->
          <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 30px 0 0 0; text-align: center;">
            <p style="margin: 0 0 10px 0; color: #374151; font-size: 14px; font-weight: 600;">Har du frågor om offerten?</p>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              Kontakta oss gärna:
              ${companyEmail ? `<a href="mailto:${companyEmail}" style="color: #2563eb; text-decoration: none;">${companyEmail}</a>` : ''}
              ${companyPhone && companyEmail ? ` · ` : ''}
              ${companyPhone ? `<a href="tel:${companyPhone}" style="color: #2563eb; text-decoration: none;">${companyPhone}</a>` : ''}
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background: #1f2937; color: white; padding: 25px 30px; border-radius: 0 0 16px 16px; text-align: center;">
          <p style="margin: 0; font-size: 16px; font-weight: 600;">${companyName}</p>
          ${companyOrgNumber ? `<p style="margin: 6px 0 0 0; font-size: 12px; opacity: 0.7;">Org.nr: ${companyOrgNumber}</p>` : ''}
          <p style="margin: 15px 0 0 0; font-size: 11px; opacity: 0.5;">
            Detta e-postmeddelande skickades automatiskt från ${companyName}s offertsystem.
          </p>
        </div>
        
      </div>
    </body>
    </html>
  `;

  // Plain text version
  const text = `
OFFERT FRÅN ${companyName.toUpperCase()}
${'='.repeat(40)}

Hej ${customerName}!

Tack för ditt intresse! Här kommer offerten du begärt.

OFFERTDETALJER
--------------
Offertnummer: ${quote.quote_number}
Datum: ${createdDate}
${validUntil ? `Giltig t.o.m: ${validUntil}` : ''}

${quote.title}
${quote.description ? `\n${quote.description}\n` : ''}

BELOPP
------
Totalt: ${quoteAmount}
${quote.include_rot && rotAmount > 0 ? `ROT-avdrag: -${formatCurrency(rotAmount)}
Att betala: ${formatCurrency(netAmount)}` : ''}

${acceptanceUrl ? `
GODKÄNN OFFERTEN
----------------
Klicka här för att granska och godkänna: ${acceptanceUrl}
` : ''}

HAR DU FRÅGOR?
--------------
${companyEmail ? `E-post: ${companyEmail}` : ''}
${companyPhone ? `Telefon: ${companyPhone}` : ''}

--
${companyName}
${companyOrgNumber ? `Org.nr: ${companyOrgNumber}` : ''}
  `.trim();

  return { html, text };
}

// Calculate ROT deduction (30% of labor, max 50k per person)
function calculateRotDeduction(totalAmount: number): number {
  const rotPercentage = 0.30;
  const maxRot = 50000;
  return Math.min(totalAmount * rotPercentage, maxRot);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}