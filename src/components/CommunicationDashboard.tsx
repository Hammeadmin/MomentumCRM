import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Mail,
  Phone,
  Filter,
  Search,
  Download,
  RefreshCw,
  Calendar,
  User,
  Building,
  Send,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  BarChart3,
  X,
  ExternalLink,
  Copy,
  Forward,
  Loader2
} from 'lucide-react';
import { Button } from './ui';
import {
  getCommunications,
  getStatusColor,
  getStatusLabel,
  type CommunicationWithRelations,
  type CommunicationFilters,
  type CommunicationType,
  type CommunicationStatus
} from '../lib/communications';
import { getCustomers, getUserProfiles } from '../lib/database';
import { formatDateTime, formatCurrency } from '../lib/database';
import { useAuth } from '../contexts/AuthContext';
import ExportButton from './ExportButton';
import EmptyState from './EmptyState';

function CommunicationDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [communications, setCommunications] = useState<CommunicationWithRelations[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [filters, setFilters] = useState<CommunicationFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCommunication, setSelectedCommunication] = useState<CommunicationWithRelations | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const handleViewDetail = (communication: CommunicationWithRelations) => {
    setSelectedCommunication(communication);
    setShowDetailModal(true);
  };

  const handleCopyContent = () => {
    if (selectedCommunication) {
      navigator.clipboard.writeText(selectedCommunication.content);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, filters]);

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

      // Load communications and customers
      const [communicationsResult, customersResult] = await Promise.all([
        getCommunications(profile.organisation_id, { ...filters, search: searchTerm }),
        getCustomers(profile.organisation_id)
      ]);

      if (communicationsResult.error) {
        setError(communicationsResult.error.message);
        return;
      }

      if (customersResult.error) {
        setError(customersResult.error.message);
        return;
      }

      setCommunications(communicationsResult.data || []);
      setCustomers(customersResult.data || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Ett oväntat fel inträffade vid laddning av data.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof CommunicationFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(Boolean).length + (searchTerm ? 1 : 0);
  };

  // Calculate statistics
  const stats = {
    totalCommunications: communications.length,
    emailsSent: communications.filter(c => c.type === 'email' && c.status === 'sent').length,
    smsSent: communications.filter(c => c.type === 'sms' && c.status === 'sent').length,
    failedCommunications: communications.filter(c => c.status === 'failed').length,
    totalCost: communications
      .filter(c => c.type === 'sms' && c.status === 'sent')
      .reduce((sum, c) => sum + (Math.ceil(c.content.length / 160) * 0.85), 0)
  };

  const formatRecipient = (communication: CommunicationWithRelations) => {
    if (communication.type === 'email') {
      return communication.recipient;
    } else {
      // Format phone number for display
      const phone = communication.recipient;
      if (phone.startsWith('+46')) {
        return phone.replace('+46', '0').replace(/(\d{3})(\d{3})(\d{2})(\d{2})/, '$1-$2 $3 $4');
      }
      return phone;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mr-4 shadow-lg shadow-teal-500/20">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Kommunikation</h1>
              <p className="text-sm text-gray-500">Laddar...</p>
            </div>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-8">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin mb-3" />
            <p className="text-sm text-gray-500">Laddar kommunikationsdata...</p>
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
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mr-4 shadow-lg shadow-teal-500/20">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kommunikation</h1>
            <p className="text-sm text-gray-500">
              {stats.totalCommunications} meddelanden • {stats.emailsSent} e-post • {stats.smsSent} SMS
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
          <ExportButton
            data={communications}
            filename={`kommunikation-${new Date().toISOString().split('T')[0]}`}
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total kommunikation</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCommunications}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Mail className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">E-post skickade</p>
              <p className="text-2xl font-bold text-gray-900">{stats.emailsSent}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Phone className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">SMS skickade</p>
              <p className="text-2xl font-bold text-gray-900">{stats.smsSent}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">SMS-kostnad</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalCost)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Sök i kommunikation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <select
                value={filters.type || 'all'}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Alla typer</option>
                <option value="email">E-post</option>
                <option value="sms">SMS</option>
              </select>

              <select
                value={filters.status || 'all'}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Alla statusar</option>
                <option value="draft">Utkast</option>
                <option value="sent">Skickat</option>
                <option value="delivered">Levererat</option>
                <option value="read">Läst</option>
                <option value="failed">Misslyckades</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {getActiveFiltersCount() > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Rensa filter ({getActiveFiltersCount()})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Communications List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Kommunikationshistorik</h3>
            <span className="text-sm text-gray-500">{communications.length} meddelanden</span>
          </div>
        </div>

        {communications.length === 0 ? (
          <EmptyState
            type="general"
            title="Ingen kommunikation hittades"
            description={
              getActiveFiltersCount() > 0
                ? "Inga meddelanden matchar dina filter. Prova att ändra filtren."
                : "Ingen kundkommunikation har skickats ännu. Kommunikation visas här när meddelanden skickas från orderdetaljsidor."
            }
            actionText="Rensa filter"
            onAction={getActiveFiltersCount() > 0 ? clearFilters : undefined}
          />
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Typ & Status</th>
                  <th>Mottagare</th>
                  <th>Ämne/Innehåll</th>
                  <th>Order</th>
                  <th>Skickat</th>
                  <th>Av</th>
                </tr>
              </thead>
              <tbody>
                {communications.map((communication) => (
                  <tr
                    key={communication.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleViewDetail(communication)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center">
                          {communication.type === 'email' ? (
                            <Mail className="w-4 h-4 text-blue-600 mr-2" />
                          ) : (
                            <Phone className="w-4 h-4 text-purple-600 mr-2" />
                          )}
                          <span className="text-sm font-medium text-gray-900">
                            {communication.type === 'email' ? 'E-post' : 'SMS'}
                          </span>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(communication.status)}`}>
                          {getStatusLabel(communication.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {communication.order?.customer?.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatRecipient(communication)}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        {communication.subject && (
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {communication.subject}
                          </p>
                        )}
                        <p className="text-sm text-gray-600 truncate">
                          {communication.content}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {communication.order?.title || '-'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {communication.order_id ? `#${communication.order_id.slice(-8).toUpperCase()}` : '-'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {communication.sent_at ? (
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDateTime(communication.sent_at)}
                        </div>
                      ) : (
                        <span className="text-gray-400">Ej skickat</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-3 h-3 mr-1 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {communication.created_by?.full_name}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Communication Detail Modal */}
      {showDetailModal && selectedCommunication && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={() => setShowDetailModal(false)}>
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                {selectedCommunication.type === 'email' ? (
                  <Mail className="w-5 h-5 text-blue-600" />
                ) : (
                  <Phone className="w-5 h-5 text-purple-600" />
                )}
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {selectedCommunication.type === 'email' ? 'E-postmeddelande' : 'SMS'}
                  </h3>
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(selectedCommunication.status)}`}>
                    {getStatusLabel(selectedCommunication.status)}
                  </span>
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
              {/* Recipient & Sender */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Mottagare</label>
                  <p className="text-sm font-medium text-gray-900">{selectedCommunication.order?.customer?.name}</p>
                  <p className="text-sm text-gray-600">{formatRecipient(selectedCommunication)}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Skickat av</label>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <p className="text-sm font-medium text-gray-900">{selectedCommunication.created_by?.full_name || 'Okänd'}</p>
                  </div>
                </div>
              </div>

              {/* Timestamp */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Tidpunkt</label>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <p className="text-sm text-gray-900">
                    {selectedCommunication.sent_at
                      ? new Date(selectedCommunication.sent_at).toLocaleString('sv-SE', {
                        year: 'numeric', month: 'long', day: 'numeric',
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                      })
                      : 'Ej skickat'}
                  </p>
                </div>
              </div>

              {/* Related Order */}
              {selectedCommunication.order && selectedCommunication.order_id && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Kopplad order</label>
                  <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg">
                    <ExternalLink className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">{selectedCommunication.order.title}</span>
                    <span className="text-xs text-blue-600">#{selectedCommunication.order_id.slice(-8).toUpperCase()}</span>
                  </div>
                </div>
              )}

              {/* Subject (for email) */}
              {selectedCommunication.subject && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Ämne</label>
                  <p className="text-sm font-semibold text-gray-900">{selectedCommunication.subject}</p>
                </div>
              )}

              {/* Content */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Meddelande</label>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{selectedCommunication.content}</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <button
                onClick={handleCopyContent}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Copy className="w-4 h-4 mr-2" />
                Kopiera innehåll
              </button>
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Stäng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CommunicationDashboard;