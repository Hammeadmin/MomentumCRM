import { supabase } from './supabase';

/**
 * RUT-avdrag (Swedish tax deduction for domestic services)
 * 
 * Key differences from ROT:
 * - RUT: 50% of labor cost, max 75,000 SEK per person/year
 * - Applies ONLY to individuals (Personnummer required)
 * - Does NOT use Organisationsnummer or Fastighetsbeteckning
 */

export interface RUTData {
  include_rut: boolean;
  rut_personnummer?: string | null;
  rut_amount?: number | null;
}

export interface RUTFormData {
  identifier: string; // Personnummer
}

// RUT validation functions (re-using Swedish personnummer validation logic)
export const validateSwedishPersonnummer = (personnummer: string): boolean => {
  if (!personnummer) return false;

  // Remove any non-digit characters except hyphen
  const cleaned = personnummer.replace(/[^0-9-]/g, '');

  // Check format: YYYYMMDD-XXXX or YYMMDD-XXXX
  const formats = [
    /^[0-9]{8}-[0-9]{4}$/, // YYYYMMDD-XXXX
    /^[0-9]{6}-[0-9]{4}$/  // YYMMDD-XXXX
  ];

  if (!formats.some(format => format.test(cleaned))) {
    return false;
  }

  // Basic length validation
  const digitsOnly = cleaned.replace('-', '');
  return digitsOnly.length === 10 || digitsOnly.length === 12;
};

export const formatSwedishPersonnummer = (personnummer: string): string => {
  const cleaned = personnummer.replace(/[^0-9]/g, '');

  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 12) {
    return `${cleaned.slice(0, 8)}-${cleaned.slice(8)}`;
  }

  return personnummer;
};

// RUT calculation functions
export const calculateRUTAmount = (
  totalAmount: number,
  laborPercentage: number = 1.0, // Assuming the amount passed IS the labor cost
  rutPercentage: number = 0.5,   // 50% RUT deduction
  maxRUTPerPerson: number = 75000
): number => {
  const laborCost = totalAmount * laborPercentage;
  const rutDeduction = laborCost * rutPercentage;

  return Math.min(rutDeduction, maxRUTPerPerson);
};

export const calculateNetAmountAfterRUT = (totalAmount: number, rutAmount: number): number => {
  return totalAmount - rutAmount;
};

// Utility functions
export const getRUTExplanationText = (): string => {
  return `RUT-avdrag är ett skatteavdrag för hushållsnära tjänster som städning, trädgårdsarbete och andra hemtjänster. 
Som privatperson kan du få avdrag för 50% av arbetskostnaden, upp till maximalt 75 000 kr per person och år. 
För att få RUT-avdrag krävs att tjänsten utförs i din bostad i Sverige.`;
};

export const getRUTEmailText = (): string => {
  return `Denna offert är berättigad till RUT-avdrag. Som privatperson kan du få skatteavdrag för 50% av arbetskostnaden, 
upp till 75 000 kr per person och år. När du godkänner offerten kommer du att kunna ange dina RUT-uppgifter.`;
};

export const isRUTEligible = (serviceType: string): boolean => {
  // RUT-eligible services (simplified list)
  const rutEligibleServices = [
    'städning',
    'hemstädning',
    'fönsterputsning',
    'trädgård',
    'trädgårdsarbete',
    'barnpassning',
    'flytt',
    'tvätt',
    'strykning',
    'matlagning',
    'hushåll'
  ];

  return rutEligibleServices.some(service =>
    serviceType.toLowerCase().includes(service)
  );
};

export const formatRUTAmount = (amount: number): string => {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// RUT reporting functions
export const getRUTReport = async (
  organisationId: string,
  taxYear?: number
): Promise<{
  data: any[] | null;
  error: Error | null;
}> => {
  try {
    let query = supabase
      .from('rut_report')
      .select('*')
      .eq('organisation_id', organisationId);

    if (taxYear) {
      query = query.eq('tax_year', taxYear);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching RUT report:', err);
    return { data: null, error: err as Error };
  }
};

export const getRUTSummary = async (
  organisationId: string,
  taxYear?: number
): Promise<{
  data: {
    totalRUTAmount: number;
    totalInvoices: number;
    averageRUTPerInvoice: number;
  } | null;
  error: Error | null;
}> => {
  try {
    let query = supabase
      .from('rut_report')
      .select('*')
      .eq('organisation_id', organisationId);

    if (taxYear) {
      query = query.eq('tax_year', taxYear);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const reports = data || [];
    const totalRUTAmount = reports.reduce((sum: number, report: any) => sum + (report.rut_amount || 0), 0);
    const totalInvoices = reports.length;
    const averageRUTPerInvoice = totalInvoices > 0 ? totalRUTAmount / totalInvoices : 0;

    return {
      data: {
        totalRUTAmount,
        totalInvoices,
        averageRUTPerInvoice
      },
      error: null
    };
  } catch (err) {
    console.error('Error fetching RUT summary:', err);
    return { data: null, error: err as Error };
  }
};

