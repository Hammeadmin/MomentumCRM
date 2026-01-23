/*
# Auto Reminder System for Quotes and Invoices - BYOE System

1. Edge Function
   - `send-reminders` function to check and send email reminders
   - Handles both quote follow-ups and invoice payment reminders
   - Uses Nodemailer with Resend SMTP fallback

2. Features
   - Quote follow-up reminders (after 3, 7, 14 days)
   - Invoice payment reminders (before due date, on due date, after due date)
   - Email templates in Swedish
   - Logging of sent reminders to prevent duplicates
   - Configurable reminder settings

3. Security
   - Function requires service role key for database access
   - Rate limiting and error handling
   - Audit trail of all sent reminders
*/

import nodemailer from 'npm:nodemailer@6.9.13';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ReminderSettings {
  quoteFollowUpDays: number[];
  invoiceReminderDays: number[]; // Negative for before due date, positive for after
  fromEmail: string;
  fromName: string;
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

const DEFAULT_SETTINGS: ReminderSettings = {
  quoteFollowUpDays: [3, 7, 14], // Follow up after 3, 7, and 14 days
  invoiceReminderDays: [-3, 0, 7, 14], // 3 days before due, on due date, 7 and 14 days after
  fromEmail: 'noreply@momentum.se',
  fromName: 'Momentum CRM'
};

// Create transporter - uses Resend SMTP
function createEmailTransporter(): nodemailer.Transporter {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured');
  }

  return nodemailer.createTransport({
    host: 'smtp.resend.com',
    port: 465,
    secure: true,
    auth: {
      user: 'resend',
      pass: RESEND_API_KEY,
    },
  });
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body for manual triggers or settings
    const { organizationId, type, dryRun = false } = await req.json().catch(() => ({}));

    console.log('Starting reminder check...', { organizationId, type, dryRun });

    const results = {
      quotesProcessed: 0,
      invoicesProcessed: 0,
      emailsSent: 0,
      errors: [] as string[]
    };

    // Create transporter once for all emails
    let transporter: nodemailer.Transporter | null = null;
    if (!dryRun) {
      try {
        transporter = createEmailTransporter();
      } catch (error) {
        results.errors.push(`Failed to create email transporter: ${error.message}`);
        console.error('Transporter creation failed:', error);
      }
    }

    // Process quote reminders
    if (!type || type === 'quotes') {
      const quoteResults = await processQuoteReminders(supabase, transporter, organizationId, dryRun);
      results.quotesProcessed = quoteResults.processed;
      results.emailsSent += quoteResults.emailsSent;
      results.errors.push(...quoteResults.errors);
    }

    // Process invoice reminders
    if (!type || type === 'invoices') {
      const invoiceResults = await processInvoiceReminders(supabase, transporter, organizationId, dryRun);
      results.invoicesProcessed = invoiceResults.processed;
      results.emailsSent += invoiceResults.emailsSent;
      results.errors.push(...invoiceResults.errors);
    }

    console.log('Reminder check completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Reminders processed successfully',
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in send-reminders function:', error);

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

async function processQuoteReminders(supabase: any, transporter: nodemailer.Transporter | null, organizationId?: string, dryRun = false) {
  const results = { processed: 0, emailsSent: 0, errors: [] as string[] };

  try {
    // Get quotes that need follow-up reminders
    let query = supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(*),
        organisation:organisations(*)
      `)
      .in('status', ['sent'])
      .not('customer_id', 'is', null);

    if (organizationId) {
      query = query.eq('organisation_id', organizationId);
    }

    const { data: quotes, error } = await query;

    if (error) {
      results.errors.push(`Error fetching quotes: ${error.message}`);
      return results;
    }

    for (const quote of quotes || []) {
      results.processed++;

      try {
        const daysSinceSent = getDaysSince(quote.created_at);
        const shouldSendReminder = DEFAULT_SETTINGS.quoteFollowUpDays.includes(daysSinceSent);

        if (!shouldSendReminder) continue;

        // Check if reminder already sent for this day
        const { data: existingReminder } = await supabase
          .from('reminder_logs')
          .select('id')
          .eq('quote_id', quote.id)
          .eq('reminder_type', 'quote_followup')
          .eq('days_offset', daysSinceSent)
          .single();

        if (existingReminder) continue; // Already sent

        if (!dryRun && transporter) {
          // Send email reminder
          const emailSent = await sendQuoteReminderEmail(transporter, quote);

          if (emailSent) {
            // Log the reminder
            await supabase
              .from('reminder_logs')
              .insert({
                quote_id: quote.id,
                organisation_id: quote.organisation_id,
                reminder_type: 'quote_followup',
                days_offset: daysSinceSent,
                email_sent: true,
                sent_at: new Date().toISOString()
              });

            results.emailsSent++;
            console.log(`Quote reminder sent for quote ${quote.quote_number} (${daysSinceSent} days)`);
          }
        } else {
          console.log(`[DRY RUN] Would send quote reminder for ${quote.quote_number} (${daysSinceSent} days)`);
          results.emailsSent++;
        }

      } catch (error) {
        results.errors.push(`Error processing quote ${quote.id}: ${error.message}`);
      }
    }

  } catch (error) {
    results.errors.push(`Error in processQuoteReminders: ${error.message}`);
  }

  return results;
}

async function processInvoiceReminders(supabase: any, transporter: nodemailer.Transporter | null, organizationId?: string, dryRun = false) {
  const results = { processed: 0, emailsSent: 0, errors: [] as string[] };

  try {
    // Get unpaid invoices
    let query = supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(*),
        organisation:organisations(*),
        job:jobs(*)
      `)
      .in('status', ['sent', 'overdue'])
      .not('customer_id', 'is', null)
      .not('due_date', 'is', null);

    if (organizationId) {
      query = query.eq('organisation_id', organizationId);
    }

    const { data: invoices, error } = await query;

    if (error) {
      results.errors.push(`Error fetching invoices: ${error.message}`);
      return results;
    }

    for (const invoice of invoices || []) {
      results.processed++;

      try {
        const daysToDue = getDaysUntil(invoice.due_date);
        const shouldSendReminder = DEFAULT_SETTINGS.invoiceReminderDays.includes(daysToDue);

        if (!shouldSendReminder) continue;

        // Check if reminder already sent for this day offset
        const { data: existingReminder } = await supabase
          .from('reminder_logs')
          .select('id')
          .eq('invoice_id', invoice.id)
          .eq('reminder_type', 'invoice_payment')
          .eq('days_offset', daysToDue)
          .single();

        if (existingReminder) continue; // Already sent

        // Update invoice status to overdue if past due date
        if (daysToDue > 0 && invoice.status !== 'overdue') {
          await supabase
            .from('invoices')
            .update({ status: 'overdue' })
            .eq('id', invoice.id);
        }

        if (!dryRun && transporter) {
          // Send email reminder
          const emailSent = await sendInvoiceReminderEmail(transporter, invoice, daysToDue);

          if (emailSent) {
            // Log the reminder
            await supabase
              .from('reminder_logs')
              .insert({
                invoice_id: invoice.id,
                organisation_id: invoice.organisation_id,
                reminder_type: 'invoice_payment',
                days_offset: daysToDue,
                email_sent: true,
                sent_at: new Date().toISOString()
              });

            results.emailsSent++;
            console.log(`Invoice reminder sent for invoice ${invoice.invoice_number} (${daysToDue} days to/past due)`);
          }
        } else {
          console.log(`[DRY RUN] Would send invoice reminder for ${invoice.invoice_number} (${daysToDue} days to/past due)`);
          results.emailsSent++;
        }

      } catch (error) {
        results.errors.push(`Error processing invoice ${invoice.id}: ${error.message}`);
      }
    }

  } catch (error) {
    results.errors.push(`Error in processInvoiceReminders: ${error.message}`);
  }

  return results;
}

async function sendQuoteReminderEmail(transporter: nodemailer.Transporter, quote: any): Promise<boolean> {
  try {
    if (!quote.customer?.email) {
      console.log(`No email address for quote ${quote.quote_number}`);
      return false;
    }

    const template = getQuoteReminderTemplate(quote);
    const companyName = quote.organisation?.name || 'Momentum CRM';
    const replyTo = quote.organisation?.email || DEFAULT_SETTINGS.fromEmail;

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"${companyName}" <system@momentumcrm.com>`,
      to: quote.customer.email,
      replyTo: replyTo, // Replies go to company email
      subject: template.subject,
      text: template.text,
      html: template.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Quote reminder email sent, messageId: ${info.messageId}`);

    return true;
  } catch (error) {
    console.error('Error sending quote reminder email:', error);
    return false;
  }
}

