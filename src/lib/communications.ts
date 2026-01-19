import { supabase } from './supabase';
import type { UserProfile, Order, Customer } from '../types/database';

export type CommunicationType = 'email' | 'sms';
export type CommunicationStatus = 'draft' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Communication {
  id: string;
  organisation_id: string;
  order_id?: string | null; // Optional for standalone communications
  type: CommunicationType;
  recipient: string;
  subject?: string | null;
  content: string;
  status: CommunicationStatus;
  sent_at?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  created_by_user_id?: string | null; // Optional for system-generated
  created_at?: string | null;
  error_message?: string | null;
}

export interface CommunicationWithRelations extends Communication {
  created_by?: UserProfile;
  order?: Order & { customer?: Customer };
}

export interface CommunicationFilters {
  type?: CommunicationType;
  status?: CommunicationStatus;
  dateFrom?: string;
  dateTo?: string;
  customer?: string;
  search?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  variables: string[];
}

export interface SMSTemplate {
  id: string;
  name: string;
  content: string;
  variables: string[];
}

// Email templates
export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'booking_confirmation',
    name: 'Bekräftelse av bokning',
    subject: 'Bekräftelse av bokning - Order #{order_id}',
    content: `Hej {customer_name}!

Vi bekräftar härmed din bokning för {order_title}.

Orderdetaljer:
- Ordernummer: #{order_id}
- Beskrivning: {order_description}
- Planerat datum: {planned_date}

Vi kommer att kontakta dig 1-2 dagar innan för att bekräfta tid och detaljer.

Vid frågor, tveka inte att kontakta oss.

Med vänliga hälsningar,
{company_name}`,
    variables: ['customer_name', 'order_title', 'order_id', 'order_description', 'planned_date', 'company_name']
  },
  {
    id: 'visit_reminder',
    name: 'Påminnelse inför besök',
    subject: 'Påminnelse: Vi kommer imorgon - Order #{order_id}',
    content: `Hej {customer_name}!

Detta är en påminnelse om att vi kommer imorgon för att utföra {order_title}.

Tid: {visit_time}
Beräknad varaktighet: {estimated_duration}

Vänligen se till att området är tillgängligt och att eventuella fordon är flyttade.

Vid frågor eller om ni behöver ändra tiden, kontakta oss så snart som möjligt.

Med vänliga hälsningar,
{company_name}`,
    variables: ['customer_name', 'order_title', 'order_id', 'visit_time', 'estimated_duration', 'company_name']
  },
  {
    id: 'work_completed',
    name: 'Uppföljning efter slutfört arbete',
    subject: 'Arbetet är slutfört - Order #{order_id}',
    content: `Hej {customer_name}!

Vi har nu slutfört arbetet med {order_title}.

Vi hoppas att ni är nöjda med resultatet. Om ni har några frågor eller synpunkter, tveka inte att kontakta oss.

Faktura kommer att skickas separat inom kort.

Tack för förtroendet!

Med vänliga hälsningar,
{company_name}`,
    variables: ['customer_name', 'order_title', 'order_id', 'company_name']
  }
];

// SMS templates
export const SMS_TEMPLATES: SMSTemplate[] = [
  {
    id: 'visit_tomorrow',
    name: 'Vi kommer imorgon',
    content: 'Hej! Vi kommer imorgon kl {time} för {order_title}. Mvh {company_name}',
    variables: ['time', 'order_title', 'company_name']
  },
  {
    id: 'work_completed',
    name: 'Arbetet är slutfört',
    content: 'Hej! Arbetet med {order_title} är nu slutfört. Tack för förtroendet! Mvh {company_name}',
    variables: ['order_title', 'company_name']
  },
  {
    id: 'booking_reminder',
    name: 'Påminnelse om bokning',
    content: 'Påminnelse: Vi kommer {date} kl {time} för {order_title}. Mvh {company_name}',
    variables: ['date', 'time', 'order_title', 'company_name']
  },
  {
    id: 'running_late',
    name: 'Vi är försenade',
    content: 'Hej! Vi är ca {minutes} min försenade till {order_title}. Ber om ursäkt! Mvh {company_name}',
    variables: ['minutes', 'order_title', 'company_name']
  }
];

