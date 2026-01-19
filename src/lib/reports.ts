import { supabase } from './supabase';
import { formatCurrency, formatDate } from './database';
import { getInvoices} from './invoices';
import { getOrders } from './orders';
import { getCreditNotes } from './creditNotes';
import { INVOICE_STATUS_LABELS, ORDER_STATUS_LABELS } from '../types/database';

export interface ReportData {
  id: string;
  title: string;
  description: string;
  data: any[];
  generatedAt: string;
  parameters: Record<string, any>;
}

export interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  organisationId: string;
  userId?: string;
  customerId?: string;
  status?: string;
}

// Sales Reports
export const getSalesReport = async (
  filters: ReportFilters
): Promise<{ data: any[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers(name),
        assigned_to:user_profiles(full_name)
      `)
      .eq('organisation_id', filters.organisationId)
      .gte('created_at', filters.dateFrom)
      .lte('created_at', filters.dateTo)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    // Process data for sales report
    const salesData = processOrdersForSalesReport(data || []);
    return { data: salesData, error: null };
  } catch (err) {
    console.error('Error generating sales report:', err);
    return { data: null, error: err as Error };
  }
};

export const getInvoiceReport = async (
  filters: ReportFilters
): Promise<{ data: any[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(name)
      `)
      .eq('organisation_id', filters.organisationId)
      .gte('created_at', filters.dateFrom)
      .lte('created_at', filters.dateTo)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error generating invoice report:', err);
    return { data: null, error: err as Error };
  }
};

