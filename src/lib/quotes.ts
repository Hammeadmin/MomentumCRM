import { supabase } from './supabase';
import type { Quote, Customer, Lead, QuoteLineItem, QuoteStatus, Order } from '../types/database';
import { createOrder } from './orders'; // Import createOrder

export interface QuoteWithRelations extends Quote {
  customer?: Customer;
  lead?: Lead;
  line_items?: QuoteLineItem[];
  order?: any;
  organisation?: { id: string; name: string; email?: string; phone?: string; org_number?: string };
}

export interface QuoteFilters {
  status?: string;
  customer?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface QuoteEmailData {
  recipient_email: string;
  subject: string;
  body: string;
  include_acceptance_link?: boolean;
}

// Database operations
export const getQuotes = async (
  organisationId: string,
  filters: QuoteFilters = {},
  page: number = 0,
  pageSize: number = 20
): Promise<{ data: QuoteWithRelations[] | null; count: number; error: Error | null }> => {
  try {
    let query = supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(*),
        lead:leads(id, title),
        quote_line_items(*),
        order:orders(id, title, status),
        organisation:organisations(id, name, email, phone, org_number)
      `, { count: 'exact' })
      .eq('organisation_id', organisationId);

    // Apply filters
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters.customer && filters.customer !== 'all') {
      query = query.eq('customer_id', filters.customer);
    }

    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,quote_number.ilike.%${filters.search}%`);
    }

    // Apply pagination
    const from = page * pageSize;
    const to = (page + 1) * pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query.order('created_at', { ascending: false });

    if (error) {
      return { data: null, count: 0, error: new Error(error.message) };
    }

    // Map quote_line_items to line_items
    const quotes = (data || []).map((q: any) => ({
      ...q,
      line_items: q.quote_line_items
    }));

    return { data: quotes, count: count || 0, error: null };
  } catch (err) {
    console.error('Error fetching quotes:', err);
    return { data: null, count: 0, error: err as Error };
  }
};

export const acceptQuoteAndCreateOrder = async (
  quoteId: string
): Promise<{ data: Order | null; error: Error | null }> => {
  try {
    // 1. Fetch the full quote details
    const { data: quote, error: quoteError } = await getQuote(quoteId);
    if (quoteError || !quote) {
      return { data: null, error: new Error('Kunde inte hitta offerten.') };
    }

    // 2. Update the quote status to 'accepted'
    const { error: updateError } = await supabase
      .from('quotes')
      .update({ status: 'accepted' as QuoteStatus, accepted_at: new Date().toISOString() })
      .eq('id', quoteId);

    if (updateError) {
      return { data: null, error: new Error(updateError.message) };
    }

    // 3. Create a new order from the quote
    const orderData = {
      organisation_id: quote.organisation_id,
      customer_id: quote.customer_id,
      title: quote.title,
      description: quote.description,
      value: quote.total_amount,
      status: 'öppen_order',
      source: 'Offert',
      job_description: quote.description,
      // Copy ROT data if it exists
      include_rot: quote.include_rot,
      rot_personnummer: quote.rot_personnummer,
      rot_organisationsnummer: quote.rot_organisationsnummer,
      rot_fastighetsbeteckning: quote.rot_fastighetsbeteckning,
      rot_amount: quote.rot_amount,
      // Copy RUT data if it exists
      include_rut: quote.include_rut,
      rut_personnummer: quote.rut_personnummer,
      rut_amount: quote.rut_amount,
      primary_salesperson_id: quote.lead?.assigned_to_user_id || null,
    };

    const { data: newOrder, error: orderError } = await createOrder(orderData as Omit<Order, 'id' | 'created_at'>);

    if (orderError) {
      // Optional: Roll back quote status if order creation fails
      await supabase.from('quotes').update({ status: 'sent' }).eq('id', quoteId);
      return { data: null, error: orderError };
    }

    // 4. Link the new order back to the quote
    await supabase.from('quotes').update({ order_id: newOrder!.id }).eq('id', quoteId);


    return { data: newOrder, error: null };

  } catch (err) {
    console.error('Error in acceptQuoteAndCreateOrder:', err);
    return { data: null, error: err as Error };
  }
};

