import React, { useState, useEffect } from 'react';
import {
  X,
  PieChart,
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  Loader2
} from 'lucide-react';
import {
  getCommissionReport,
  type PayrollSummary,
  type CommissionReport,
  formatPayrollPeriod
} from '../lib/payroll';
import { formatCurrency } from '../lib/database';
import {
  PieChart as RechartsPieChart,
  BarChart as RechartsBarChart,
  LineChart,
  Pie,
  Bar,
  Line,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface PayrollReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  payrollSummary: PayrollSummary;
  organisationId: string;
}

function PayrollReportsModal({
  isOpen,
  onClose,
  payrollSummary,
  organisationId
}: PayrollReportsModalProps) {
  const [activeReport, setActiveReport] = useState<'overview' | 'commission' | 'labor_cost' | 'trends'>('overview');
  const [commissionReports, setCommissionReports] = useState<CommissionReport[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && activeReport === 'commission') {
      loadCommissionReports();
    }
  }, [isOpen, activeReport, payrollSummary]);

  const loadCommissionReports = async () => {
    try {
      setLoading(true);

      // Get all employees with commission
      const salespeople = payrollSummary.employeeSummaries
        .filter(emp => emp.employee.has_commission)
        .map(emp => emp.employee);

      const reports: CommissionReport[] = [];

      for (const salesperson of salespeople) {
        const reportResult = await getCommissionReport(salesperson.id, payrollSummary.period);
        if (reportResult.data) {
          reports.push(reportResult.data);
        }
      }

      setCommissionReports(reports);
    } catch (err) {
      console.error('Error loading commission reports:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  // Prepare chart data
  const employeePayData = payrollSummary.employeeSummaries.map(emp => ({
    name: emp.employee.full_name.split(' ')[0],
    bruttolön: emp.totalGrossPay,
    grundlön: emp.basePay,
    övertid: emp.overtimePay,
    provision: emp.commissionEarnings,
    timmar: emp.totalHours
  }));

  const employmentTypeData = [
    {
      name: 'Timanställda',
      value: payrollSummary.employeeSummaries.filter(emp => emp.employee.employment_type === 'hourly').length,
      amount: payrollSummary.employeeSummaries
        .filter(emp => emp.employee.employment_type === 'hourly')
        .reduce((sum, emp) => sum + emp.totalGrossPay, 0)
    },
    {
      name: 'Månadslön',
      value: payrollSummary.employeeSummaries.filter(emp => emp.employee.employment_type === 'salary').length,
      amount: payrollSummary.employeeSummaries
        .filter(emp => emp.employee.employment_type === 'salary')
        .reduce((sum, emp) => sum + emp.totalGrossPay, 0)
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              <PieChart className="w-6 h-6 mr-3 text-blue-600" />
              Lönerapporter
            </h3>
            <p className="text-sm text-gray-600">
              Detaljerade rapporter för {formatPayrollPeriod(payrollSummary.period)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Översikt', icon: BarChart3 },
              { id: 'commission', label: 'Provision', icon: TrendingUp },
              { id: 'labor_cost', label: 'Arbetskostnader', icon: DollarSign },
              { id: 'trends', label: 'Trender', icon: Calendar }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveReport(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${activeReport === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Report */}
          {activeReport === 'overview' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{payrollSummary.totalEmployees}</div>
                  <p className="text-sm text-blue-700">Anställda</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{payrollSummary.totalHours}h</div>
                  <p className="text-sm text-green-700">Totala timmar</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{formatCurrency(payrollSummary.totalGrossPay)}</div>
                  <p className="text-sm text-purple-700">Bruttolön</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{formatCurrency(payrollSummary.totalCommissions)}</div>
                  <p className="text-sm text-orange-700">Provision</p>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-4">Lön per anställd</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsBarChart data={employeePayData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Bar dataKey="bruttolön" fill="#2563EB" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-4">Anställningstyper</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={employmentTypeData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {employmentTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Commission Report */}
          {activeReport === 'commission' && (
            <div className="space-y-6">
              {loading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                  <span className="text-gray-600">Laddar provisionsrapporter...</span>
                </div>
              ) : commissionReports.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>Inga provisionsrapporter för denna period</p>
                </div>
              ) : (
                <>
                  {/* Commission Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(commissionReports.reduce((sum, report) => sum + report.totalCommission, 0))}
                      </div>
                      <p className="text-sm text-green-700">Total provision</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {commissionReports.reduce((sum, report) => sum + report.orderCount, 0)}
                      </div>
                      <p className="text-sm text-blue-700">Provisionsordrar</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {formatCurrency(
                          commissionReports.reduce((sum, report) => sum + report.averageOrderValue, 0) /
                          Math.max(commissionReports.length, 1)
                        )}
                      </div>
                      <p className="text-sm text-purple-700">Genomsnittligt ordervärde</p>
                    </div>
                  </div>

                  {/* Commission by Salesperson */}
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h4 className="font-medium text-gray-900">Provision per säljare</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Säljare</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ordrar</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Primär provision</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delad provision</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total provision</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Genomsnitt/order</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {commissionReports.map((report) => (
                            <tr key={report.salesperson.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                                    <span className="text-white font-medium text-xs">
                                      {report.salesperson.full_name.split(' ').map(n => n[0]).join('')}
                                    </span>
                                  </div>
                                  <span className="text-sm font-medium text-gray-900">
                                    {report.salesperson.full_name}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {report.orderCount}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                                {formatCurrency(report.totalPrimaryCommission)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                                {formatCurrency(report.totalSecondaryCommission)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                {formatCurrency(report.totalCommission)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatCurrency(report.averageOrderValue)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Labor Cost Analysis */}
          {activeReport === 'labor_cost' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-4">Kostnad per anställningstyp</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={employmentTypeData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="amount"
                        label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                      >
                        {employmentTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-4">Timmar vs Lön</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsBarChart data={employeePayData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="timmar" fill="#10B981" name="Timmar" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-4">Kostnadsnedbrytning</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatCurrency(payrollSummary.totalGrossPay - payrollSummary.totalCommissions)}
                    </div>
                    <p className="text-sm text-gray-600">Grundlöner</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {formatCurrency(payrollSummary.totalCommissions)}
                    </div>
                    <p className="text-sm text-gray-600">Provision</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(payrollSummary.totalEstimatedTax)}
                    </div>
                    <p className="text-sm text-gray-600">Skatter</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(payrollSummary.totalGrossPay * 0.3142)}
                    </div>
                    <p className="text-sm text-gray-600">Sociala avgifter</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Trends (placeholder) */}
          {activeReport === 'trends' && (
            <div className="space-y-6">
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">Trendanalys</h4>
                <p className="text-gray-600">
                  Trendanalys kommer snart. Här kommer du att kunna se lönetrender över tid,
                  jämföra månader och analysera kostnadsutveckling.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            Rapport genererad: {new Date().toLocaleDateString('sv-SE')}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                // Export current report data
                const reportData = {
                  period: formatPayrollPeriod(payrollSummary.period),
                  summary: payrollSummary,
                  commissionReports: activeReport === 'commission' ? commissionReports : undefined
                };

                const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `lonerapport-${formatPayrollPeriod(payrollSummary.period).toLowerCase().replace(' ', '-')}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportera rapport
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Stäng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PayrollReportsModal;