export const getOrderReport = async (
  filters: ReportFilters
): Promise<{ data: any[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers(name),
        assigned_to:user_profiles(full_name),
        assigned_team:teams(name)
      `)
      .eq('organisation_id', filters.organisationId)
      .gte('created_at', filters.dateFrom)
      .lte('created_at', filters.dateTo)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error generating order report:', err);
    return { data: null, error: err as Error };
  }
};

export const getCommunicationReport = async (
  filters: ReportFilters
): Promise<{ data: any[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('communications')
      .select(`
        *,
        created_by:user_profiles(full_name),
        order:orders(title, customer:customers(name))
      `)
      .eq('organisation_id', filters.organisationId)
      .gte('created_at', filters.dateFrom)
      .lte('created_at', filters.dateTo)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error generating communication report:', err);
    return { data: null, error: err as Error };
  }
};

// Report processing functions
const processOrdersForSalesReport = (orders: any[]): any[] => {
  // Group by month
  const monthlyData = orders.reduce((acc, order) => {
    const month = new Date(order.created_at).toLocaleDateString('sv-SE', { 
      year: 'numeric', 
      month: 'short' 
    });
    
    if (!acc[month]) {
      acc[month] = {
        månad: month,
        ordrar: 0,
        värde: 0,
        genomsnitt: 0
      };
    }
    
    acc[month].ordrar += 1;
    acc[month].värde += order.value || 0;
    acc[month].genomsnitt = acc[month].värde / acc[month].ordrar;
    
    return acc;
  }, {});

  return Object.values(monthlyData);
};

// Export functions
export const exportReportToPDF = async (
  reportData: ReportData,
  format: 'pdf' | 'csv' | 'excel' = 'pdf'
): Promise<{ data: Blob | null; error: Error | null }> => {
  try {
    // This would integrate with a PDF generation service
    // For now, return mock data
    const mockPDF = new Blob(['Mock PDF content'], { type: 'application/pdf' });
    return { data: mockPDF, error: null };
  } catch (err) {
    console.error('Error exporting report:', err);
    return { data: null, error: err as Error };
  }
};

export const scheduleReport = async (
  reportConfig: {
    reportType: string;
    schedule: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
    filters: ReportFilters;
  }
): Promise<{ data: any | null; error: Error | null }> => {
  try {
    // This would create a scheduled job
    // For now, return success
    return { 
      data: { 
        id: Date.now().toString(),
        message: 'Rapport schemalagd framgångsrikt' 
      }, 
      error: null 
    };
  } catch (err) {
    console.error('Error scheduling report:', err);
    return { data: null, error: err as Error };
  }
};

// Utility functions
export const getReportTitle = (reportType: string): string => {
  switch (reportType) {
    case 'sales': return 'Försäljningsrapport';
    case 'invoices': return 'Fakturarapport';
    case 'orders': return 'Orderrapport';
    case 'communication': return 'Kommunikationsrapport';
    default: return 'Rapport';
  }
};

export const getReportDescription = (reportType: string, filters: ReportFilters): string => {
  const dateRange = `${formatDate(filters.dateFrom)} - ${formatDate(filters.dateTo)}`;
  
  switch (reportType) {
    case 'sales':
      return `Försäljningsanalys för perioden ${dateRange}`;
    case 'invoices':
      return `Fakturaöversikt för perioden ${dateRange}`;
    case 'orders':
      return `Orderanalys för perioden ${dateRange}`;
    case 'communication':
      return `Kommunikationslogg för perioden ${dateRange}`;
    default:
      return `Rapport för perioden ${dateRange}`;
  }
};

export const generateAllReportData = async (organisationId: string, dateRange: { startDate: string, endDate: string }) => {
  const [invoicesRes, creditNotesRes, ordersRes] = await Promise.all([
    getInvoices(organisationId, { dateFrom: dateRange.startDate, dateTo: dateRange.endDate }),
    getCreditNotes(organisationId, { dateFrom: dateRange.startDate, dateTo: dateRange.endDate }),
    getOrders(organisationId, { dateFrom: dateRange.startDate, dateTo: dateRange.endDate })
  ]);

  const invoices = invoicesRes.data || [];
  const creditNotes = creditNotesRes.data || [];
  const orders = ordersRes.data || [];

  // --- Data Processing for each report ---

  const salesOverviewData = Object.entries(orders.reduce((acc, order) => {
      const month = new Date(order.created_at!).toLocaleDateString('sv-SE', { month: 'short', year: '2-digit' });
      if (!acc[month]) acc[month] = { månad: month, intäkter: 0, ordrar: 0 };
      acc[month].intäkter += order.value || 0;
      acc[month].ordrar += 1;
      return acc;
  }, {} as Record<string, { månad: string; intäkter: number; ordrar: number }>)).map(([,value]) => value);

  const salesByUserData = Object.entries(orders.reduce((acc, order) => {
      const userName = order.primary_salesperson?.full_name || 'Okänd';
      if (!acc[userName]) acc[userName] = { name: userName, intäkter: 0 };
      acc[userName].intäkter += order.value || 0;
      return acc;
  }, {} as Record<string, { name: string; intäkter: number }>)).map(([,value]) => value);

  const invoiceStatusData = Object.entries(invoices.reduce((acc, inv) => {
      const statusLabel = INVOICE_STATUS_LABELS[inv.status] || 'Okänd';
      if (!acc[statusLabel]) acc[statusLabel] = { status: statusLabel, antal: 0 };
      acc[statusLabel].antal += 1;
      return acc;
  }, {} as Record<string, { status: string; antal: number }>)).map(([,value]) => value);

  const paymentTrendsData = Object.entries(invoices.filter(inv => inv.status === 'paid' && inv.paid_at).reduce((acc, inv) => {
      const month = new Date(inv.paid_at!).toLocaleDateString('sv-SE', { month: 'short', year: '2-digit' });
      if (!acc[month]) acc[month] = { månad: month, betalningar: 0 };
      acc[month].betalningar += inv.amount;
      return acc;
  }, {} as Record<string, { månad: string; betalningar: number }>)).map(([,value]) => value);

  const creditedInvoicesData = Object.entries(creditNotes.reduce((acc, note) => {
      const month = new Date(note.created_at!).toLocaleDateString('sv-SE', { month: 'short', year: '2-digit' });
      if (!acc[month]) acc[month] = { månad: month, "Krediterat Belopp": 0 };
      acc[month]["Krediterat Belopp"] += note.amount;
      return acc;
  }, {} as Record<string, { månad: string; "Krediterat Belopp": number }>)).map(([,value]) => value);

  const orderPipelineData = Object.entries(orders.reduce((acc, order) => {
      const statusLabel = ORDER_STATUS_LABELS[order.status] || 'Okänd';
      if (!acc[statusLabel]) acc[statusLabel] = { status: statusLabel, antal: 0 };
      acc[statusLabel].antal += 1;
      return acc;
  }, {} as Record<string, { status: string; antal: number }>)).map(([,value]) => value);

  return {
    salesOverviewData,
    salesByUserData,
    invoiceStatusData,
    paymentTrendsData,
    creditedInvoicesData,
    orderPipelineData
  };
};