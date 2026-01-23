import { supabase } from './supabase';
import type { UserProfile, Order } from '../types/database';

// Payroll Adjustment types matching database schema
export interface PayrollAdjustmentDB {
  id: string;
  organisation_id: string;
  user_id: string;
  amount: number;
  description: string;
  date: string;
  type: 'bonus' | 'deduction' | 'expense' | 'other';
  created_at?: string;
  created_by?: string;
}

export interface PayrollEmployee extends UserProfile {
  base_hourly_rate?: number | null;
  base_monthly_salary?: number | null;
  commission_rate?: number | null;
  employment_type?: 'hourly' | 'salary' | null;
  has_commission?: boolean | null;
  personnummer?: string | null;
  bank_account_number?: string | null;
}

export interface TimeLogWithPayroll {
  id: string;
  order_id: string;
  user_id: string;
  start_time: string;
  end_time?: string | null;
  break_duration: number;
  notes?: string | null;
  is_approved: boolean;
  hourly_rate: number;
  total_amount: number;
  created_at?: string | null;
  order?: Order & { customer?: { name: string } };
  user?: PayrollEmployee;
}

export interface PayrollPeriod {
  year: number;
  month: number;
  startDate: string;
  endDate: string;
}

export interface EmployeePayrollSummary {
  employee: PayrollEmployee;
  period: PayrollPeriod;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  basePay: number;
  overtimePay: number;
  sickPay: number; // Swedish sick pay (sjuklön) - 80% from day 2-14
  vacationPay: number; // Semesterersättning
  commissionEarnings: number;
  totalGrossPay: number;
  estimatedTax: number;
  estimatedNetPay: number;
  timeLogs: TimeLogWithPayroll[];
  commissionOrders: Array<{
    order: Order;
    commissionAmount: number;
    isPrimary: boolean;
    splitPercentage?: number;
  }>;
  sickDays: number; // Total sick days
  karensDays: number; // Unpaid first sick day(s)
  status: 'pending' | 'approved' | 'paid';
}

export interface PayrollSummary {
  period: PayrollPeriod;
  totalEmployees: number;
  totalHours: number;
  totalGrossPay: number;
  totalCommissions: number;
  totalEstimatedTax: number;
  totalNetPay: number;
  employeeSummaries: EmployeePayrollSummary[];
  pendingApprovals: number;
}

export interface CommissionReport {
  salesperson: PayrollEmployee;
  period: PayrollPeriod;
  primaryOrders: Array<{
    order: Order;
    commissionAmount: number;
    commissionRate: number;
  }>;
  secondaryOrders: Array<{
    order: Order;
    commissionAmount: number;
    splitPercentage: number;
  }>;
  totalPrimaryCommission: number;
  totalSecondaryCommission: number;
  totalCommission: number;
  orderCount: number;
  averageOrderValue: number;
}

// Get payroll employees
export const getPayrollEmployees = async (
  organisationId: string
): Promise<{ data: PayrollEmployee[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('organisation_id', organisationId)
      .eq('is_active', true)
      .order('full_name');

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching payroll employees:', err);
    return { data: null, error: err as Error };
  }
};