export const getQuote = async (
  id: string
): Promise<{ data: QuoteWithRelations | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(*),
        lead:leads(*),
        quote_line_items(*),
        order:orders(id, title, status),
        organisation:organisations(id, name, email, phone, org_number, address, postal_code, city)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    // Map quote_line_items to line_items
    const quote = {
      ...data,
      line_items: (data as any).quote_line_items
    };

    return { data: quote, error: null };
  } catch (err) {
    console.error('Error fetching quote:', err);
    return { data: null, error: err as Error };
  }
};

export const createQuote = async (
  quote: Omit<Quote, 'id' | 'created_at'>,
  lineItems: Omit<QuoteLineItem, 'id' | 'quote_id'>[]
): Promise<{ data: QuoteWithRelations | null; error: Error | null }> => {
  try {
    // Create quote
    const { data: newQuote, error: quoteError } = await supabase
      .from('quotes')
      .insert([quote])
      .select(`
        *,
        customer:customers(*),
        lead:leads(id, title)
      `)
      .single();

    if (quoteError) {
      return { data: null, error: new Error(quoteError.message) };
    }

    // Create line items
    if (lineItems.length > 0) {
      const lineItemsToInsert = lineItems.map(item => ({
        ...item,
        quote_id: newQuote.id
      }));

      const { error: lineItemsError } = await supabase
        .from('quote_line_items')
        .insert(lineItemsToInsert);

      if (lineItemsError) {
        // Rollback quote creation
        await supabase.from('quotes').delete().eq('id', newQuote.id);
        return { data: null, error: new Error(lineItemsError.message) };
      }
    }

    // Fetch complete quote data
    const result = await getQuote(newQuote.id);
    return result;
  } catch (err) {
    console.error('Error creating quote:', err);
    return { data: null, error: err as Error };
  }
};

