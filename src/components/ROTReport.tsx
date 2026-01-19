import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Download,
  Calendar,
  User,
  Building,
  FileText,
  Filter,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Loader2
} from 'lucide-react';
import { getROTReport, getROTSummary, formatROTAmount } from '../lib/rot';
import { formatCurrency, formatDate } from '../lib/database';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfiles } from '../lib/database';
import ExportButton from './ExportButton';
import { Button } from './ui';

function ROTReport() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rotData, setRotData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, selectedYear]);

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

      // Load ROT data and summary
      const [reportResult, summaryResult] = await Promise.all([
        getROTReport(profile.organisation_id, selectedYear),
        getROTSummary(profile.organisation_id, selectedYear)
      ]);

      if (reportResult.error) {
        setError(reportResult.error.message);
        return;
      }

      if (summaryResult.error) {
        setError(summaryResult.error.message);
        return;
      }

      setRotData(reportResult.data || []);
      setSummary(summaryResult.data);
    } catch (err) {
      console.error('Error loading ROT data:', err);
      setError('Ett oväntat fel inträffade vid laddning av ROT-data.');
    } finally {
      setLoading(false);
    }
  };

  const generateROTExport = () => {
    const exportData = rotData.map(item => ({
      'Fakturanummer': item.invoice_number,
      'Datum': formatDate(item.created_at),
      'Kund': item.customer_name,
      'Personnummer': item.rot_personnummer || '',
      'Organisationsnummer': item.rot_organisationsnummer || '',
      'Fastighetsbeteckning': item.rot_fastighetsbeteckning || '',
      'Fakturabelopp': item.amount,
      'ROT-avdrag': item.rot_amount,
      'Nettosumma': item.amount - item.rot_amount,
      'Adress': `${item.address || ''} ${item.postal_code || ''} ${item.city || ''}`.trim()
    }));

    return exportData;
  };

  const availableYears = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-lime-500 to-lime-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">ROT-rapport</h1>
              <p className="text-lime-100">Övervaka ROT-avdrag</p>
            </div>
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-lime-600 mx-auto mb-4" />
            <p className="text-gray-600">Laddar ROT-data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-lime-500 to-lime-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">ROT-rapport</h1>
              <p className="text-lime-100">Översikt över ROT-avdrag för skattedeklaration och rapportering</p>
            </div>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-white/30 rounded-md bg-white/20 text-white focus:ring-white focus:border-white"
            >
              {availableYears.map(year => (
                <option key={year} value={year} className="text-gray-900">{year}</option>
              ))}
            </select>
            <Button
              variant="secondary"
              size="sm"
              onClick={loadData}
              className="!bg-white/20 !text-white hover:!bg-white/30 !border-white/30"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Uppdatera
            </Button>
            <ExportButton
              data={generateROTExport()}
              filename={`rot-rapport-${selectedYear}`}
              title="Exportera"
            />
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card-padded">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Calculator className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Totalt ROT-avdrag</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatROTAmount(summary.totalROTAmount)}
                </p>
              </div>
            </div>
          </div>

          <div className="card-padded">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Antal fakturor</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalInvoices}</p>
              </div>
            </div>
          </div>

          <div className="card-padded">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Privatpersoner</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatROTAmount(summary.rotByCustomerType.privatpersoner)}
                </p>
              </div>
            </div>
          </div>

          <div className="card-padded">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Building className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Företag</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatROTAmount(summary.rotByCustomerType.företag)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ROT Data Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">ROT-avdrag {selectedYear}</h3>
            <span className="text-sm text-gray-500">{rotData.length} fakturor</span>
          </div>
        </div>

        {rotData.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Calculator className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="font-medium">Inga ROT-avdrag för {selectedYear}</p>
            <p className="text-sm mt-1">ROT-avdrag visas här när fakturor med ROT-information skapas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Faktura
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kund
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ROT-uppgifter
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fastighetsbeteckning
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fakturabelopp
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ROT-avdrag
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nettosumma
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Datum
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rotData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 text-blue-600 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {item.invoice_number}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.customer_name}</p>
                        <p className="text-sm text-gray-600">
                          {item.address && `${item.address}, ${item.postal_code} ${item.city}`}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {item.rot_personnummer ? (
                          <>
                            <User className="w-4 h-4 text-purple-600 mr-2" />
                            <span className="text-sm text-gray-900">{item.rot_personnummer}</span>
                          </>
                        ) : item.rot_organisationsnummer ? (
                          <>
                            <Building className="w-4 h-4 text-blue-600 mr-2" />
                            <span className="text-sm text-gray-900">{item.rot_organisationsnummer}</span>
                          </>
                        ) : (
                          <span className="text-sm text-gray-400">Ej angivet</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.rot_fastighetsbeteckning || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600">
                      {formatROTAmount(item.rot_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                      {formatROTAmount(item.amount - item.rot_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(item.created_at)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ROT Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">Information om ROT-rapportering</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>
            <strong>För Skatteverket:</strong> Denna rapport innehåller all nödvändig information för ROT-rapportering till Skatteverket.
          </p>
          <p>
            <strong>Rapporteringsperiod:</strong> ROT-avdrag ska rapporteras månadsvis till Skatteverket senast den 12:e i månaden efter utförd tjänst.
          </p>
          <p>
            <strong>Kontrolluppgifter:</strong> Kontrolluppgifter för ROT-avdrag ska lämnas senast den 31 januari året efter.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ROTReport;