import { supabase } from './supabase';

export type TemplateChannel = 'email' | 'sms';
export type TemplateType = 'quote' | 'invoice' | 'reminder' | 'booking_confirmation' | 'follow_up' | 'welcome' | 'general';

export interface MessageTemplate {
  id: string;
  organisation_id: string;
  name: string;
  channel: TemplateChannel;
  type: TemplateType;
  subject: string | null;
  content: string;
  variables: string[];
  is_default: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  organisation_id: string;
  name: string;
  channel: TemplateChannel;
  type: TemplateType;
  subject?: string;
  content: string;
  variables?: string[];
  created_by?: string;
}

export interface UpdateTemplateInput {
  name?: string;
  type?: TemplateType;
  subject?: string;
  content?: string;
  variables?: string[];
  is_active?: boolean;
}

export const TEMPLATE_TYPE_LABELS: Record<TemplateType, string> = {
  quote: 'Offert',
  invoice: 'Faktura',
  reminder: 'Påminnelse',
  booking_confirmation: 'Bokningsbekräftelse',
  follow_up: 'Uppföljning',
  welcome: 'Välkommen',
  general: 'Allmän'
};

export const TEMPLATE_VARIABLES: Record<TemplateType, { name: string; description: string }[]> = {
  quote: [
    { name: 'customer_name', description: 'Kundens namn' },
    { name: 'quote_number', description: 'Offertnummer' },
    { name: 'amount', description: 'Offertbelopp' },
    { name: 'valid_until', description: 'Giltig till datum' },
    { name: 'company_name', description: 'Företagsnamn' },
    { name: 'company_phone', description: 'Företagets telefon' },
    { name: 'company_email', description: 'Företagets e-post' }
  ],
  invoice: [
    { name: 'customer_name', description: 'Kundens namn' },
    { name: 'invoice_number', description: 'Fakturanummer' },
    { name: 'amount', description: 'Fakturabelopp' },
    { name: 'due_date', description: 'Förfallodatum' },
    { name: 'payment_terms', description: 'Betalningsvillkor (dagar)' },
    { name: 'bank_account', description: 'Bankgiro/kontonummer' },
    { name: 'company_name', description: 'Företagsnamn' }
  ],
  reminder: [
    { name: 'customer_name', description: 'Kundens namn' },
    { name: 'invoice_number', description: 'Fakturanummer' },
    { name: 'amount', description: 'Belopp' },
    { name: 'due_date', description: 'Förfallodatum' },
    { name: 'company_name', description: 'Företagsnamn' }
  ],
  booking_confirmation: [
    { name: 'customer_name', description: 'Kundens namn' },
    { name: 'booking_date', description: 'Bokningsdatum' },
    { name: 'booking_time', description: 'Bokningstid' },
    { name: 'address', description: 'Adress' },
    { name: 'assigned_worker', description: 'Tilldelad medarbetare' },
    { name: 'worker_phone', description: 'Medarbetarens telefon' },
    { name: 'company_name', description: 'Företagsnamn' },
    { name: 'company_phone', description: 'Företagets telefon' }
  ],
  follow_up: [
    { name: 'customer_name', description: 'Kundens namn' },
    { name: 'booking_date', description: 'Datum' },
    { name: 'booking_time', description: 'Tid' },
    { name: 'address', description: 'Adress' },
    { name: 'company_name', description: 'Företagsnamn' }
  ],
  welcome: [
    { name: 'customer_name', description: 'Kundens namn' },
    { name: 'company_name', description: 'Företagsnamn' },
    { name: 'company_phone', description: 'Företagets telefon' },
    { name: 'company_email', description: 'Företagets e-post' }
  ],
  general: [
    { name: 'customer_name', description: 'Kundens namn' },
    { name: 'assigned_worker', description: 'Medarbetare' },
    { name: 'eta_minutes', description: 'Beräknad ankomsttid (minuter)' },
    { name: 'company_name', description: 'Företagsnamn' },
    { name: 'company_phone', description: 'Företagets telefon' }
  ]
};