export const updateQuote = async (
  id: string,
  updates: Partial<Quote>,
  lineItems?: QuoteLineItem[]
): Promise<{ data: QuoteWithRelations | null; error: Error | null }> => {
  try {
    // Update quote
    const { data, error } = await supabase
      .from('quotes')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        customer:customers(*),
        lead:leads(id, title),
        quote_line_items(*),
        order:orders(id, title, status),
        organisation:organisations(id, name, email, phone, org_number)
      `)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    // Update line items if provided
    if (lineItems) {
      // Delete existing line items
      await supabase
        .from('quote_line_items')
        .delete()
        .eq('quote_id', id);

      // Insert new line items
      if (lineItems.length > 0) {
        const lineItemsToInsert = lineItems.map(item => ({
          ...item,
          quote_id: id
        }));

        const { error: lineItemsError } = await supabase
          .from('quote_line_items')
          .insert(lineItemsToInsert);

        if (lineItemsError) {
          return { data: null, error: new Error(lineItemsError.message) };
        }
      }
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error updating quote:', err);
    return { data: null, error: err as Error };
  }
};

export const deleteQuote = async (id: string): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', id);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    console.error('Error deleting quote:', err);
    return { error: err as Error };
  }
};

export const sendQuoteEmail = async (
  quoteId: string,
  emailData: QuoteEmailData
): Promise<{ data: any | null; error: Error | null }> => {
  try {
    // Call the send-quote-email edge function
    const { data, error } = await supabase.functions.invoke('send-quote-email', {
      body: {
        quote_id: quoteId,
        recipient_email: emailData.recipient_email,
        subject: emailData.subject,
        body: emailData.body,
        include_acceptance_link: emailData.include_acceptance_link ?? true,
      }
    });

    if (error) {
      console.error('Error invoking send-quote-email:', error);
      return { data: null, error: new Error(error.message || 'Failed to send email') };
    }

    if (!data?.success) {
      return { data: null, error: new Error(data?.error || 'Failed to send email') };
    }

    return {
      data: {
        success: true,
        acceptance_token: data.acceptance_token,
        acceptance_url: data.acceptance_url,
        message_id: data.message_id
      },
      error: null
    };
  } catch (err) {
    console.error('Error sending quote email:', err);
    return { data: null, error: err as Error };
  }
};

// Generate quote email template with ROT information
export const generateQuoteEmailTemplate = (
  quote: QuoteWithRelations,
  includeAcceptanceLink: boolean = true,
  templateType: 'standard' | 'formal' | 'friendly' | 'follow_up' = 'standard'
): { subject: string; body: string } => {
  const customerName = quote.customer?.name || 'Kund';
  const quoteNumber = quote.quote_number || 'N/A';
  const amount = quote.total_amount;
  const rotAmount = quote.rot_amount || 0;
  const netAmount = amount - rotAmount;
  const companyName = quote.organisation?.name || 'Ditt Företag';
  const formatMoney = (val: number) => new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(val);

  let subject = '';
  let greeting = '';
  let intro = '';
  let closing = '';

  // Template-specific content
  switch (templateType) {
    case 'formal':
      subject = `Offert ${quoteNumber} – ${companyName}`;
      greeting = `Bästa ${customerName},`;
      intro = `Vi översänder härmed vår offert gällande ${quote.title}.\n\nNedanstående offert avser de tjänster och produkter som har diskuterats.`;
      closing = `Vi ser fram emot ert svar och står till förfogande för eventuella frågor.\n\nMed vänlig hälsning,\n${companyName}`;
      break;
    case 'friendly':
      subject = `Din offert från ${companyName} 🎉`;
      greeting = `Hej ${customerName}!`;
      intro = `Vad kul att du är intresserad av våra tjänster! Här kommer offerten för ${quote.title} som vi pratat om.`;
      closing = `Hör av dig om du har några frågor – vi hjälper gärna till!\n\nVarma hälsningar,\n${companyName}-teamet`;
      break;
    case 'follow_up':
      subject = `Påminnelse: Offert ${quoteNumber} från ${companyName}`;
      greeting = `Hej ${customerName},`;
      intro = `Vi vill bara påminna om offerten vi skickade tidigare gällande ${quote.title}.\n\nVi hoppas att du haft möjlighet att titta igenom den. Om du har några frågor eller vill diskutera något, är vi här för att hjälpa!`;
      closing = `Vi ser fram emot att höra från dig.\n\nMed vänliga hälsningar,\n${companyName}`;
      break;
    default: // standard
      subject = `Offert ${quoteNumber} från ${companyName}`;
      greeting = `Hej ${customerName}!`;
      intro = `Tack för ditt intresse för våra tjänster. Bifogat finner du vår offert för ${quote.title}.`;
      closing = `Vid frågor om offerten, tveka inte att kontakta oss.\n\nMed vänliga hälsningar,\n${companyName}`;
  }

  let body = `${greeting}\n\n${intro}\n\nOffertdetaljer:
- Offertnummer: ${quoteNumber}
- Totalt belopp: ${formatMoney(amount)}`;

  if (quote.include_rot && rotAmount > 0) {
    body += `
- ROT-avdrag: ${formatMoney(rotAmount)}
- Att betala efter ROT: ${formatMoney(netAmount)}

ROT-information:
Denna offert är berättigad till ROT-avdrag. Som privatperson kan du få skatteavdrag för 50% av arbetskostnaden, upp till 50 000 kr per person och år. ROT-avdraget dras av direkt från fakturan.`;
  }

  if (includeAcceptanceLink) {
    body += `\n\nFör att godkänna denna offert, klicka på länken nedan:
[Länk kommer att genereras automatiskt]

Offerten är giltig till ${quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('sv-SE') : 'enligt överenskommelse'}.`;
  }

  body += `\n\n${closing}`;

  return { subject, body };
};

// Utility functions
export const getQuoteStats = async (
  organisationId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{
  data: {
    totalQuotes: number;
    totalValue: number;
    averageValue: number;
    statusBreakdown: Record<string, number>;
    rotQuotes: number;
    totalROTAmount: number;
  } | null;
  error: Error | null;
}> => {
  try {
    let query = supabase
      .from('quotes')
      .select('*')
      .eq('organisation_id', organisationId);

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const quotes = data || [];
    const totalQuotes = quotes.length;
    const totalValue = quotes.reduce((sum: number, quote: Quote) => sum + quote.total_amount, 0);
    const averageValue = totalQuotes > 0 ? totalValue / totalQuotes : 0;

    const statusBreakdown = quotes.reduce((acc: Record<string, number>, quote: Quote) => {
      acc[quote.status] = (acc[quote.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const rotQuotes = quotes.filter((quote: Quote) => quote.include_rot && (quote.rot_amount || 0) > 0).length;
    const totalROTAmount = quotes.reduce((sum: number, quote: Quote) => sum + (quote.rot_amount || 0), 0);

    return {
      data: {
        totalQuotes,
        totalValue,
        averageValue,
        statusBreakdown,
        rotQuotes,
        totalROTAmount
      },
      error: null
    };
  } catch (err) {
    console.error('Error fetching quote stats:', err);
    return { data: null, error: err as Error };
  }
};

// ADD THIS ENTIRE NEW FUNCTION AT THE END OF THE FILE

export const generateOrderConfirmationEmailTemplate = (
  quote: QuoteWithRelations,
  orderNumber: string
): { subject: string; body: string } => {
  const customerName = quote.customer?.name || 'Kund';
  const amount = quote.total_amount;
  const companyName = quote.organisation?.name || 'Ditt Företag';

  const subject = `Orderbekräftelse - Order ${orderNumber}`;

  const body = `Hej ${customerName}!

Tack för din beställning! Vi bekräftar härmed att vi mottagit ditt godkännande av offert ${quote.quote_number} och skapat order ${orderNumber}.

Din order hanteras nu av vårt team.

Orderdetaljer:
- Ordernummer: ${orderNumber}
- Offertnummer: ${quote.quote_number}
- Totalt belopp: ${new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(amount)}
- Beskrivning: ${quote.description || quote.title}

Vi ser fram emot att utföra arbetet åt er!

Med vänliga hälsningar,
${companyName}`;

  return { subject, body };
};

export const sendOrderConfirmationEmail = async (
  quote: QuoteWithRelations,
  order: any
): Promise<{ success: boolean; error?: string }> => {
  try {
    const customerEmail = quote.customer?.email;
    if (!customerEmail) {
      console.log('No customer email found, skipping confirmation email');
      return { success: false, error: 'No customer email' };
    }

    const { subject, body } = generateOrderConfirmationEmailTemplate(quote, order.id.substring(0, 8).toUpperCase());

    // TODO: Integrate with actual email service
    console.log('Sending Order Confirmation Email:', {
      to: customerEmail,
      subject,
      body
    });

    // Simulate sending
    await new Promise(resolve => setTimeout(resolve, 500));

    return { success: true };
  } catch (err: any) {
    console.error('Error sending order confirmation email:', err);
    return { success: false, error: err.message };
  }
};

export const createQuoteFromLead = async (
  lead: Lead,
  organisationId: string
): Promise<{ data: Quote | null; error: Error | null }> => {
  try {
    if (!lead.customer_id) {
      return { data: null, error: new Error('Lead must be linked to a customer to create a quote.') };
    }

    const { data: quoteNumber, error: rpcError } = await supabase.rpc('generate_quote_number', {
      org_id: organisationId
    });

    if (rpcError) {
      return { data: null, error: new Error('Failed to generate quote number.') };
    }

    const quoteData = {
      organisation_id: organisationId,
      customer_id: lead.customer_id,
      lead_id: lead.id,
      quote_number: quoteNumber, // <-- ADD THIS LINE
      title: lead.title,
      description: lead.description,
      total_amount: lead.estimated_value || 0,
      status: 'draft' as const,
      subtotal: lead.estimated_value || 0,
      vat_amount: 0,
    };

    const result = await createQuote(quoteData as any, []);

    return result;

  } catch (err) {
    console.error('Error creating quote from lead:', err);
    return { data: null, error: err as Error };
  }
};