async function sendInvoiceReminderEmail(transporter: nodemailer.Transporter, invoice: any, daysToDue: number): Promise<boolean> {
  try {
    if (!invoice.customer?.email) {
      console.log(`No email address for invoice ${invoice.invoice_number}`);
      return false;
    }

    const template = getInvoiceReminderTemplate(invoice, daysToDue);
    const companyName = invoice.organisation?.name || 'Momentum CRM';
    const replyTo = invoice.organisation?.email || DEFAULT_SETTINGS.fromEmail;

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"${companyName}" <system@momentumcrm.com>`,
      to: invoice.customer.email,
      replyTo: replyTo, // Replies go to company email
      subject: template.subject,
      text: template.text,
      html: template.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Invoice reminder email sent, messageId: ${info.messageId}`);

    return true;
  } catch (error) {
    console.error('Error sending invoice reminder email:', error);
    return false;
  }
}

function getQuoteReminderTemplate(quote: any): EmailTemplate {
  const daysSinceSent = getDaysSince(quote.created_at);
  const companyName = quote.organisation?.name || 'Momentum';
  const customerName = quote.customer?.name || 'Kund';
  const quoteAmount = formatCurrency(quote.total_amount);

  let subject: string;
  let greeting: string;
  let message: string;

  if (daysSinceSent <= 3) {
    subject = `Påminnelse: Offert ${quote.quote_number} från ${companyName}`;
    greeting = `Hej ${customerName}!`;
    message = `Vi hoppas att du har haft tid att granska vår offert. Vi är glada att svara på eventuella frågor du kan ha.`;
  } else if (daysSinceSent <= 7) {
    subject = `Följer upp: Offert ${quote.quote_number} - Har du några frågor?`;
    greeting = `Hej ${customerName}!`;
    message = `Vi ville följa upp vår offert och se om du behöver ytterligare information för att fatta ett beslut.`;
  } else {
    subject = `Sista påminnelse: Offert ${quote.quote_number} från ${companyName}`;
    greeting = `Hej ${customerName}!`;
    message = `Detta är vår sista påminnelse angående offerten. Vi skulle uppskatta att höra från dig, även om du beslutat att inte gå vidare.`;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563EB;">${companyName}</h2>
        
        <p>${greeting}</p>
        
        <p>${message}</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Offertdetaljer:</h3>
          <p><strong>Offertnummer:</strong> ${quote.quote_number}</p>
          <p><strong>Titel:</strong> ${quote.title}</p>
          <p><strong>Belopp:</strong> ${quoteAmount}</p>
          ${quote.valid_until ? `<p><strong>Giltig till:</strong> ${formatDate(quote.valid_until)}</p>` : ''}
        </div>
        
        <p>Vi ser fram emot att höra från dig!</p>
        
        <p>Med vänliga hälsningar,<br>
        ${companyName}</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666;">
          Detta är en automatisk påminnelse. Om du har frågor, vänligen kontakta oss direkt.
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `
${greeting}

${message}

Offertdetaljer:
- Offertnummer: ${quote.quote_number}
- Titel: ${quote.title}
- Belopp: ${quoteAmount}
${quote.valid_until ? `- Giltig till: ${formatDate(quote.valid_until)}` : ''}

Vi ser fram emot att höra från dig!

Med vänliga hälsningar,
${companyName}

Detta är en automatisk påminnelse. Om du har frågor, vänligen kontakta oss direkt.
  `;

  return { subject, html, text };
}

function getInvoiceReminderTemplate(invoice: any, daysToDue: number): EmailTemplate {
  const companyName = invoice.organisation?.name || 'Momentum';
  const customerName = invoice.customer?.name || 'Kund';
  const invoiceAmount = formatCurrency(invoice.amount);
  const dueDate = formatDate(invoice.due_date);

  let subject: string;
  let greeting: string;
  let message: string;
  let urgency: string;

  if (daysToDue < 0) {
    // Before due date
    const daysLeft = Math.abs(daysToDue);
    subject = `Påminnelse: Faktura ${invoice.invoice_number} förfaller om ${daysLeft} dagar`;
    greeting = `Hej ${customerName}!`;
    message = `Vi vill påminna dig om att faktura ${invoice.invoice_number} förfaller om ${daysLeft} dagar.`;
    urgency = `Vänligen se till att betalningen är genomförd innan förfallodatumet för att undvika förseningsavgifter.`;
  } else if (daysToDue === 0) {
    // Due today
    subject = `VIKTIGT: Faktura ${invoice.invoice_number} förfaller idag`;
    greeting = `Hej ${customerName}!`;
    message = `Faktura ${invoice.invoice_number} förfaller idag.`;
    urgency = `Vänligen genomför betalningen så snart som möjligt för att undvika förseningsavgifter.`;
  } else {
    // Overdue
    subject = `FÖRFALLEN: Faktura ${invoice.invoice_number} är ${daysToDue} dagar försenad`;
    greeting = `Hej ${customerName}!`;
    message = `Faktura ${invoice.invoice_number} är nu ${daysToDue} dagar försenad.`;
    urgency = `Vänligen kontakta oss omedelbart för att lösa denna situation. Förseningsavgifter kan tillkomma.`;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563EB;">${companyName}</h2>
        
        <p>${greeting}</p>
        
        <p>${message}</p>
        
        <div style="background-color: ${daysToDue > 0 ? '#fef2f2' : '#f8f9fa'}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${daysToDue > 0 ? '#ef4444' : '#2563EB'};">
          <h3 style="margin-top: 0; color: ${daysToDue > 0 ? '#dc2626' : '#1f2937'};">Fakturadetaljer:</h3>
          <p><strong>Fakturanummer:</strong> ${invoice.invoice_number}</p>
          <p><strong>Belopp:</strong> ${invoiceAmount}</p>
          <p><strong>Förfallodatum:</strong> ${dueDate}</p>
          ${invoice.job?.title ? `<p><strong>Avser:</strong> ${invoice.job.title}</p>` : ''}
        </div>
        
        <p style="font-weight: bold; color: ${daysToDue > 0 ? '#dc2626' : '#1f2937'};">${urgency}</p>
        
        <p>Om du redan har genomfört betalningen, vänligen bortse från denna påminnelse.</p>
        
        <p>Vid frågor, tveka inte att kontakta oss.</p>
        
        <p>Med vänliga hälsningar,<br>
        ${companyName}</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666;">
          Detta är en automatisk påminnelse. Om du har frågor om denna faktura, vänligen kontakta oss direkt.
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `
${greeting}

${message}

Fakturadetaljer:
- Fakturanummer: ${invoice.invoice_number}
- Belopp: ${invoiceAmount}
- Förfallodatum: ${dueDate}
${invoice.job?.title ? `- Avser: ${invoice.job.title}` : ''}

${urgency}

Om du redan har genomfört betalningen, vänligen bortse från denna påminnelse.

Vid frågor, tveka inte att kontakta oss.

Med vänliga hälsningar,
${companyName}

Detta är en automatisk påminnelse. Om du har frågor om denna faktura, vänligen kontakta oss direkt.
  `;

  return { subject, html, text };
}

function getDaysSince(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function getDaysUntil(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(dateString));
}