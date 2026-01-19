import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Clock,
  Users,
  X,
  CheckCircle,
  AlertCircle,
  Download,
  Filter,
  RefreshCw,
  Calendar,
  TrendingUp,
  FileText,
  Calculator,
  Eye,
  UserCheck,
  Banknote,
  PieChart,
  Sliders,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Plus,
  Trash2,
  Settings
} from 'lucide-react';
import { Button } from './ui';
import {
  getPayrollSummary,
  getPayrollEmployees,
  getCurrentPayrollPeriod,
  getPayrollPeriodOptions,
  formatPayrollPeriod,
  exportPayrollData,
  createPayrollAdjustments,
  type PayrollSummary,
  type PayrollPeriod,
  type EmployeePayrollSummary
} from '../lib/payroll';
import { formatCurrency, formatDate } from '../lib/database';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfiles, getTeamMembers } from '../lib/database';
import EmptyState from './EmptyState';
import ExportButton from './ExportButton';
import EmployeePayrollModal from './EmployeePayrollModal';
import PayrollReportsModal from './PayrollReportsModal';
import PayrollAdjustmentModal, { type PayrollAdjustment } from './PayrollAdjustmentModal';
import { useToast } from '../hooks/useToast';
import { getOrders, updateOrder, type OrderWithRelations } from '../lib/orders';
import CommissionAssignmentForm from './CommissionAssignmentForm';
import { getAttendance, updateAttendance } from '../lib/teams';
import { AttendanceRecord, AttendanceStatus, USER_ROLE_LABELS, UserProfile } from '../types/database';
import BulkAttendanceModal from './BulkAttendanceModal';
import EmployeePayrollSettingsModal from './EmployeePayrollSettingsModal';


