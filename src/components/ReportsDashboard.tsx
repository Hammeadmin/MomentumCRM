import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  FileText,
  TrendingUp,
  DollarSign,
  Package,
  Receipt,
  MessageSquare,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Eye,
  Mail,
  Clock,
  Users,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Button } from './ui';
import {
  LineChart,
  BarChart,
  PieChart,
  AreaChart,
  ComposedChart,
  Line,
  Bar,
  Area,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { getInvoices } from '../lib/invoices';
import { getCreditNotes } from '../lib/creditNotes';
import { getOrders } from '../lib/orders';
import { INVOICE_STATUS_LABELS, ORDER_STATUS_LABELS } from '../types/database';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfiles } from '../lib/database';
import { formatCurrency, formatDate } from '../lib/database';
import ExportButton from './ExportButton';
import { generateAllReportData } from '../lib/reports';

interface ReportSection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  reports: Report[];
  expanded: boolean;
}

interface Report {
  id: string;
  title: string;
  description: string;
  type: 'chart' | 'table' | 'summary';
  chartType?: 'line' | 'bar' | 'pie' | 'area';
  data?: any[];
  loading?: boolean;
}

interface DateRange {
  startDate: string;
  endDate: string;
  preset: 'last7days' | 'last30days' | 'last3months' | 'last6months' | 'lastyear' | 'custom';
}

function ReportsDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    preset: 'last30days'
  });

  const [reportSections, setReportSections] = useState<ReportSection[]>([
    {
      id: 'sales',
      title: 'Försäljningsrapporter',
      description: 'Analys av försäljning, leads och konvertering',
      icon: TrendingUp,
      expanded: true,
      reports: [
        {
          id: 'sales_overview',
          title: 'Försäljningsöversikt',
          description: 'Månadsvis försäljningsutveckling',
          type: 'chart',
          chartType: 'line',
          data: []
        },
        {
          id: 'lead_conversion',
          title: 'Lead-konvertering',
          description: 'Konverteringsgrad per källa',
          type: 'chart',
          chartType: 'bar',
          data: []
        },
        {
          id: 'sales_by_user',
          title: 'Försäljning per användare',
          description: 'Prestanda per säljare',
          type: 'chart',
          chartType: 'pie',
          data: []
        }
      ]
    },
    {
      id: 'invoices',
      title: 'Fakturarapporter',
      description: 'Fakturastatus, betalningar och utestående',
      icon: Receipt,
      expanded: false,
      reports: [
        {
          id: 'invoice_status',
          title: 'Fakturastatus',
          description: 'Fördelning av fakturastatusarna',
          type: 'chart',
          chartType: 'pie',
          data: []
        },
        {
          id: 'payment_trends',
          title: 'Betalningstrender',
          description: 'Betalningar över tid',
          type: 'chart',
          chartType: 'area',
          data: []
        },
        {
          id: 'credited_invoices',
          title: 'Krediterade Fakturor',
          description: 'Summerat värde av krediteringar över tid',
          type: 'chart',
          chartType: 'bar',
          data: []
        },
        {
          id: 'overdue_invoices',
          title: 'Förfallna fakturor',
          description: 'Lista över förfallna fakturor',
          type: 'table',
          data: []
        }
      ]
    },
    {
      id: 'orders',
      title: 'Orderrapporter',
      description: 'Orderstatus, genomförandetid och produktivitet',
      icon: Package,
      expanded: false,
      reports: [
        {
          id: 'order_pipeline',
          title: 'Order-pipeline',
          description: 'Ordrar per status över tid',
          type: 'chart',
          chartType: 'bar',
          data: []
        },
        {
          id: 'completion_time',
          title: 'Genomförandetid',
          description: 'Genomsnittlig tid från order till faktura',
          type: 'summary',
          data: []
        },
        {
          id: 'team_productivity',
          title: 'Teamproduktivitet',
          description: 'Produktivitet per team och användare',
          type: 'chart',
          chartType: 'bar',
          data: []
        }
      ]
    },
    {
      id: 'communication',
      title: 'Kommunikationsloggar',
      description: 'E-post, SMS och kundkommunikation',
      icon: MessageSquare,
      expanded: false,
      reports: [
        {
          id: 'communication_volume',
          title: 'Kommunikationsvolym',
          description: 'E-post och SMS över tid',
          type: 'chart',
          chartType: 'line',
          data: []
        },
        {
          id: 'response_times',
          title: 'Svarstider',
          description: 'Genomsnittliga svarstider per kanal',
          type: 'chart',
          chartType: 'bar',
          data: []
        },
        {
          id: 'communication_costs',
          title: 'Kommunikationskostnader',
          description: 'Kostnader för SMS och e-post',
          type: 'summary',
          data: []
        }
      ]
    }
  ]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, dateRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) return;

      // Get user profile
      const { data: profiles } = await getUserProfiles('', { userId: user.id });
      const profile = profiles?.[0];

      if (!profile?.organisation_id) {
        setError('Ingen organisation hittades för användaren');
        return;
      }

      setUserProfile(profile);

      // Load report data
      await loadReportData(profile.organisation_id);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Ett oväntat fel inträffade vid laddning av rapportdata.');
    } finally {
      setLoading(false);
    }
  };

  const loadReportData = async (organisationId: string) => {
    const reportData = await generateAllReportData(organisationId, dateRange);

    setReportSections(prev => prev.map(section => {
      switch (section.id) {
        case 'sales':
          return {
            ...section, reports: section.reports.map(report => {
              if (report.id === 'sales_overview') return { ...report, data: reportData.salesOverviewData };
              if (report.id === 'sales_by_user') return { ...report, data: reportData.salesByUserData, dataKey: 'intäkter', nameKey: 'name' };
              return report;
            })
          };
        case 'invoices':
          return {
            ...section, reports: section.reports.map(report => {
              if (report.id === 'invoice_status') return { ...report, data: reportData.invoiceStatusData, dataKey: 'antal', nameKey: 'status' };
              if (report.id === 'payment_trends') return { ...report, data: reportData.paymentTrendsData };
              if (report.id === 'credited_invoices') return { ...report, data: reportData.creditedInvoicesData, dataKey: 'Krediterat Belopp', nameKey: 'månad' };
              return report;
            })
          };
        case 'orders':
          return {
            ...section, reports: section.reports.map(report => {
              if (report.id === 'order_pipeline') return { ...report, data: reportData.orderPipelineData, dataKey: 'antal', nameKey: 'status' };
              return report;
            })
          };
        default:
          return section;
      }
    }));
  };

  const handleDateRangeChange = (preset: DateRange['preset']) => {
    const now = new Date();
    let startDate: Date;

    switch (preset) {
      case 'last7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last30days':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last3months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case 'last6months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        break;
      case 'lastyear':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        return;
    }

    setDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
      preset
    });
  };

  const toggleSection = (sectionId: string) => {
    setReportSections(prev => prev.map(section =>
      section.id === sectionId
        ? { ...section, expanded: !section.expanded }
        : section
    ));
  };

  const exportReport = (report: Report) => {
    if (!report.data) return;

    const exportData = report.data.map((item, index) => ({
      index: index + 1,
      ...item
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title.toLowerCase().replace(/\s+/g, '-')}-${dateRange.startDate}-${dateRange.endDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderChart = (report: Report) => {
    if (!report.data || report.data.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>Ingen data tillgänglig</p>
        </div>
      );
    }

    const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

    switch (report.chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={report.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="månad" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip formatter={(value, name) => [
                name.includes('intäkter') || name.includes('värde') ? formatCurrency(value as number) : value,
                name
              ]} />
              <Legend />
              <Line type="monotone" dataKey="intäkter" stroke="#2563EB" strokeWidth={2} name="Intäkter" />
              <Line type="monotone" dataKey="ordrar" stroke="#10B981" strokeWidth={2} name="Ordrar" />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar': {
        // Check if the data represents a currency value
        const isCurrency = report.dataKey?.toLowerCase().includes('belopp') ||
          report.dataKey?.toLowerCase().includes('intäkter');

        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={report.data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey={report.nameKey || 'name'} stroke="#6b7280" fontSize={12} />
              <YAxis
                stroke="#6b7280"
                fontSize={12}
                // Apply the correct format to the Y-axis labels
                tickFormatter={(value) => isCurrency ? formatCurrency(value as number, 0) : `${value}`}
              />
              <Tooltip
                // Apply the correct format to the tooltip
                formatter={(value: number) => [
                  isCurrency ? formatCurrency(value) : `${value} st`,
                  report.dataKey
                ]}
                cursor={{ fill: 'rgba(239, 246, 255, 0.5)' }}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                }}
              />
              <Bar dataKey={report.dataKey || "value"} name={report.dataKey || "Värde"}>
                {report.data?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={report.id === 'credited_invoices' ? '#EF4444' : COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      }

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={report.data}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                // Use the dynamic dataKey and nameKey
                dataKey={report.dataKey || "value"}
                nameKey={report.nameKey || "name"}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {report.data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={report.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="månad" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Legend />
              <Area type="monotone" dataKey="betalningar" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} name="Betalningar" />
              <Area type="monotone" dataKey="utestående" stackId="2" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} name="Utestående" />
            </AreaChart>
          </ResponsiveContainer>
        );

      default:
        return <div>Okänd diagramtyp</div>;
    }
  };

  const renderTable = (report: Report) => {
    if (!report.data || report.data.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>Ingen data tillgänglig</p>
        </div>
      );
    }

    // Mock overdue invoices data
    const overdueInvoices = [
      { fakturanummer: 'F2024-001', kund: 'Acme AB', belopp: 45000, förfallodatum: '2024-01-15', dagar: 15 },
      { fakturanummer: 'F2024-003', kund: 'Tech Solutions', belopp: 28000, förfallodatum: '2024-01-20', dagar: 10 },
      { fakturanummer: 'F2024-007', kund: 'Nordic Corp', belopp: 67000, förfallodatum: '2024-01-25', dagar: 5 }
    ];

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fakturanummer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kund</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Belopp</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Förfallodatum</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dagar försenad</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {overdueInvoices.map((invoice, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {invoice.fakturanummer}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {invoice.kund}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(invoice.belopp)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {invoice.förfallodatum}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                    {invoice.dagar} dagar
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderSummary = (report: Report) => {
    // Mock summary data
    const summaryData = {
      completion_time: {
        genomsnitt: '12 dagar',
        median: '8 dagar',
        snabbast: '2 dagar',
        långsammast: '45 dagar'
      },
      communication_costs: {
        totalKostnad: 2450,
        smsCost: 1890,
        emailCost: 560,
        genomsnittPerKund: 45
      }
    };

    const data = summaryData[report.id as keyof typeof summaryData];

    if (!data) {
      return (
        <div className="text-center py-8 text-gray-500">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>Ingen sammanfattningsdata tillgänglig</p>
        </div>
      );
    }

    if (report.id === 'completion_time') {
      const timeData = data as typeof summaryData.completion_time;
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{timeData.genomsnitt}</div>
            <p className="text-sm text-blue-700">Genomsnitt</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{timeData.median}</div>
            <p className="text-sm text-green-700">Median</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{timeData.snabbast}</div>
            <p className="text-sm text-purple-700">Snabbast</p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{timeData.långsammast}</div>
            <p className="text-sm text-orange-700">Långsammast</p>
          </div>
        </div>
      );
    }

    if (report.id === 'communication_costs') {
      const costData = data as typeof summaryData.communication_costs;
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(costData.totalKostnad)}</div>
            <p className="text-sm text-blue-700">Total kostnad</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(costData.smsCost)}</div>
            <p className="text-sm text-purple-700">SMS-kostnader</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{formatCurrency(costData.emailCost)}</div>
            <p className="text-sm text-green-700">E-postkostnader</p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(costData.genomsnittPerKund)}</div>
            <p className="text-sm text-orange-700">Per kund</p>
          </div>
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mr-4 shadow-lg shadow-purple-500/20">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Rapporter</h1>
              <p className="text-sm text-gray-500">Laddar...</p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-8">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin mb-3" />
            <p className="text-sm text-gray-500">Laddar rapportdata...</p>
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
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mr-4 shadow-lg shadow-purple-500/20">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rapporter</h1>
            <p className="text-sm text-gray-500">
              Avancerade rapporter och analys
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={loadData}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Uppdatera
          </Button>
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

      {/* Date Range Filter */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-4">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Tidsperiod:</span>
            <div className="flex space-x-2">
              {[
                { key: 'last7days', label: '7 dagar' },
                { key: 'last30days', label: '30 dagar' },
                { key: 'last3months', label: '3 månader' },
                { key: 'last6months', label: '6 månader' },
                { key: 'lastyear', label: '1 år' }
              ].map((period) => (
                <button
                  key={period.key}
                  onClick={() => handleDateRangeChange(period.key as DateRange['preset'])}
                  className={`px-3 py-1 text-sm rounded-md ${dateRange.preset === period.key
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value, preset: 'custom' }))}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-gray-500">till</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value, preset: 'custom' }))}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Report Sections */}
      <div className="space-y-6">
        {reportSections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.id} className="bg-white rounded-lg shadow-sm border">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                    <p className="text-sm text-gray-600">{section.description}</p>
                  </div>
                </div>
                {section.expanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {section.expanded && (
                <div className="border-t border-gray-200 p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {section.reports.map((report) => (
                      <div key={report.id} className="border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200">
                          <div>
                            <h4 className="font-medium text-gray-900">{report.title}</h4>
                            <p className="text-sm text-gray-600">{report.description}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => exportReport(report)}
                              className="text-gray-400 hover:text-blue-600"
                              title="Exportera"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="p-4">
                          {report.type === 'chart' && renderChart(report)}
                          {report.type === 'table' && renderTable(report)}
                          {report.type === 'summary' && renderSummary(report)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ReportsDashboard;