// Database operations
export const getCommunications = async (
  organisationId: string,
  filters: CommunicationFilters = {}
): Promise<{ data: CommunicationWithRelations[] | null; error: Error | null }> => {
  try {
    let query = supabase
      .from('communications')
      .select(`
        *,
        created_by:user_profiles(id, full_name, email),
        order:orders(
          id, title, description,
          customer:customers(id, name, email, phone_number)
        )
      `)
      .eq('organisation_id', organisationId);

    // Apply filters
    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    if (filters.customer) {
      query = query.eq('order.customer_id', filters.customer);
    }

    if (filters.search) {
      query = query.or(`subject.ilike.%${filters.search}%,content.ilike.%${filters.search}%,recipient.ilike.%${filters.search}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching communications:', err);
    return { data: null, error: err as Error };
  }
};

export const getOrderCommunications = async (
  orderId: string
): Promise<{ data: CommunicationWithRelations[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('communications')
      .select(`
        *,
        created_by:user_profiles(id, full_name, email)
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching order communications:', err);
    return { data: null, error: err as Error };
  }
};

export const createCommunication = async (
  communication: Omit<Communication, 'id' | 'created_at'>
): Promise<{ data: Communication | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('communications')
      .insert([communication])
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error creating communication:', err);
    return { data: null, error: err as Error };
  }
};

export const updateCommunication = async (
  id: string,
  updates: Partial<Communication>
): Promise<{ data: Communication | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('communications')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error updating communication:', err);
    return { data: null, error: err as Error };
  }
};

export const sendEmail = async (
  communicationId: string,
  emailData: {
    to: string;
    subject: string;
    content: string;
    from_name?: string;
    from_email?: string;
  }
): Promise<{ data: any | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        communication_id: communicationId,
        ...emailData
      }
    });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error sending email:', err);
    return { data: null, error: err as Error };
  }
};

export const sendSMS = async (
  communicationId: string,
  smsData: {
    to: string;
    content: string;
    from_number?: string;
  }
): Promise<{ data: any | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: {
        communication_id: communicationId,
        ...smsData
      }
    });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error sending SMS:', err);
    return { data: null, error: err as Error };
  }
};

// Template processing
export const processTemplate = (
  template: string,
  variables: Record<string, string>
): string => {
  let processed = template;

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{${key}}`, 'g');
    processed = processed.replace(regex, value || '');
  });

  return processed;
};

export const getTemplateVariables = (
  order: Order & { customer?: Customer },
  companyName: string = 'Momentum CRM'
): Record<string, string> => {
  return {
    customer_name: order.customer?.name || 'Kund',
    order_title: order.title,
    order_id: order.id.slice(-8).toUpperCase(),
    order_description: order.description || order.job_description || '',
    company_name: companyName,
    planned_date: 'TBD',
    visit_time: 'TBD',
    estimated_duration: '2-4 timmar',
    date: new Date().toLocaleDateString('sv-SE'),
    time: new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }),
    minutes: '15'
  };
};

// Utility functions
export const getStatusColor = (status: CommunicationStatus): string => {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-800';
    case 'sent': return 'bg-blue-100 text-blue-800';
    case 'delivered': return 'bg-green-100 text-green-800';
    case 'read': return 'bg-purple-100 text-purple-800';
    case 'failed': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getStatusLabel = (status: CommunicationStatus): string => {
  switch (status) {
    case 'draft': return 'Utkast';
    case 'sent': return 'Skickat';
    case 'delivered': return 'Levererat';
    case 'read': return 'Läst';
    case 'failed': return 'Misslyckades';
    default: return status;
  }
};

export const getTypeIcon = (type: CommunicationType) => {
  switch (type) {
    case 'email': return '📧';
    case 'sms': return '📱';
    default: return '💬';
  }
};

export const calculateSMSCost = (content: string, pricePerSMS: number = 0.85): number => {
  const messageCount = Math.ceil(content.length / 160);
  return messageCount * pricePerSMS;
};

export const validatePhoneNumber = (phone: string): boolean => {
  // Basic Swedish phone number validation
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 8 && cleaned.length <= 15;
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};