function PayrollDashboard() {
  const { user, organisationId } = useAuth();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummary | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod>(getCurrentPayrollPeriod());
  const [availablePeriods] = useState<PayrollPeriod[]>(getPayrollPeriodOptions());
  const [showEmployeeModal, setShowEmployeeModal] = useState<EmployeePayrollSummary | null>(null);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved'>('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [commissionOrders, setCommissionOrders] = useState<OrderWithRelations[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]); // ADD THIS LINE
  const [orderToAssign, setOrderToAssign] = useState<OrderWithRelations | null>(null);
  const [commissionStatusFilter, setCommissionStatusFilter] = useState<'unpaid' | 'all'>('unpaid');
  const [selectedEmployeeReport, setSelectedEmployeeReport] = useState<EmployeePayrollSummary | null>(null);
  const [adjustmentEmployee, setAdjustmentEmployee] = useState<EmployeePayrollSummary | null>(null);
  const [payrollSettingsEmployee, setPayrollSettingsEmployee] = useState<UserProfile | null>(null);

  // Attendance State - Monthly view
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceRecord>>({});
  const [attendanceMonth, setAttendanceMonth] = useState(() => {
    // Default to the selected payroll period
    return { year: selectedPeriod.year, month: selectedPeriod.month };
  });
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [showBulkAttendanceModal, setShowBulkAttendanceModal] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    userId: string;
    date: Date;
  } | null>(null);

  // Helper Functions
  const getMonthName = (month: number) => {
    const monthNames = ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni', 'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'];
    return monthNames[month - 1];
  };

  const toISODate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const changeMonth = (offset: number) => {
    let newMonth = attendanceMonth.month + offset;
    let newYear = attendanceMonth.year;

    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }

    setAttendanceMonth({ year: newYear, month: newMonth });
  };

  const getMonthDays = () => {
    const { year, month } = attendanceMonth;
    const daysInMonth = new Date(year, month, 0).getDate();
    const days: Date[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month - 1, day));
    }

    return days;
  };

  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const loadAttendance = async () => {
    if (!userProfile?.organisation_id) return;
    try {
      setLoadingAttendance(true);

      // Get first and last day of the selected month
      const { year, month } = attendanceMonth;
      const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const daysInMonth = new Date(year, month, 0).getDate();
      const endStr = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

      const { data, error } = await getAttendance(userProfile.organisation_id, startStr, endStr);

      if (error) {
        showError('Kunde inte ladda närvaro', error.message);
        return;
      }

      const map: Record<string, AttendanceRecord> = {};
      (data || []).forEach(record => {
        map[`${record.user_id}_${record.date}`] = record;
      });
      setAttendanceData(map);
    } catch (err) {
      console.error('Error loading attendance:', err);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleAttendanceUpdate = async (userId: string, date: Date, status: AttendanceStatus | null, shouldReload = true) => {
    const dateStr = toISODate(date);
    const key = `${userId}_${dateStr}`;

    const record: AttendanceRecord = {
      id: key,
      organisation_id: userProfile.organisation_id,
      user_id: userId,
      date: dateStr,
      status: status as AttendanceStatus
    };

    // Optimistic Update
    setAttendanceData(prev => {
      const next = { ...prev };
      if (status === null) {
        delete next[key];
      } else {
        next[key] = record;
      }
      return next;
    });

    try {
      const { error } = await updateAttendance(record);
      if (error) throw error;
      // if (shouldReload) loadAttendance(); // Optimistic is enough mostly
    } catch (err: any) {
      console.error("Failed to update attendance", err);
      showError('Kunde inte spara', 'Ändringen sparades inte i databasen.');
      loadAttendance(); // Revert
    }
  };

  const handleBulkAttendanceSave = async (userIds: string[], dates: Date[], status: AttendanceStatus | null) => {
    const promises: Promise<any>[] = [];

    userIds.forEach(userId => {
      dates.forEach(date => {
        promises.push(handleAttendanceUpdate(userId, date, status, false));
      });
    });

    await Promise.all(promises);
    success('Klar', 'Massuppdatering genomförd.');
    loadAttendance();
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, selectedPeriod]);

  useEffect(() => {
    if (activeTab === 'attendance' && userProfile?.organisation_id) {
      loadAttendance();
    }
  }, [activeTab, attendanceMonth, userProfile]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!user) return;

      const { data: profiles } = await getUserProfiles('', { userId: user.id });
      const profile = profiles?.[0];

      if (!profile?.organisation_id) {
        setError('Ingen organisation hittades för användaren');
        setLoading(false);
        return;
      }
      if (profile.role !== 'admin') {
        setError('Du har inte behörighet att visa lönehantering');
        setLoading(false);
        return;
      }
      setUserProfile(profile);

      // Fetch payroll, commission orders, and team members in parallel
      const [summaryResult, ordersResult, membersResult] = await Promise.all([
        getPayrollSummary(profile.organisation_id, selectedPeriod),
        getOrders(profile.organisation_id, { commissionable: true }),
        getTeamMembers(profile.organisation_id)
      ]);

      // Handle payroll summary result
      if (summaryResult.error) {
        setError(summaryResult.error.message);
      } else {
        setPayrollSummary(summaryResult.data);
      }

      // Handle commission orders result
      if (ordersResult.error) {
        console.error("Could not load commission orders:", ordersResult.error.message);
        showError('Fel', 'Kunde inte ladda provisionsordrar.');
      } else {
        setCommissionOrders(ordersResult.data || []);
      }

      // Handle team members result
      if (membersResult.error) {
        console.error("Could not load team members:", membersResult.error.message);
      } else {
        setTeamMembers(membersResult.data || []);
      }

    } catch (err) {
      console.error('Error loading payroll data:', err);
      setError('Ett oväntat fel inträffade vid laddning av lönedata.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCommission = async (commissionData: {
    primary_salesperson_id?: string;
    secondary_salesperson_id?: string;
    commission_split_percentage: number;
  }) => {
    if (!orderToAssign) return;

    const { error } = await updateOrder(orderToAssign.id, {
      ...commissionData,
      // Ensure null is sent for empty strings
      primary_salesperson_id: commissionData.primary_salesperson_id || null,
      secondary_salesperson_id: commissionData.secondary_salesperson_id || null,
    });

    if (error) {
      showError('Fel', `Kunde inte spara provision: ${error.message}`);
    } else {
      success('Framgång', 'Provisionen har uppdaterats.');
      setOrderToAssign(null); // Close the modal
      await loadData(); // Refresh all data
    }
  };

  const handleMarkCommissionPaid = async (orderId: string) => {
    const { error } = await updateOrder(orderId, { commission_paid: true });
    if (error) {
      showError('Fel', 'Kunde inte uppdatera provisionsstatus.');
    } else {
      success('Framgång', 'Provision markerad som betald.');
      await loadData(); // Refresh the list
    }
  };

  const handleApproveTimesheet = async (employeeId: string) => {
    try {
      // This would call the approval function
      success('Tidrapport godkänd!');
      await loadData(); // Reload to update status
    } catch (err) {
      showError('Kunde inte godkänna tidrapport');
    }
  };

  const handleBulkApproval = async () => {
    if (!payrollSummary) return;

    try {
      const pendingEmployees = payrollSummary.employeeSummaries.filter(
        emp => emp.status === 'pending'
      );

      if (pendingEmployees.length === 0) {
        showError('Inga väntande tidrapporter att godkänna');
        return;
      }

      // Simulate bulk approval
      success(`${pendingEmployees.length} tidrapporter godkända!`);
      await loadData();
    } catch (err) {
      showError('Kunde inte godkänna tidrapporter');
    }
  };

  const handleSaveAdjustments = async (adjustments: PayrollAdjustment[]) => {
    if (!adjustmentEmployee || !organisationId) return;

    try {
      // Convert PayrollAdjustment (from modal) to PayrollAdjustmentDB format
      const dbAdjustments = adjustments.map(adj => ({
        organisation_id: organisationId,
        user_id: adjustmentEmployee.employee.id,
        amount: adj.type === 'deduction' ? -Math.abs(adj.amount) : Math.abs(adj.amount),
        description: adj.description,
        date: adj.date || new Date().toISOString().split('T')[0],
        type: adj.type === 'overtime_adjustment' || adj.type === 'correction' ? 'other' as const : adj.type,
        created_by: user?.id
      }));

      const { error } = await createPayrollAdjustments(dbAdjustments);

      if (error) throw error;

      success('Justeringar sparade', `${adjustments.length} justering(ar) sparade för ${adjustmentEmployee.employee.full_name}`);
      setAdjustmentEmployee(null);
      await loadData();
    } catch (err: any) {
      showError('Kunde inte spara', err.message);
    }
  };

  const filteredEmployees = payrollSummary?.employeeSummaries.filter(emp => {
    if (filterStatus === 'all') return true;
    return emp.status === filterStatus;
  }) || [];

  const exportData = payrollSummary ? [{
    period: formatPayrollPeriod(payrollSummary.period),
    totalEmployees: payrollSummary.totalEmployees,
    totalHours: payrollSummary.totalHours,
    totalGrossPay: payrollSummary.totalGrossPay,
    totalCommissions: payrollSummary.totalCommissions,
    totalNetPay: payrollSummary.totalNetPay,
    ...payrollSummary.employeeSummaries.reduce((acc, emp, index) => {
      acc[`employee_${index + 1}_name`] = emp.employee.full_name;
      acc[`employee_${index + 1}_hours`] = emp.totalHours;
      acc[`employee_${index + 1}_gross`] = emp.totalGrossPay;
      acc[`employee_${index + 1}_net`] = emp.estimatedNetPay;
      return acc;
    }, {} as Record<string, any>)
  }] : [];

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mr-4 shadow-lg shadow-green-500/20">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Lönehantering</h1>
              <p className="text-sm text-gray-500">Laddar...</p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-8">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-green-600 animate-spin mb-3" />
            <p className="text-sm text-gray-500">Laddar lönedata...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mr-4 shadow-lg shadow-green-500/20">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lönehantering</h1>
            <p className="text-sm text-gray-500">
              {payrollSummary?.totalEmployees || 0} anställda • {formatPayrollPeriod(selectedPeriod)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={`${selectedPeriod.year}-${selectedPeriod.month}`}
            onChange={(e) => {
              const newPeriod = availablePeriods.find(p => `${p.year}-${p.month}` === e.target.value);
              if (newPeriod) {
                setSelectedPeriod(newPeriod);
              }
            }}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
          >
            {availablePeriods.map(period => (
              <option key={`${period.year}-${period.month}`} value={`${period.year}-${period.month}`}>
                {formatPayrollPeriod(period)}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="md"
            onClick={loadData}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Uppdatera
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={() => setShowReportsModal(true)}
            icon={<PieChart className="w-4 h-4" />}
          >
            Rapporter
          </Button>
          <ExportButton
            data={exportData}
            filename={`lonehantering-${formatPayrollPeriod(selectedPeriod).toLowerCase().replace(' ', '-')}`}
            title="Exportera"
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* ADD THE TAB NAVIGATION CODE HERE */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button onClick={() => setActiveTab('overview')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            Översikt & Tidrapporter
          </button>
          <button onClick={() => setActiveTab('attendance')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'attendance' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            Närvaro
          </button>
          <button onClick={() => setActiveTab('commissions')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'commissions' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            Provisioner
          </button>
        </nav>
      </div>

      {/* Summary Cards */}
      {payrollSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card-padded">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Anställda</p>
                <p className="text-2xl font-bold text-gray-900">{payrollSummary.totalEmployees}</p>
              </div>
            </div>
          </div>

          <div className="card-padded">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Totala timmar</p>
                <p className="text-2xl font-bold text-gray-900">{payrollSummary.totalHours}h</p>
              </div>
            </div>
          </div>

          <div className="card-padded">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Banknote className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total bruttolön</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(payrollSummary.totalGrossPay)}</p>
              </div>
            </div>
          </div>

          <div className="card-padded">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Väntande godkännanden</p>
                <p className="text-2xl font-bold text-gray-900">{payrollSummary.pendingApprovals}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {payrollSummary && payrollSummary.pendingApprovals > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                  <div>
                    <h3 className="font-medium text-yellow-900">
                      {payrollSummary.pendingApprovals} tidrapporter väntar på godkännande
                    </h3>
                    <p className="text-sm text-yellow-700">
                      Granska och godkänn tidrapporter för att slutföra löneberäkningen
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleBulkApproval}
                  className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors"
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  Godkänn alla
                </button>
              </div>
            </div>
          )}


          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Alla anställda</option>
                  <option value="pending">Väntande godkännande</option>
                  <option value="approved">Godkända</option>
                </select>
              </div>
              <div className="text-sm text-gray-500">
                {filteredEmployees.length} av {payrollSummary?.totalEmployees || 0} anställda
              </div>
            </div>
          </div>

          {/* Employee Payroll List */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Anställdas löneunderlag</h3>
            </div>

            {filteredEmployees.length === 0 ? (
              <EmptyState
                type="general"
                title="Inga anställda hittades"
                description={
                  filterStatus !== 'all'
                    ? "Inga anställda matchar det valda filtret."
                    : "Inga anställda registrerade för denna period."
                }
                actionText={filterStatus !== 'all' ? "Rensa filter" : undefined}
                onAction={filterStatus !== 'all' ? () => setFilterStatus('all') : undefined}
              />
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Anställd</th>
                      <th>Anställningstyp</th>
                      <th>Timmar</th>
                      <th>Grundlön</th>
                      <th>Provision</th>
                      <th>Bruttolön</th>
                      <th>Status</th>
                      <th className="text-right">Åtgärder</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((employeeSummary) => (
                      <tr key={employeeSummary.employee.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-medium text-sm">
                                {employeeSummary.employee.full_name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                            <div className="ml-4">
                              <p className="text-sm font-medium text-gray-900">
                                {employeeSummary.employee.full_name}
                              </p>
                              <p className="text-sm text-gray-600">
                                {employeeSummary.employee.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${employeeSummary.employee.employment_type === 'hourly'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                            }`}>
                            {employeeSummary.employee.employment_type === 'hourly' ? 'Timanställd' : 'Månadslön'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            <div className="font-medium">{employeeSummary.totalHours}h</div>
                            {employeeSummary.overtimeHours > 0 && (
                              <div className="text-xs text-orange-600">
                                +{employeeSummary.overtimeHours}h övertid
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{formatCurrency(employeeSummary.basePay)}</div>
                            {employeeSummary.overtimePay > 0 && (
                              <div className="text-xs text-green-600">
                                +{formatCurrency(employeeSummary.overtimePay)} övertid
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          {employeeSummary.commissionEarnings > 0
                            ? formatCurrency(employeeSummary.commissionEarnings)
                            : '-'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                          {formatCurrency(employeeSummary.totalGrossPay)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${employeeSummary.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : employeeSummary.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                            }`}>
                            {employeeSummary.status === 'approved' ? 'Godkänd' :
                              employeeSummary.status === 'pending' ? 'Väntande' : 'Ej behandlad'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => setShowEmployeeModal(employeeSummary)}
                              className="text-gray-400 hover:text-blue-600"
                              title="Visa detaljer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {employeeSummary.status === 'pending' && (
                              <button
                                onClick={() => handleApproveTimesheet(employeeSummary.employee.id)}
                                className="text-gray-400 hover:text-green-600"
                                title="Godkänn tidrapport"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => setShowEmployeeModal(employeeSummary)}
                              className="text-gray-400 hover:text-purple-600"
                              title="Visa & skriv ut löneunderlag"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setAdjustmentEmployee(employeeSummary)}
                              className="text-gray-400 hover:text-orange-600"
                              title="Lönejustering"
                            >
                              <Sliders className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'commissions' && (
        <div className="bg-white rounded-lg shadow-sm border mt-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <TrendingUp className="w-5 h-5 mr-3 text-green-600" />
              Provisionshantering för {formatPayrollPeriod(selectedPeriod)}
            </h3>
            {/* This is the new filter toggle */}
            <div className="mt-2 flex items-center bg-gray-100 rounded-lg p-1 space-x-1 w-min">
              <button
                onClick={() => setCommissionStatusFilter('unpaid')}
                className={`px-3 py-1 text-sm font-medium rounded-md ${commissionStatusFilter === 'unpaid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
              >
                Obetalda
              </button>
              <button
                onClick={() => setCommissionStatusFilter('all')}
                className={`px-3 py-1 text-sm font-medium rounded-md ${commissionStatusFilter === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
              >
                Historik
              </button>
            </div>
          </div>

          {payrollSummary && payrollSummary.employeeSummaries.filter(e => e.commissionOrders.length > 0).length === 0 ? (
            <EmptyState type="general" title="Inga provisioner" description="Inga provisioner har tjänats in under denna period." />
          ) : (
            <div className="divide-y divide-gray-200">
              {payrollSummary?.employeeSummaries
                .filter(emp => {
                  if (commissionStatusFilter === 'unpaid') {
                    return emp.commissionOrders.some(co => !co.order.commission_paid);
                  }
                  return emp.commissionOrders.length > 0;
                })
                .map(summary => (
                  <div key={summary.employee.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => setSelectedEmployeeReport(summary)}
                        className="text-left"
                      >
                        <h4 className="font-semibold text-blue-600 hover:underline">{summary.employee.full_name}</h4>
                        <p className="text-sm text-gray-500">
                          Total Provision: <span className="font-bold text-green-600">{formatCurrency(summary.commissionEarnings)}</span>
                        </p>
                      </button>
                      <Eye className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Närvarohantering</h3>
                <p className="text-sm text-gray-500">Hantera frånvaro och semester för anställda</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-200 rounded-md">
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <span className="px-3 text-sm font-medium text-gray-900 min-w-[140px] text-center">
                    {getMonthName(attendanceMonth.month)} {attendanceMonth.year}
                  </span>
                  <button onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-200 rounded-md">
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
                <Button
                  variant="primary"
                  onClick={() => setShowBulkAttendanceModal(true)}
                  icon={<Users className="w-4 h-4" />}
                >
                  Massuppdatering
                </Button>
              </div>
            </div>

            {loadingAttendance ? (
              <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48 sticky left-0 bg-gray-50 z-10">
                        Anställd
                      </th>
                      {getMonthDays().map((day) => (
                        <th
                          key={day.toISOString()}
                          className={`px-1 py-2 text-center text-xs font-medium tracking-wider border-l border-gray-200 min-w-[36px]
                            ${isWeekend(day) ? 'bg-gray-100 text-gray-400' : 'text-gray-500'}
                            ${toISODate(day) === toISODate(new Date()) ? 'bg-blue-100 text-blue-700 font-bold' : ''}`}
                        >
                          <div className="text-[10px]">{day.toLocaleDateString('sv-SE', { weekday: 'short' }).slice(0, 2)}</div>
                          <div className="font-semibold">{day.getDate()}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {teamMembers.map((member) => {
                      // Check if employee has rate configured
                      const hasRate = member.employment_type === 'salary'
                        ? !!member.base_monthly_salary
                        : !!member.base_hourly_rate;

                      // Get employee's work days (default Mon-Fri)
                      const employeeWorkDays = member.work_days || ['mon', 'tue', 'wed', 'thu', 'fri'];

                      // Helper to check if a date is a work day for this employee
                      const isEmployeeWorkDay = (date: Date) => {
                        const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
                        const dayCode = dayNames[date.getDay()];
                        return employeeWorkDays.includes(dayCode);
                      };

                      return (
                        <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-2 py-2 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1">
                                {!hasRate && (
                                  <span title="Löneinställningar saknas - ange timlön eller månadslön" className="text-amber-500">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                  </span>
                                )}
                                <span className="truncate max-w-[100px]">{member.full_name}</span>
                              </div>
                              <button
                                onClick={() => setPayrollSettingsEmployee(member)}
                                className={`p-1 hover:bg-gray-100 rounded ${!hasRate ? 'text-amber-500 hover:text-amber-600' : 'text-gray-400 hover:text-gray-600'}`}
                                title="Löneinställningar"
                              >
                                <Settings className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          {getMonthDays().map((day) => {
                            const dateStr = toISODate(day);
                            const record = attendanceData[`${member.id}_${dateStr}`];
                            const status = record?.status;
                            const isToday = dateStr === toISODate(new Date());
                            const weekend = isWeekend(day);
                            const isWorkDay = isEmployeeWorkDay(day);
                            const isNonScheduledWorkDay = !isWorkDay && !weekend;

                            // Determine cell style based on status - compact for monthly
                            let cellClass = "cursor-pointer transition-colors relative";
                            let content: React.ReactNode = null;
                            let title = "";

                            if (status === 'sick') {
                              cellClass += " bg-red-100 text-red-700";
                              content = "S";
                              title = "Sjuk";
                            } else if (status === 'vacation') {
                              cellClass += " bg-yellow-100 text-yellow-700";
                              content = "V";
                              title = "Semester";
                            } else if (status === 'leave') {
                              cellClass += " bg-blue-100 text-blue-700";
                              content = "T";
                              title = "Tjänstledig";
                            } else if (status === 'absent') {
                              cellClass += " bg-gray-200 text-gray-700";
                              content = "F";
                              title = "Frånvarande";
                            } else if (status === 'present') {
                              cellClass += " bg-green-100 text-green-700";
                              content = "✓";
                              title = "Närvarande";
                            } else if (weekend) {
                              cellClass += " bg-gray-50 text-gray-300";
                            } else {
                              cellClass += " hover:bg-gray-100";
                            }

                            if (isToday && !status) cellClass += " ring-2 ring-blue-400 ring-inset";

                            return (
                              <td
                                key={dateStr}
                                title={title || (weekend ? 'Helg' : 'Klicka för att sätta status')}
                                className={`px-1 py-1 text-center text-[10px] font-medium border-l border-gray-100 h-8 min-w-[36px] ${cellClass}`}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  setContextMenu({
                                    x: e.clientX,
                                    y: e.clientY,
                                    userId: member.id,
                                    date: day
                                  });
                                }}
                                onClick={() => {
                                  // Cycle through states
                                  let nextStatus: AttendanceStatus | null = 'present';
                                  if (status === 'present') nextStatus = 'sick';
                                  else if (status === 'sick') nextStatus = 'vacation';
                                  else if (status === 'vacation') nextStatus = null;
                                  else nextStatus = 'present';

                                  handleAttendanceUpdate(member.id, day, nextStatus);
                                }}
                              >
                                {content}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
              <div className="flex items-center"><div className="w-3 h-3 bg-green-50 border border-green-200 rounded mr-1"></div> Närvarande</div>
              <div className="flex items-center"><div className="w-3 h-3 bg-red-50 border border-red-200 rounded mr-1"></div> Sjuk</div>
              <div className="flex items-center"><div className="w-3 h-3 bg-yellow-50 border border-yellow-200 rounded mr-1"></div> Semester</div>
              <div className="flex items-center"><div className="w-3 h-3 bg-blue-50 border border-blue-200 rounded mr-1"></div> Tjänstledig</div>
            </div>
          </div>
        </div>
      )}

      {selectedEmployeeReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Provision för {selectedEmployeeReport.employee.full_name}
                </h3>
                <p className="text-sm text-gray-600">
                  {formatPayrollPeriod(selectedEmployeeReport.period)}
                </p>
              </div>
              <button onClick={() => setSelectedEmployeeReport(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              {selectedEmployeeReport.commissionOrders.length === 0 ? (
                <p>Inga provisioner för denna period.</p>
              ) : (
                <div className="divide-y divide-gray-200">
                  {selectedEmployeeReport.commissionOrders.map(({ order, commissionAmount, isPrimary }) => (
                    <div key={order.id} className={`p-3 flex justify-between items-center ${order.commission_paid ? 'opacity-60' : ''}`}>
                      <div>
                        <p className="font-medium">{order.title} ({formatCurrency(order.value || 0)})</p>
                        <p className={`text-xs ${isPrimary ? 'text-blue-600' : 'text-purple-600'}`}>
                          {isPrimary ? 'Primär' : 'Sekundär'} | <span className="text-gray-500">{formatDate(order.created_at || '')}</span>
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium text-green-600">{formatCurrency(commissionAmount)}</span>
                        {order.commission_paid ? (
                          <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                            <CheckCircle className="w-3 h-3 mr-1" /> Betald
                          </span>
                        ) : (
                          <button
                            onClick={() => handleMarkCommissionPaid(order.id)}
                            className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-md hover:bg-gray-200"
                          >
                            Markera som Betald
                          </button>
                        )}
                        <button onClick={() => setOrderToAssign(order)} className="text-xs text-blue-600 hover:underline">Ändra</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end p-6 border-t bg-gray-50">
              <button onClick={() => setSelectedEmployeeReport(null)} className="px-4 py-2 border rounded-md text-sm font-medium">Stäng</button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Payroll Detail Modal */}
      {showEmployeeModal && (
        <EmployeePayrollModal
          isOpen={!!showEmployeeModal}
          onClose={() => setShowEmployeeModal(null)}
          employeeSummary={showEmployeeModal}
          onApprove={() => {
            handleApproveTimesheet(showEmployeeModal.employee.id);
            setShowEmployeeModal(null);
          }}
        />
      )}

      {/* Payroll Reports Modal */}
      {showReportsModal && payrollSummary && (
        <PayrollReportsModal
          isOpen={showReportsModal}
          onClose={() => setShowReportsModal(false)}
          payrollSummary={payrollSummary}
          organisationId={userProfile?.organisation_id}
        />
      )}

      {orderToAssign && (
        <CommissionAssignmentForm
          isOpen={!!orderToAssign}
          onClose={() => setOrderToAssign(null)}
          order={orderToAssign}
          onSaved={handleSaveCommission}
        />
      )}

      {/* Payroll Adjustment Modal */}
      {adjustmentEmployee && (
        <PayrollAdjustmentModal
          isOpen={!!adjustmentEmployee}
          onClose={() => setAdjustmentEmployee(null)}
          employeeSummary={adjustmentEmployee}
          onSaveAdjustments={handleSaveAdjustments}
        />
      )}

      {/* Bulk Attendance Modal */}
      <BulkAttendanceModal
        isOpen={showBulkAttendanceModal}
        onClose={() => setShowBulkAttendanceModal(false)}
        employees={teamMembers}
        onSave={handleBulkAttendanceSave}
      />

      {/* Context Menu for Attendance */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setContextMenu(null)}
          onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
        >
          <div
            className="fixed bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden w-48 z-50"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-1">
              {[
                { value: 'present', label: 'Närvarande', color: 'text-green-800', bg: 'bg-green-100' },
                { value: 'sick', label: 'Sjuk', color: 'text-red-800', bg: 'bg-red-100' },
                { value: 'vacation', label: 'Semester', color: 'text-yellow-800', bg: 'bg-yellow-100' },
                { value: 'leave', label: 'Tjänstledig', color: 'text-blue-800', bg: 'bg-blue-100' },
                { value: 'absent', label: 'Frånvarande', color: 'text-gray-800', bg: 'bg-gray-200' },
                { value: null, label: 'Rensa', color: 'text-gray-500', bg: 'bg-white' }
              ].map(opt => (
                <button
                  key={opt.label}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2"
                  onClick={() => {
                    handleAttendanceUpdate(contextMenu.userId, contextMenu.date, opt.value as AttendanceStatus);
                    setContextMenu(null);
                  }}
                >
                  <div className={`w-3 h-3 rounded-full border border-gray-300 ${opt.bg}`}></div>
                  <span className={`text-sm ${opt.color}`}>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Employee Payroll Settings Modal */}
      {payrollSettingsEmployee && (
        <EmployeePayrollSettingsModal
          isOpen={!!payrollSettingsEmployee}
          onClose={() => setPayrollSettingsEmployee(null)}
          employee={payrollSettingsEmployee}
          onSave={(updatedEmployee) => {
            // Update the local teamMembers state with the updated employee
            setTeamMembers(prev =>
              prev.map(m => m.id === updatedEmployee.id ? updatedEmployee : m)
            );
            success('Uppdaterad', 'Löneinställningar har sparats.');
          }}
        />
      )}
    </div>
  );
}

export default PayrollDashboard;