export const getMessageTemplates = async (
  organisationId: string,
  channel?: TemplateChannel,
  type?: TemplateType
): Promise<{ data: MessageTemplate[] | null; error: Error | null }> => {
  try {
    let query = supabase
      .from('message_templates')
      .select('*')
      .eq('organisation_id', organisationId)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (channel) {
      query = query.eq('channel', channel);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching message templates:', err);
    return { data: null, error: err as Error };
  }
};

export const getTemplateById = async (
  templateId: string
): Promise<{ data: MessageTemplate | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', templateId)
      .maybeSingle();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error fetching template:', err);
    return { data: null, error: err as Error };
  }
};

export const createMessageTemplate = async (
  template: CreateTemplateInput
): Promise<{ data: MessageTemplate | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('message_templates')
      .insert([{
        ...template,
        variables: template.variables || [],
        is_default: false,
        is_active: true
      }])
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error creating template:', err);
    return { data: null, error: err as Error };
  }
};

export const updateMessageTemplate = async (
  templateId: string,
  updates: UpdateTemplateInput
): Promise<{ data: MessageTemplate | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('message_templates')
      .update(updates)
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error updating template:', err);
    return { data: null, error: err as Error };
  }
};

export const deleteMessageTemplate = async (
  templateId: string
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('message_templates')
      .delete()
      .eq('id', templateId)
      .eq('is_default', false);

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('Error deleting template:', err);
    return { success: false, error: err as Error };
  }
};

export const duplicateTemplate = async (
  templateId: string,
  newName: string
): Promise<{ data: MessageTemplate | null; error: Error | null }> => {
  try {
    const { data: original, error: fetchError } = await getTemplateById(templateId);

    if (fetchError || !original) {
      return { data: null, error: fetchError || new Error('Template not found') };
    }

    const { data, error } = await supabase
      .from('message_templates')
      .insert([{
        organisation_id: original.organisation_id,
        name: newName,
        channel: original.channel,
        type: original.type,
        subject: original.subject,
        content: original.content,
        variables: original.variables,
        is_default: false,
        is_active: true
      }])
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error duplicating template:', err);
    return { data: null, error: err as Error };
  }
};

export const renderTemplate = (
  template: string,
  variables: Record<string, string | number | undefined>
): string => {
  let rendered = template;

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    rendered = rendered.replace(regex, String(value ?? ''));
  });

  return rendered;
};

export const extractVariablesFromContent = (content: string): string[] => {
  const matches = content.match(/\{([^}]+)\}/g);
  if (!matches) return [];

  return [...new Set(matches.map(m => m.slice(1, -1)))];
};

export const validateTemplateContent = (
  content: string,
  channel: TemplateChannel
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!content.trim()) {
    errors.push('Mallinnehållet får inte vara tomt');
  }

  if (channel === 'sms') {
    const charCount = content.length;
    if (charCount > 1600) {
      errors.push(`SMS-meddelandet är för långt (${charCount}/1600 tecken)`);
    }

    const specialChars = content.match(/[^\x00-\x7F]/g);
    if (specialChars) {
      const uniqueSpecial = [...new Set(specialChars)].join(', ');
      errors.push(`SMS innehåller specialtecken som kan påverka längden: ${uniqueSpecial}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

export const getSmsCharacterInfo = (content: string): {
  charCount: number;
  smsCount: number;
  encoding: 'GSM-7' | 'UCS-2';
} => {
  const gsm7Chars = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖÑÜñü§¿a-zäöñüà\r\n]*$/;
  const isGsm7 = gsm7Chars.test(content);

  const charCount = content.length;
  let smsCount: number;

  if (isGsm7) {
    if (charCount <= 160) {
      smsCount = 1;
    } else {
      smsCount = Math.ceil(charCount / 153);
    }
  } else {
    if (charCount <= 70) {
      smsCount = 1;
    } else {
      smsCount = Math.ceil(charCount / 67);
    }
  }

  return {
    charCount,
    smsCount,
    encoding: isGsm7 ? 'GSM-7' : 'UCS-2'
  };
};