// Get employee payroll summary for a specific period
export const getEmployeePayrollSummary = async (
  employeeId: string,
  period: PayrollPeriod
): Promise<{ data: EmployeePayrollSummary | null; error: Error | null }> => {
  try {
    // Get employee details
    const { data: employee, error: employeeError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', employeeId)
      .single();

    if (employeeError || !employee) {
      return { data: null, error: new Error('Employee not found') };
    }

    // Get time logs for the period (for workers on job sites)
    const { data: timeLogs, error: timeLogsError } = await supabase
      .from('time_logs')
      .select(`
        *,
        order:orders(
          id, title, value,
          customer:customers(name)
        )
      `)
      .eq('user_id', employeeId)
      .gte('start_time', period.startDate)
      .lte('start_time', period.endDate)
      .not('end_time', 'is', null)
      .order('start_time');

    if (timeLogsError) {
      return { data: null, error: new Error(timeLogsError.message) };
    }

    // Get attendance records for the period
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', employeeId)
      .gte('date', period.startDate)
      .lte('date', period.endDate);

    if (attendanceError) {
      console.error('Error fetching attendance:', attendanceError);
      // Continue without attendance data if there's an error
    }

    // Get commission orders for the period - only INVOICED orders count for commission
    // Commission is earned when order is invoiced, not when created
    const { data: commissionOrders, error: commissionError } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers(name)
      `)
      .or(`primary_salesperson_id.eq.${employeeId},secondary_salesperson_id.eq.${employeeId}`)
      .eq('status', 'fakturerad') // Only invoiced orders
      .gte('updated_at', period.startDate) // Use updated_at as invoice date proxy
      .lte('updated_at', period.endDate)

    if (commissionError) {
      return { data: null, error: new Error(commissionError.message) };
    }

    // Calculate hours from time logs (job-based tracking)
    const logs = timeLogs || [];
    const logMinutes = logs.reduce((sum: number, log: any) => {
      if (!log.end_time) return sum;
      const duration = new Date(log.end_time).getTime() - new Date(log.start_time).getTime();
      return sum + (duration / (1000 * 60)) - (log.break_duration || 0);
    }, 0);
    const logHours = logMinutes / 60;

    // Calculate attendance-based hours using employee's work schedule
    const attendance = attendanceRecords || [];
    const presentDays = attendance.filter((a: any) => a.status === 'present').length;

    // Use employee's configured work schedule, fallback to standard 40h/5days
    const weeklyHours = employee.weekly_hours || 40;
    const workDaysCount = employee.work_days?.length || 5;
    const hoursPerDay = workDaysCount > 0 ? weeklyHours / workDaysCount : 8;
    const attendanceHours = presentDays * hoursPerDay;

    // Use the higher of time logs or attendance hours
    // This handles cases where an employee might use one or both tracking methods
    const totalHours = Math.max(logHours, attendanceHours);
    const monthlyOrdinaryHours = weeklyHours * 4; // 4 weeks per month
    const regularHours = Math.min(totalHours, monthlyOrdinaryHours);
    const overtimeHours = Math.max(0, totalHours - regularHours);

    // Calculate pay based on employment type
    let basePay = 0;
    let overtimePay = 0;

    if (employee.employment_type === 'hourly') {
      const hourlyRate = employee.base_hourly_rate || 0;

      // For hourly employees, calculate from attendance OR time logs
      if (attendanceHours > 0) {
        // Attendance-based: days present × hours/day × rate
        basePay = attendanceHours * hourlyRate;
      } else if (logHours > 0) {
        // Time log-based: actual logged hours × rate
        basePay = regularHours * hourlyRate;
        overtimePay = overtimeHours * hourlyRate * 1.5; // 1.5x for overtime
      }
    } else if (employee.employment_type === 'salary') {
      // Fixed monthly salary regardless of hours
      basePay = employee.base_monthly_salary || 0;
      // Salary employees might get overtime compensation
      if (overtimeHours > 0) {
        overtimePay = overtimeHours * ((employee.base_monthly_salary || 0) / 160) * 1.5; // Assuming 160 hours/month
      }
    }

    // Calculate commission earnings
    const commissionOrdersWithDetails = (commissionOrders || []).map((order: any) => {
      const isPrimary = order.primary_salesperson_id === employeeId;
      let commissionAmount = 0;

      if (employee.has_commission && employee.commission_rate) {
        if (isPrimary) {
          // Primary salesperson gets full commission minus split
          const fullCommission = (order.value || 0) * (employee.commission_rate || 0) / 100;
          const splitAmount = fullCommission * (order.commission_split_percentage || 0) / 100;
          commissionAmount = fullCommission - splitAmount;
        } else {
          // Secondary salesperson gets split amount
          const fullCommission = (order.value || 0) * (employee.commission_rate || 0) / 100;
          commissionAmount = fullCommission * (order.commission_split_percentage || 0) / 100;
        }
      }

      return {
        order,
        commissionAmount,
        isPrimary,
        splitPercentage: isPrimary ? undefined : order.commission_split_percentage
      };
    });

    const commissionEarnings = commissionOrdersWithDetails.reduce(
      (sum: number, item: any) => sum + item.commissionAmount, 0
    );

    // Swedish Sick Pay Calculation (Sjuklön)
    // Day 1 = Karensdag (no pay), Days 2-14 = 80% of normal daily rate
    // After day 14, Försäkringskassan takes over
    const sickDays = attendance.filter((a: any) => a.status === 'sick').length;
    const vacationDays = attendance.filter((a: any) => a.status === 'vacation').length;

    // Calculate daily rate based on employment type
    let dailyRate = 0;
    if (employee.employment_type === 'hourly') {
      dailyRate = hoursPerDay * (employee.base_hourly_rate || 0);
    } else if (employee.employment_type === 'salary') {
      // Monthly salary divided by average work days per month (~21.75)
      dailyRate = (employee.base_monthly_salary || 0) / 21.75;
    }

    // Swedish sick pay rules:
    // - 1st sick day = Karensdag (unpaid) - only one per illness period
    // - Days 2-14 = 80% of normal daily rate (employer pays)
    // - Day 15+ = Försäkringskassan (not calculated here)
    // Note: We assume each sick day in a month could be a new illness period for simplicity
    // In practice, consecutive days would share one karensdag
    const karensDays = Math.min(sickDays, 1); // Simplified: 1 karensdag per month
    const paidSickDays = Math.max(0, Math.min(sickDays - karensDays, 13)); // Days 2-14
    const sickPay = paidSickDays * dailyRate * 0.8; // 80% of daily rate

    // Vacation pay (semesterersättning) - typically 12% of total earnings for hourly
    // or built into salary for monthly employees
    let vacationPay = 0;
    if (employee.employment_type === 'hourly' && vacationDays > 0) {
      // For hourly workers on vacation, they should receive vacation pay
      vacationPay = vacationDays * dailyRate; // Full pay during vacation
    }

    const totalGrossPay = basePay + overtimePay + sickPay + vacationPay + commissionEarnings;
    const taxResult = calculateSwedishTax(totalGrossPay);
    const estimatedTax = taxResult.totalTax;
    const estimatedNetPay = taxResult.netPay;

    return {
      data: {
        employee,
        period,
        regularHours: Math.round(regularHours * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
        totalHours: Math.round(totalHours * 100) / 100,
        basePay: Math.round(basePay),
        overtimePay: Math.round(overtimePay),
        sickPay: Math.round(sickPay),
        vacationPay: Math.round(vacationPay),
        commissionEarnings: Math.round(commissionEarnings),
        totalGrossPay: Math.round(totalGrossPay),
        estimatedTax: Math.round(estimatedTax),
        estimatedNetPay: Math.round(estimatedNetPay),
        timeLogs: logs,
        commissionOrders: commissionOrdersWithDetails,
        sickDays,
        karensDays,
        status: 'pending' // This would be determined by approval workflow
      },
      error: null
    };
  } catch (err) {
    console.error('Error calculating employee payroll:', err);
    return { data: null, error: err as Error };
  }
};

// Get payroll summary for organization using RPC (optimized)
export const getPayrollSummary = async (
  organisationId: string,
  period: PayrollPeriod
): Promise<{ data: PayrollSummary | null; error: Error | null }> => {
  try {
    // Try the optimized RPC first
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_payroll_summary', {
      org_id: organisationId,
      start_date: period.startDate,
      end_date: period.endDate
    });

    // If RPC succeeded, transform the data to match the expected format
    // Cast to typed interface for autocomplete and error checking
    if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
      console.info('Using optimized payroll RPC');

      // Type the RPC data for better autocomplete
      const typedRpcData = rpcData as import('../types/database').PayrollSummaryRPCRow[];

      const employeeSummaries: EmployeePayrollSummary[] = typedRpcData.map((emp) => {
        const totalGrossPay = emp.total_gross_pay || 0;
        const estimatedTax = emp.estimated_tax || 0;

        return {
          employee: {
            id: emp.employee_id,
            full_name: emp.full_name,
            email: emp.email,
            employment_type: emp.employment_type,
            base_hourly_rate: emp.base_hourly_rate,
            base_monthly_salary: emp.base_monthly_salary,
            has_commission: emp.has_commission,
            commission_rate: emp.commission_rate,
          } as PayrollEmployee,
          period,
          regularHours: emp.regular_hours || 0,
          overtimeHours: emp.overtime_hours || 0,
          totalHours: (emp.regular_hours || 0) + (emp.overtime_hours || 0),
          basePay: emp.base_pay || 0,
          overtimePay: emp.overtime_pay || 0,
          sickPay: emp.sick_pay || 0,
          vacationPay: 0, // Not calculated in RPC yet
          commissionEarnings: emp.commission_earnings || 0,
          totalGrossPay,
          estimatedTax,
          estimatedNetPay: totalGrossPay - estimatedTax,
          timeLogs: [], // Not included in RPC for performance
          commissionOrders: [], // Not included in RPC for performance
          sickDays: emp.sick_days || 0,
          karensDays: emp.sick_days > 0 ? 1 : 0,
          status: 'pending' as const
        };
      });

      const totalHours = employeeSummaries.reduce((sum, e) => sum + e.totalHours, 0);
      const totalGrossPay = employeeSummaries.reduce((sum, e) => sum + e.totalGrossPay, 0);
      const totalCommissions = employeeSummaries.reduce((sum, e) => sum + e.commissionEarnings, 0);
      const totalEstimatedTax = employeeSummaries.reduce((sum, e) => sum + e.estimatedTax, 0);
      const totalNetPay = employeeSummaries.reduce((sum, e) => sum + e.estimatedNetPay, 0);

      return {
        data: {
          period,
          totalEmployees: employeeSummaries.length,
          totalHours: Math.round(totalHours * 100) / 100,
          totalGrossPay,
          totalCommissions,
          totalEstimatedTax,
          totalNetPay,
          employeeSummaries,
          pendingApprovals: employeeSummaries.length // All start as pending
        },
        error: null
      };
    }

    // Fallback to legacy implementation if RPC fails or returns empty
    console.info('RPC not available, using fallback payroll calculation');
    return getPayrollSummaryLegacy(organisationId, period);
  } catch (err) {
    console.error('Error in payroll summary:', err);
    // Fallback to legacy on any error
    return getPayrollSummaryLegacy(organisationId, period);
  }
};

// Legacy implementation: loops through each employee (kept as fallback)
export const getPayrollSummaryLegacy = async (
  organisationId: string,
  period: PayrollPeriod
): Promise<{ data: PayrollSummary | null; error: Error | null }> => {
  try {
    // Get all employees
    const employeesResult = await getPayrollEmployees(organisationId);
    if (employeesResult.error) {
      return { data: null, error: employeesResult.error };
    }

    const employees = employeesResult.data || [];
    const employeeSummaries: EmployeePayrollSummary[] = [];
    let totalHours = 0;
    let totalGrossPay = 0;
    let totalCommissions = 0;
    let totalEstimatedTax = 0;
    let totalNetPay = 0;
    let pendingApprovals = 0;

    // Calculate summary for each employee
    for (const employee of employees) {
      const summaryResult = await getEmployeePayrollSummary(employee.id, period);

      // Always include the employee, even if they have no time logs
      const employeeSummary: EmployeePayrollSummary = summaryResult.data ?? {
        employee,
        period,
        regularHours: 0,
        overtimeHours: 0,
        totalHours: 0,
        basePay: employee.employment_type === 'salary' ? (employee.base_monthly_salary || 0) : 0,
        overtimePay: 0,
        sickPay: 0,
        vacationPay: 0,
        commissionEarnings: 0,
        totalGrossPay: employee.employment_type === 'salary' ? (employee.base_monthly_salary || 0) : 0,
        estimatedTax: 0,
        estimatedNetPay: employee.employment_type === 'salary' ? (employee.base_monthly_salary || 0) : 0,
        timeLogs: [],
        commissionOrders: [],
        sickDays: 0,
        karensDays: 0,
        status: 'pending'
      };

      employeeSummaries.push(employeeSummary);
      totalHours += employeeSummary.totalHours;
      totalGrossPay += employeeSummary.totalGrossPay;
      totalCommissions += employeeSummary.commissionEarnings;
      totalEstimatedTax += employeeSummary.estimatedTax;
      totalNetPay += employeeSummary.estimatedNetPay;

      if (employeeSummary.status === 'pending') {
        pendingApprovals++;
      }
    }

    return {
      data: {
        period,
        totalEmployees: employees.length,
        totalHours: Math.round(totalHours * 100) / 100,
        totalGrossPay,
        totalCommissions,
        totalEstimatedTax,
        totalNetPay,
        employeeSummaries,
        pendingApprovals
      },
      error: null
    };
  } catch (err) {
    console.error('Error calculating payroll summary:', err);
    return { data: null, error: err as Error };
  }
};


// Get commission report for salesperson
export const getCommissionReport = async (
  salespersonId: string,
  period: PayrollPeriod
): Promise<{ data: CommissionReport | null; error: Error | null }> => {
  try {
    // Get salesperson details
    const { data: salesperson, error: salespersonError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', salespersonId)
      .single();

    if (salespersonError || !salesperson) {
      return { data: null, error: new Error('Salesperson not found') };
    }

    // Get orders where this person is primary salesperson
    const { data: primaryOrders, error: primaryError } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers(name)
      `)
      .eq('primary_salesperson_id', salespersonId)
      .gte('created_at', period.startDate)
      .lte('created_at', period.endDate);

    if (primaryError) {
      return { data: null, error: new Error(primaryError.message) };
    }

    // Get orders where this person is secondary salesperson
    const { data: secondaryOrders, error: secondaryError } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers(name)
      `)
      .eq('secondary_salesperson_id', salespersonId)
      .gte('created_at', period.startDate)
      .lte('created_at', period.endDate);

    if (secondaryError) {
      return { data: null, error: new Error(secondaryError.message) };
    }

    // Calculate commission details
    const primaryOrdersWithCommission = (primaryOrders || []).map(order => {
      const fullCommission = (order.value || 0) * (salesperson.commission_rate || 0) / 100;
      const splitAmount = fullCommission * (order.commission_split_percentage || 0) / 100;
      const commissionAmount = fullCommission - splitAmount;

      return {
        order,
        commissionAmount,
        commissionRate: salesperson.commission_rate || 0
      };
    });

    const secondaryOrdersWithCommission = (secondaryOrders || []).map(order => {
      const fullCommission = (order.value || 0) * (salesperson.commission_rate || 0) / 100;
      const commissionAmount = fullCommission * (order.commission_split_percentage || 0) / 100;

      return {
        order,
        commissionAmount,
        splitPercentage: order.commission_split_percentage || 0
      };
    });

    const totalPrimaryCommission = primaryOrdersWithCommission.reduce(
      (sum, item) => sum + item.commissionAmount, 0
    );
    const totalSecondaryCommission = secondaryOrdersWithCommission.reduce(
      (sum, item) => sum + item.commissionAmount, 0
    );
    const totalCommission = totalPrimaryCommission + totalSecondaryCommission;

    const allOrders = [...(primaryOrders || []), ...(secondaryOrders || [])];
    const orderCount = allOrders.length;
    const averageOrderValue = orderCount > 0
      ? allOrders.reduce((sum, order) => sum + (order.value || 0), 0) / orderCount
      : 0;

    return {
      data: {
        salesperson,
        period,
        primaryOrders: primaryOrdersWithCommission,
        secondaryOrders: secondaryOrdersWithCommission,
        totalPrimaryCommission,
        totalSecondaryCommission,
        totalCommission,
        orderCount,
        averageOrderValue
      },
      error: null
    };
  } catch (err) {
    console.error('Error calculating commission report:', err);
    return { data: null, error: err as Error };
  }
};

// Approve timesheet for employee
export const approveEmployeeTimesheet = async (
  employeeId: string,
  period: PayrollPeriod,
  approvedBy: string,
  comments?: string
): Promise<{ error: Error | null }> => {
  try {
    // Update all time logs for the period to approved
    const { error } = await supabase
      .from('time_logs')
      .update({
        is_approved: true,
        notes: comments ? `${comments} | Godkänd av admin: ${new Date().toISOString()}` : `Godkänd av admin: ${new Date().toISOString()}`
      })
      .eq('user_id', employeeId)
      .gte('start_time', period.startDate)
      .lte('start_time', period.endDate);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    console.error('Error approving timesheet:', err);
    return { error: err as Error };
  }
};

// Update employee payroll information
export const updateEmployeePayroll = async (
  employeeId: string,
  updates: Partial<PayrollEmployee>
): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', employeeId);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    console.error('Error updating employee payroll:', err);
    return { error: err as Error };
  }
};

// Mark commission as paid
export const markCommissionPaid = async (
  orderIds: string[]
): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('orders')
      .update({ commission_paid: true })
      .in('id', orderIds);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    console.error('Error marking commission as paid:', err);
    return { error: err as Error };
  }
};

// Generate payroll period
export const generatePayrollPeriod = (year: number, month: number): PayrollPeriod => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  return {
    year,
    month,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
};

// Get current payroll period
export const getCurrentPayrollPeriod = (): PayrollPeriod => {
  const now = new Date();
  return generatePayrollPeriod(now.getFullYear(), now.getMonth() + 1);
};

// Validate Swedish personnummer
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

// Format Swedish personnummer
export const formatSwedishPersonnummer = (personnummer: string): string => {
  const cleaned = personnummer.replace(/[^0-9]/g, '');

  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 12) {
    return `${cleaned.slice(0, 8)}-${cleaned.slice(8)}`;
  }

  return personnummer;
};

// Calculate Swedish tax (simplified)
export const calculateSwedishTax = (grossPay: number): {
  municipalTax: number;
  stateTax: number;
  socialFees: number;
  totalTax: number;
  netPay: number;
} => {
  // Simplified Swedish tax calculation
  const municipalTaxRate = 0.32; // Average municipal tax rate
  const stateTaxThreshold = 540700; // 2024 threshold for state tax
  const stateTaxRate = 0.20;
  const socialFeesRate = 0.3142; // Employer's social fees

  const municipalTax = grossPay * municipalTaxRate;
  const stateTax = grossPay > stateTaxThreshold ? (grossPay - stateTaxThreshold) * stateTaxRate : 0;
  const socialFees = grossPay * socialFeesRate; // Employer cost, not deducted from employee

  const totalTax = municipalTax + stateTax;
  const netPay = grossPay - totalTax;

  return {
    municipalTax,
    stateTax,
    socialFees,
    totalTax,
    netPay
  };
};

// Export payroll data for accounting
export const exportPayrollData = (
  payrollSummary: PayrollSummary,
  format: 'csv' | 'json' = 'csv'
): string => {
  if (format === 'json') {
    return JSON.stringify(payrollSummary, null, 2);
  }

  // CSV format
  const headers = [
    'Namn',
    'Personnummer',
    'Anställningstyp',
    'Ordinarie timmar',
    'Övertidstimmar',
    'Grundlön',
    'Övertidsersättning',
    'Provision',
    'Bruttolön',
    'Beräknad skatt',
    'Nettolön',
    'Kontonummer'
  ];

  const rows = payrollSummary.employeeSummaries.map(summary => [
    summary.employee.full_name,
    summary.employee.personnummer || '',
    summary.employee.employment_type === 'hourly' ? 'Timanställd' : 'Månadslön',
    summary.regularHours.toString(),
    summary.overtimeHours.toString(),
    summary.basePay.toString(),
    summary.overtimePay.toString(),
    summary.commissionEarnings.toString(),
    summary.totalGrossPay.toString(),
    summary.estimatedTax.toString(),
    summary.estimatedNetPay.toString(),
    summary.employee.bank_account_number || ''
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
};

// Utility functions
export const formatPayrollPeriod = (period: PayrollPeriod): string => {
  const monthNames = [
    'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
    'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'
  ];

  return `${monthNames[period.month - 1]} ${period.year}`;
};

export const getPayrollPeriodOptions = (): PayrollPeriod[] => {
  const periods: PayrollPeriod[] = [];
  const now = new Date();

  // Generate last 12 months
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push(generatePayrollPeriod(date.getFullYear(), date.getMonth() + 1));
  }

  return periods;
};

// =====================================================
// PAYROLL ADJUSTMENTS - Database Operations
// =====================================================

// Get payroll adjustments for a user in a period
export const getPayrollAdjustments = async (
  organisationId: string,
  userId: string,
  period: PayrollPeriod
): Promise<{ data: PayrollAdjustmentDB[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('payroll_adjustments')
      .select('*')
      .eq('organisation_id', organisationId)
      .eq('user_id', userId)
      .gte('date', period.startDate)
      .lte('date', period.endDate)
      .order('date', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching payroll adjustments:', err);
    return { data: null, error: err as Error };
  }
};

// Get all payroll adjustments for an organisation in a period
export const getOrganisationPayrollAdjustments = async (
  organisationId: string,
  period: PayrollPeriod
): Promise<{ data: PayrollAdjustmentDB[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('payroll_adjustments')
      .select(`
        *,
        user:user_profiles(id, full_name)
      `)
      .eq('organisation_id', organisationId)
      .gte('date', period.startDate)
      .lte('date', period.endDate)
      .order('date', { ascending: false });

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching organisation payroll adjustments:', err);
    return { data: null, error: err as Error };
  }
};

// Create a payroll adjustment
export const createPayrollAdjustment = async (
  adjustment: Omit<PayrollAdjustmentDB, 'id' | 'created_at'>
): Promise<{ data: PayrollAdjustmentDB | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('payroll_adjustments')
      .insert([adjustment])
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error creating payroll adjustment:', err);
    return { data: null, error: err as Error };
  }
};

// Create multiple payroll adjustments
export const createPayrollAdjustments = async (
  adjustments: Omit<PayrollAdjustmentDB, 'id' | 'created_at'>[]
): Promise<{ data: PayrollAdjustmentDB[] | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('payroll_adjustments')
      .insert(adjustments)
      .select();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error creating payroll adjustments:', err);
    return { data: null, error: err as Error };
  }
};

// Delete a payroll adjustment
export const deletePayrollAdjustment = async (
  adjustmentId: string
): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('payroll_adjustments')
      .delete()
      .eq('id', adjustmentId);

    if (error) {
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    console.error('Error deleting payroll adjustment:', err);
    return { error: err as Error };
  }
};