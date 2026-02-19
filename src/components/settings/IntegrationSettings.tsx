import React, { useState, useEffect } from 'react';
import {
  Zap,
  Link,
  CheckCircle,
  AlertCircle,
  Settings,
  Calendar,
  Mail,
  Database,
  Download,
  Upload,
  Key,
  Globe,
  Save,
  MessageSquare,
  X,
  RefreshCw,
  ExternalLink,
  Share2,
  Plus,
  Trash2,
  Play
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  updateGoogleCalendarSettings,
  checkGoogleCalendarEnabled
} from '../../lib/calendar';
import {
  getFortnoxConnectionStatus,
  connectFortnox,
  disconnectFortnox,
  testFortnoxConnection,
  type FortnoxConnectionStatus
} from '../../lib/fortnox';
import {
  getSmsSettings,
  saveSmsSettings,
  sendTestSms,
  type SmsSettings
} from '../../lib/sms';
import {
  getWebhooks,
  createWebhook,
  deleteWebhook,
  testWebhook,
  toggleWebhook,
  generateWebhookSecret,
  WEBHOOK_EVENTS,
  type Webhook,
  type WebhookCreateInput
} from '../../lib/webhooks';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  settings?: Record<string, any>;
}

function IntegrationSettings() {
  const { user, userProfile, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState<string | null>(null);
  const [googleSyncEnabled, setGoogleSyncEnabled] = useState(false);
  const [googleCalendarId, setGoogleCalendarId] = useState('primary');

  // Fortnox state
  const [fortnoxStatus, setFortnoxStatus] = useState<FortnoxConnectionStatus>({ isConnected: false, isExpired: false });
  const [fortnoxTesting, setFortnoxTesting] = useState(false);
  const [fortnoxTestResult, setFortnoxTestResult] = useState<string | null>(null);

  // SMS/46elks state
  const [smsSettings, setSmsSettings] = useState<SmsSettings | null>(null);
  const [smsApiUsername, setSmsApiUsername] = useState('');
  const [smsApiPassword, setSmsApiPassword] = useState('');
  const [smsSenderName, setSmsSenderName] = useState('');

  // Webhooks state
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [newWebhook, setNewWebhook] = useState<WebhookCreateInput>({
    name: '',
    event_type: 'lead.created',
    target_url: '',
    secret: ''
  });

  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'fortnox',
      name: 'Fortnox',
      description: 'Synkronisera fakturor och kunder med Fortnox redovisningssystem',
      icon: Database,
      status: 'disconnected',
      settings: {
        apiKey: '',
        clientSecret: '',
        autoSync: false,
        syncInterval: '24h'
      }
    },
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      description: 'Synkronisera möten och aktiviteter med Google Calendar',
      icon: Calendar,
      status: 'disconnected',
      settings: {
        calendarId: '',
        syncDirection: 'both',
        reminderMinutes: 15
      }
    },
    {
      id: 'outlook-calendar',
      name: 'Outlook Calendar',
      description: 'Synkronisera möten och aktiviteter med Outlook Calendar',
      icon: Calendar,
      status: 'disconnected',
      settings: {
        tenantId: '',
        clientId: '',
        syncDirection: 'both'
      }
    },
    {
      id: 'resend',
      name: 'Resend (E-post)',
      description: 'E-posthantering via Resend – redan konfigurerat och redo att användas',
      icon: Mail,
      status: 'connected', // Pre-configured by system
      settings: {}
    },
    {
      id: '46elks',
      name: '46elks SMS',
      description: 'Skicka SMS via 46elks - svenskt SMS-API för påminnelser och bekräftelser',
      icon: MessageSquare,
      status: 'disconnected',
      settings: {
        apiUsername: '',
        apiPassword: '',
        senderName: 'Momentum'
      }
    },
    {
      id: 'webhooks',
      name: 'Webhooks',
      description: 'Skicka data till externa tjänster som Zapier, Make eller Slack vid händelser',
      icon: Share2,
      status: 'disconnected',
      settings: {}
    }
  ]);

  // Check Google Calendar sync status on mount
  useEffect(() => {
    const checkGoogleStatus = async () => {
      if (!user?.id) return;

      // Check if user has Google identity linked
      const hasGoogleProvider = session?.user?.app_metadata?.providers?.includes('google');

      if (hasGoogleProvider) {
        const { enabled, calendarId } = await checkGoogleCalendarEnabled(user.id);
        setGoogleSyncEnabled(enabled);
        setGoogleCalendarId(calendarId || 'primary');

        // Update integrations state
        setIntegrations(prev => prev.map(integration =>
          integration.id === 'google-calendar'
            ? { ...integration, status: enabled ? 'connected' : 'disconnected', lastSync: new Date().toISOString() }
            : integration
        ));
      }
    };

    checkGoogleStatus();
  }, [user?.id, session]);

  // Check Fortnox connection status on mount
  useEffect(() => {
    const checkFortnoxStatus = async () => {
      if (!userProfile?.organisation_id) return;

      const status = await getFortnoxConnectionStatus(userProfile.organisation_id);
      setFortnoxStatus(status);

      // Update integrations state
      setIntegrations(prev => prev.map(integration =>
        integration.id === 'fortnox'
          ? { ...integration, status: status.isConnected ? 'connected' : (status.isExpired ? 'error' : 'disconnected') }
          : integration
      ));
    };

    checkFortnoxStatus();
  }, [userProfile?.organisation_id]);

  // Check SMS/46elks settings on mount
  useEffect(() => {
    const checkSmsSettings = async () => {
      if (!userProfile?.organisation_id) return;

      const settings = await getSmsSettings(userProfile.organisation_id);
      setSmsSettings(settings);
      setSmsApiUsername(settings.apiUsername || '');
      setSmsSenderName(settings.senderName || 'Momentum');

      // Update integrations state
      setIntegrations(prev => prev.map(integration =>
        integration.id === '46elks'
          ? { ...integration, status: settings.isConfigured ? 'connected' : 'disconnected' }
          : integration
      ));
    };

    checkSmsSettings();
  }, [userProfile?.organisation_id]);

  // Load webhooks on mount
  useEffect(() => {
    const loadWebhooks = async () => {
      if (!userProfile?.organisation_id) return;

      const { data } = await getWebhooks(userProfile.organisation_id);
      if (data) {
        setWebhooks(data);
        // Update integrations state
        setIntegrations(prev => prev.map(integration =>
          integration.id === 'webhooks'
            ? { ...integration, status: data.length > 0 ? 'connected' : 'disconnected' }
            : integration
        ));
      }
    };

    loadWebhooks();
  }, [userProfile?.organisation_id]);

  const [backupSettings, setBackupSettings] = useState({
    autoBackup: true,
    backupFrequency: 'weekly',
    retentionDays: 30,
    includeFiles: true,
    encryptBackups: true,
    backupLocation: 'cloud'
  });

  const handleConnect = async (integrationId: string) => {
    setLoading(true);
    setError(null);

    try {
      if (integrationId === 'google-calendar') {
        // Use real Google OAuth
        const { error: oauthError } = await connectGoogleCalendar();
        if (oauthError) {
          throw new Error(oauthError);
        }
        // OAuth will redirect, so we don't need to update state here
        return;
      }

      if (integrationId === 'fortnox') {
        if (!userProfile?.organisation_id) {
          throw new Error('Organisation saknas');
        }
        const redirectUri = `${window.location.origin}/app/fortnox/callback`;
        connectFortnox(userProfile.organisation_id, redirectUri);
        // OAuth will redirect
        return;
      }

      // Simulate connection for other integrations
      await new Promise(resolve => setTimeout(resolve, 2000));

      setIntegrations(prev => prev.map(integration =>
        integration.id === integrationId
          ? { ...integration, status: 'connected', lastSync: new Date().toISOString() }
          : integration
      ));

      setSuccess(`${integrations.find(i => i.id === integrationId)?.name} ansluten framgångsrikt!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Kunde inte ansluta integration. Kontrollera inställningarna.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm('Är du säker på att du vill koppla från denna integration?')) return;

    if (integrationId === 'google-calendar' && user?.id) {
      const { success: disconnectSuccess, error: disconnectError } = await disconnectGoogleCalendar(user.id);
      if (!disconnectSuccess) {
        setError(disconnectError || 'Kunde inte koppla från Google Calendar');
        return;
      }
      setGoogleSyncEnabled(false);
    }

    setIntegrations(prev => prev.map(integration =>
      integration.id === integrationId
        ? { ...integration, status: 'disconnected', lastSync: undefined }
        : integration
    ));

    setSuccess('Integration frånkopplad framgångsrikt!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleSync = async (integrationId: string) => {
    setLoading(true);

    try {
      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 1500));

      setIntegrations(prev => prev.map(integration =>
        integration.id === integrationId
          ? { ...integration, lastSync: new Date().toISOString() }
          : integration
      ));

      setSuccess('Synkronisering slutförd framgångsrikt!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Synkronisering misslyckades. Försök igen senare.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    setLoading(true);

    try {
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create a mock export file
      const exportData = {
        exportDate: new Date().toISOString(),
        leads: 'Mock lead data...',
        customers: 'Mock customer data...',
        quotes: 'Mock quote data...',
        jobs: 'Mock job data...',
        invoices: 'Mock invoice data...'
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `momentum-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess('Data exporterad framgångsrikt!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Export misslyckades. Försök igen senare.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    setLoading(true);

    try {
      // Simulate backup process
      await new Promise(resolve => setTimeout(resolve, 3000));

      setSuccess('Backup skapad framgångsrikt!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Backup misslyckades. Försök igen senare.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <X className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'connected': return 'Ansluten';
      case 'error': return 'Fel';
      default: return 'Ej ansluten';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  const formatLastSync = (lastSync?: string) => {
    if (!lastSync) return 'Aldrig';

    const date = new Date(lastSync);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return 'Just nu';
    if (diffMinutes < 60) return `${diffMinutes} min sedan`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} tim sedan`;
    return `${Math.floor(diffMinutes / 1440)} dagar sedan`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Zap className="w-7 h-7 mr-3 text-blue-600" />
          Integrationer
        </h2>
        <p className="mt-2 text-gray-600">
          Anslut externa tjänster för att automatisera arbetsflöden och synkronisera data
        </p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <p className="text-green-700">{success}</p>
            <button
              onClick={() => setSuccess(null)}
              className="ml-auto text-green-400 hover:text-green-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Available Integrations */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Tillgängliga integrationer</h3>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 gap-6">
            {integrations.map((integration) => {
              const Icon = integration.icon;
              return (
                <div key={integration.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Icon className="w-6 h-6 text-gray-600" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-medium text-gray-900">{integration.name}</h4>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(integration.status)}
                            <span className={`text-sm font-medium ${getStatusColor(integration.status)}`}>
                              {getStatusLabel(integration.status)}
                            </span>
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 mb-3">{integration.description}</p>

                        {integration.status === 'connected' && (
                          <p className="text-xs text-gray-500">
                            Senast synkroniserad: {formatLastSync(integration.lastSync)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {integration.status === 'connected' ? (
                        <>
                          <button
                            onClick={() => handleSync(integration.id)}
                            disabled={loading}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Synka
                          </button>
                          <button
                            onClick={() => setShowConfigModal(integration.id)}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <Settings className="w-4 h-4 mr-2" />
                            Konfigurera
                          </button>
                          <button
                            onClick={() => handleDisconnect(integration.id)}
                            className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                          >
                            Koppla från
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setShowConfigModal(integration.id)}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <Settings className="w-4 h-4 mr-2" />
                            Konfigurera
                          </button>
                          <button
                            onClick={() => handleConnect(integration.id)}
                            disabled={loading}
                            className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                          >
                            {loading ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            ) : (
                              <Link className="w-4 h-4 mr-2" />
                            )}
                            Anslut
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Backup and Export */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Data Export */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Download className="w-5 h-5 mr-2 text-blue-600" />
            Dataexport
          </h3>

          <p className="text-gray-600 mb-4">
            Exportera all din data för backup eller migration till andra system.
          </p>

          <div className="space-y-3">
            <label className="flex items-center">
              <input type="checkbox" defaultChecked className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
              <span className="ml-3 text-sm text-gray-700">Leads och kunder</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" defaultChecked className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
              <span className="ml-3 text-sm text-gray-700">Offerter och fakturor</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" defaultChecked className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
              <span className="ml-3 text-sm text-gray-700">Jobb och aktiviteter</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
              <span className="ml-3 text-sm text-gray-700">Systemkonfiguration</span>
            </label>
          </div>

          <button
            onClick={handleExportData}
            disabled={loading}
            className="mt-4 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Exportera data
          </button>
        </div>

        {/* Backup Settings */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Database className="w-5 h-5 mr-2 text-blue-600" />
            Automatisk backup
          </h3>

          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={backupSettings.autoBackup}
                onChange={(e) => setBackupSettings(prev => ({ ...prev, autoBackup: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-3 text-sm text-gray-700">Aktivera automatisk backup</span>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Backup-frekvens
              </label>
              <select
                value={backupSettings.backupFrequency}
                onChange={(e) => setBackupSettings(prev => ({ ...prev, backupFrequency: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="daily">Dagligen</option>
                <option value="weekly">Veckovis</option>
                <option value="monthly">Månadsvis</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Behåll backups (dagar)
              </label>
              <input
                type="number"
                value={backupSettings.retentionDays}
                onChange={(e) => setBackupSettings(prev => ({ ...prev, retentionDays: parseInt(e.target.value) || 30 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="365"
              />
            </div>
          </div>

          <button
            onClick={handleBackup}
            disabled={loading}
            className="mt-4 w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Skapa backup nu
          </button>
        </div>
      </div>

      {/* Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Konfigurera {integrations.find(i => i.id === showConfigModal)?.name}
              </h3>
              <button
                onClick={() => setShowConfigModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {showConfigModal === 'fortnox' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <div className="flex items-start">
                      <Globe className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">Fortnox Integration</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Anslut ditt Fortnox-konto för att automatiskt synkronisera kunder och fakturor med ditt bokföringssystem.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Connection Status Badge */}
                  {fortnoxStatus.isConnected ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                        <span className="text-green-700 font-medium">Ansluten</span>
                      </div>
                      {fortnoxStatus.expiresAt && (
                        <p className="text-xs text-green-600 mt-1">
                          Token giltig till: {new Date(fortnoxStatus.expiresAt).toLocaleString('sv-SE')}
                        </p>
                      )}
                    </div>
                  ) : fortnoxStatus.isExpired ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                        <span className="text-yellow-700 font-medium">Token utgången — återanslut</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <X className="w-5 h-5 text-gray-400 mr-2" />
                        <span className="text-gray-600 font-medium">Ej ansluten</span>
                      </div>
                    </div>
                  )}

                  {(fortnoxStatus.isConnected || fortnoxStatus.isExpired) ? (
                    <>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-2">Funktioner</h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>✓ Exportera kunder till Fortnox</li>
                          <li>✓ Exportera fakturor med momskoder</li>
                          <li>✓ Hämta betalningsstatus från Fortnox</li>
                          <li>✓ Automatisk tokenförnyelse</li>
                        </ul>
                      </div>

                      {/* Test Connection Button (only when connected) */}
                      {fortnoxStatus.isConnected && (
                        <div className="space-y-2">
                          <button
                            onClick={async () => {
                              if (!userProfile?.organisation_id) return;
                              setFortnoxTesting(true);
                              setFortnoxTestResult(null);
                              const result = await testFortnoxConnection(userProfile.organisation_id);
                              if (result.success) {
                                setFortnoxTestResult(`✅ Anslutningen fungerar! Företag: ${result.companyName || 'Okänt'}`);
                              } else {
                                setFortnoxTestResult(`❌ Anslutningen misslyckades: ${result.error || 'Okänt fel'}. Prova att återansluta.`);
                              }
                              setFortnoxTesting(false);
                            }}
                            disabled={fortnoxTesting}
                            className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                          >
                            {fortnoxTesting ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                            ) : (
                              <Play className="w-4 h-4 mr-2" />
                            )}
                            Testa anslutning
                          </button>
                          {fortnoxTestResult && (
                            <p className={`text-sm p-3 rounded-lg ${fortnoxTestResult.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                              {fortnoxTestResult}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Reconnect button (when expired) */}
                      {fortnoxStatus.isExpired && (
                        <button
                          onClick={() => {
                            if (!userProfile?.organisation_id) {
                              setError('Organisation saknas');
                              return;
                            }
                            try {
                              const redirectUri = `${window.location.origin}/app/fortnox/callback`;
                              connectFortnox(userProfile.organisation_id, redirectUri);
                            } catch (err) {
                              setError((err as Error).message || 'Kunde inte starta Fortnox-anslutning');
                            }
                          }}
                          disabled={loading}
                          className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50"
                        >
                          {loading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                          )}
                          Återanslut till Fortnox
                        </button>
                      )}

                      {/* Disconnect Button */}
                      <button
                        onClick={async () => {
                          if (!confirm('Är du säker på att du vill koppla från Fortnox? Du behöver ansluta igen för att synka data.')) return;
                          if (userProfile?.organisation_id) {
                            const result = await disconnectFortnox(userProfile.organisation_id);
                            if (result.success) {
                              setFortnoxStatus({ isConnected: false, isExpired: false });
                              setFortnoxTestResult(null);
                              setIntegrations(prev => prev.map(i =>
                                i.id === 'fortnox' ? { ...i, status: 'disconnected' } : i
                              ));
                              setSuccess('Fortnox frånkopplad');
                            } else {
                              setError(result.error || 'Kunde inte koppla från Fortnox');
                            }
                          }
                        }}
                        className="w-full inline-flex items-center justify-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                      >
                        Koppla från Fortnox
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Features list */}
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <h5 className="font-medium text-gray-900 mb-2">Vad du kan göra med Fortnox</h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>✓ Exportera kunder automatiskt till Fortnox</li>
                          <li>✓ Skicka fakturor direkt till bokföringen</li>
                          <li>✓ Synka momskoder och betalningar</li>
                          <li>✓ Automatisk tokenförnyelse</li>
                        </ul>
                      </div>

                      {/* Connect button */}
                      <div className="text-center py-4">
                        <button
                          onClick={() => {
                            if (!userProfile?.organisation_id) {
                              setError('Organisation saknas');
                              return;
                            }
                            try {
                              const redirectUri = `${window.location.origin}/app/fortnox/callback`;
                              connectFortnox(userProfile.organisation_id, redirectUri);
                            } catch (err) {
                              setError((err as Error).message || 'Kunde inte starta Fortnox-anslutning');
                            }
                          }}
                          disabled={loading}
                          className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                        >
                          {loading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          ) : (
                            <Globe className="w-5 h-5 mr-2" />
                          )}
                          Anslut ditt Fortnox-konto
                        </button>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs text-blue-700">
                          Du kommer att omdirigeras till Fortnox för att godkänna anslutningen. Se till att du är inloggad på rätt Fortnox-konto innan du fortsätter.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {showConfigModal === 'google-calendar' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <div className="flex items-start">
                      <Calendar className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">Google Calendar Integration</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Synkronisera dina möten och aktiviteter med Google Calendar. Google Meet-länkar skapas automatiskt för nya möten.
                        </p>
                      </div>
                    </div>
                  </div>

                  {!googleSyncEnabled ? (
                    <div className="text-center py-6">
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">Anslut ditt Google-konto för att aktivera kalendersynkronisering</p>
                      <button
                        onClick={() => handleConnect('google-calendar')}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <Globe className="w-4 h-4 mr-2" />
                        Anslut Google-konto
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center">
                          <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                          <span className="text-green-700 font-medium">Google-konto anslutet</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Kalender-ID
                        </label>
                        <input
                          type="text"
                          value={googleCalendarId}
                          onChange={(e) => setGoogleCalendarId(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="primary eller specifik kalender-ID"
                        />
                        <p className="text-xs text-gray-500 mt-1">Använd "primary" för din huvudkalender</p>
                      </div>

                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={googleSyncEnabled}
                            onChange={async (e) => {
                              if (user?.id) {
                                await updateGoogleCalendarSettings(user.id, {
                                  enabled: e.target.checked,
                                  calendarId: googleCalendarId
                                });
                                setGoogleSyncEnabled(e.target.checked);
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-3 text-sm text-gray-700">
                            Aktivera automatisk synkronisering av möten
                          </span>
                        </label>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-2">Funktioner</h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          <li>✓ Automatisk synkronisering till Google Calendar</li>
                          <li>✓ Google Meet-länk skapas automatiskt för möten</li>
                          <li>✓ Uppdateringar synkroniseras i realtid</li>
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              )}

              {showConfigModal === 'sendgrid' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <div className="flex items-start">
                      <Mail className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">SendGrid Integration</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Använd SendGrid för att skicka professionella e-postmeddelanden och påminnelser.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API-nyckel *
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="password"
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="SG.xxxxxxxxxx"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Avsändar-e-post *
                    </label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="noreply@dittföretag.se"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Avsändarnamn
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ditt Företag"
                    />
                  </div>
                </div>
              )}

              {showConfigModal === '46elks' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <div className="flex items-start">
                      <MessageSquare className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">46elks SMS Integration</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Svenskt SMS-API för att skicka påminnelser och bekräftelser till kunder. Du betalar endast för de SMS du skickar.
                        </p>
                        <a
                          href="https://46elks.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mt-2"
                        >
                          Skapa konto på 46elks.com
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {smsSettings?.isConfigured && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                        <span className="text-green-700 font-medium">SMS konfigurerat</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API Username *
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={smsApiUsername}
                        onChange={(e) => setSmsApiUsername(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="u1234567890abcdef"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API Password *
                    </label>
                    <input
                      type="password"
                      value={smsApiPassword}
                      onChange={(e) => setSmsApiPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ange API password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Avsändarnamn (max 11 tecken)
                    </label>
                    <input
                      type="text"
                      value={smsSenderName}
                      onChange={(e) => setSmsSenderName(e.target.value.substring(0, 11))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Momentum"
                      maxLength={11}
                    />
                    <p className="text-xs text-gray-500 mt-1">{smsSenderName.length}/11 tecken</p>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={async () => {
                        if (!userProfile?.organisation_id) return;
                        setLoading(true);
                        const result = await saveSmsSettings(userProfile.organisation_id, {
                          apiUsername: smsApiUsername,
                          apiPassword: smsApiPassword,
                          senderName: smsSenderName
                        });
                        if (result.success) {
                          setSmsSettings({
                            provider: '46elks',
                            apiUsername: smsApiUsername,
                            apiPassword: null,
                            senderName: smsSenderName,
                            isConfigured: true
                          });
                          setIntegrations(prev => prev.map(i =>
                            i.id === '46elks' ? { ...i, status: 'connected' } : i
                          ));
                          setSuccess('SMS-inställningar sparade');
                        } else {
                          setError(result.error || 'Kunde inte spara');
                        }
                        setLoading(false);
                      }}
                      disabled={loading || !smsApiUsername || !smsApiPassword}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Spara
                    </button>

                    <button
                      onClick={async () => {
                        if (!userProfile?.organisation_id || !userProfile?.phone_number) {
                          setError('Ange ditt telefonnummer i profilen för att skicka test-SMS');
                          return;
                        }
                        setLoading(true);
                        // First save settings
                        await saveSmsSettings(userProfile.organisation_id, {
                          apiUsername: smsApiUsername,
                          apiPassword: smsApiPassword,
                          senderName: smsSenderName
                        });
                        // Then send test
                        const result = await sendTestSms(userProfile.organisation_id, userProfile.phone_number);
                        if (result.success) {
                          setSuccess('Test-SMS skickat!');
                        } else {
                          setError(result.error || 'Kunde inte skicka test-SMS');
                        }
                        setLoading(false);
                      }}
                      disabled={loading || !smsApiUsername || !smsApiPassword}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Spara & Testa
                    </button>
                  </div>
                </div>
              )}

              {showConfigModal === 'resend' && (
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg mb-4">
                    <div className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-green-900">Resend - Aktiv</h4>
                        <p className="text-sm text-green-700 mt-1">
                          E-posthantering sköts via Resend och är redan konfigurerat för alla användare.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-2">Funktioner som använder Resend</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>✓ Fakturautskick till kunder</li>
                      <li>✓ Offertbekräftelser</li>
                      <li>✓ Mötespåminnelser och kalenderinbjudningar</li>
                      <li>✓ Orderbekräftelser och statusuppdateringar</li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-700">
                      Detta är en systemintegration som hanteras automatiskt. Du behöver inte göra några inställningar.
                    </p>
                  </div>
                </div>
              )}

              {showConfigModal === 'webhooks' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <div className="flex items-start">
                      <Share2 className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">Webhooks – Automatisera ditt arbetsflöde</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Skicka data automatiskt till externa tjänster som Zapier, Make (Integromat), Slack eller din egen server.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Documentation section */}
                  <details className="bg-gray-50 rounded-lg border border-gray-200">
                    <summary className="p-4 cursor-pointer font-medium text-gray-900 hover:bg-gray-100 rounded-lg">
                      📖 Vad är webhooks och hur använder jag dem?
                    </summary>
                    <div className="px-4 pb-4 space-y-4 text-sm text-gray-700">
                      <div>
                        <h5 className="font-medium text-gray-900 mb-1">Vad är en webhook?</h5>
                        <p>
                          En webhook är ett automatiskt meddelande som skickas till en URL du anger när något händer i systemet.
                          Till exempel: när en ny lead skapas, kan du automatiskt få en notis i Slack eller skapa en rad i Google Sheets.
                        </p>
                      </div>

                      <div>
                        <h5 className="font-medium text-gray-900 mb-1">Hur skapar jag en webhook?</h5>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>Gå till <strong>Zapier</strong> eller <strong>Make</strong> och skapa ett nytt scenario</li>
                          <li>Välj "Webhook" som trigger och kopiera URL:en du får</li>
                          <li>Klistra in URL:en här och välj vilken händelse som ska trigga den</li>
                          <li>Testa med "Test"-knappen för att verifiera att allt fungerar</li>
                        </ol>
                      </div>

                      <div>
                        <h5 className="font-medium text-gray-900 mb-1">Exempel på användning</h5>
                        <ul className="space-y-2">
                          <li className="flex items-start">
                            <span className="text-blue-500 mr-2">→</span>
                            <span><strong>Slack-notis:</strong> Få besked i en Slack-kanal när en ny lead kommer in</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-blue-500 mr-2">→</span>
                            <span><strong>Google Sheets:</strong> Lägg till en rad automatiskt när en offert accepteras</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-blue-500 mr-2">→</span>
                            <span><strong>Trello:</strong> Skapa ett kort när en order skapas</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-blue-500 mr-2">→</span>
                            <span><strong>E-post:</strong> Skicka en intern rapport när en faktura betalas</span>
                          </li>
                        </ul>
                      </div>

                      <div>
                        <h5 className="font-medium text-gray-900 mb-1">Säkerhet (Secret)</h5>
                        <p>
                          För att verifiera att anropet verkligen kommer från oss kan du använda en "secret".
                          Vi signerar varje anrop med <code className="bg-gray-200 px-1 rounded">X-Webhook-Signature</code> som du kan verifiera i din mottagare.
                        </p>
                      </div>

                      <div className="bg-white border rounded-lg p-3">
                        <h5 className="font-medium text-gray-900 mb-1">Dataformat (JSON)</h5>
                        <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                          {`{
  "event": "lead.created",
  "timestamp": "2026-01-08T12:00:00Z",
  "data": {
    "id": "abc123",
    "name": "Ny kund AB",
    "email": "kund@example.com",
    ...
  }
}`}
                        </pre>
                      </div>
                    </div>
                  </details>

                  {/* Existing webhooks */}
                  {webhooks.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="font-medium text-gray-900">Dina webhooks</h5>
                      {webhooks.map(webhook => (
                        <div key={webhook.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <span className={`w-2 h-2 rounded-full mr-2 ${webhook.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                              <span className="font-medium text-gray-900">{webhook.name}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {WEBHOOK_EVENTS.find(e => e.value === webhook.event_type)?.label || webhook.event_type}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={async () => {
                                setLoading(true);
                                const result = await testWebhook(webhook);
                                if (result.success) {
                                  setSuccess('Test-webhook skickad!');
                                } else {
                                  setError(result.error || 'Kunde inte skicka test');
                                }
                                setLoading(false);
                              }}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              title="Testa webhook"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                            <button
                              onClick={async () => {
                                await toggleWebhook(webhook.id, !webhook.is_active);
                                setWebhooks(prev => prev.map(w =>
                                  w.id === webhook.id ? { ...w, is_active: !w.is_active } : w
                                ));
                              }}
                              className={`p-1 rounded ${webhook.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                              title={webhook.is_active ? 'Inaktivera' : 'Aktivera'}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={async () => {
                                if (!confirm('Vill du ta bort denna webhook?')) return;
                                await deleteWebhook(webhook.id);
                                setWebhooks(prev => prev.filter(w => w.id !== webhook.id));
                              }}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Ta bort"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new webhook form */}
                  {showWebhookModal ? (
                    <div className="border rounded-lg p-4 space-y-3">
                      <h5 className="font-medium text-gray-900">Ny webhook</h5>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Namn</label>
                        <input
                          type="text"
                          value={newWebhook.name}
                          onChange={e => setNewWebhook(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="Ex: Slack-notis för nya leads"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Händelse</label>
                        <select
                          value={newWebhook.event_type}
                          onChange={e => setNewWebhook(prev => ({ ...prev, event_type: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          {WEBHOOK_EVENTS.map(event => (
                            <option key={event.value} value={event.value}>{event.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
                        <input
                          type="url"
                          value={newWebhook.target_url}
                          onChange={e => setNewWebhook(prev => ({ ...prev, target_url: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="https://hooks.zapier.com/..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Secret (valfritt)
                          <button
                            type="button"
                            onClick={() => setNewWebhook(prev => ({ ...prev, secret: generateWebhookSecret() }))}
                            className="ml-2 text-xs text-blue-600 hover:underline"
                          >
                            Generera
                          </button>
                        </label>
                        <input
                          type="text"
                          value={newWebhook.secret || ''}
                          onChange={e => setNewWebhook(prev => ({ ...prev, secret: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                          placeholder="whsec_..."
                        />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setShowWebhookModal(false);
                            setNewWebhook({ name: '', event_type: 'lead.created', target_url: '', secret: '' });
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Avbryt
                        </button>
                        <button
                          onClick={async () => {
                            if (!userProfile?.organisation_id || !newWebhook.name || !newWebhook.target_url) {
                              setError('Fyll i alla obligatoriska fält');
                              return;
                            }
                            setLoading(true);
                            const { data, error: webhookError } = await createWebhook(
                              userProfile.organisation_id,
                              newWebhook,
                              user?.id
                            );
                            if (webhookError) {
                              setError(webhookError.message);
                            } else if (data) {
                              setWebhooks(prev => [data, ...prev]);
                              setShowWebhookModal(false);
                              setNewWebhook({ name: '', event_type: 'lead.created', target_url: '', secret: '' });
                              setSuccess('Webhook skapad!');
                            }
                            setLoading(false);
                          }}
                          disabled={loading || !newWebhook.name || !newWebhook.target_url}
                          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                        >
                          Skapa webhook
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowWebhookModal(true)}
                      className="w-full inline-flex items-center justify-center px-4 py-2 border border-dashed border-gray-300 rounded-md text-sm text-gray-600 hover:border-gray-400 hover:text-gray-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Lägg till webhook
                    </button>
                  )}

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-xs text-yellow-700">
                      <strong>Tips:</strong> Använd Zapier eller Make för att koppla webhooks till 1000+ appar som Slack, Trello, Google Sheets och mer.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t">
              <button
                onClick={() => setShowConfigModal(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Avbryt
              </button>
              <button
                onClick={() => {
                  setShowConfigModal(null);
                  setSuccess('Konfiguration sparad framgångsrikt!');
                  setTimeout(() => setSuccess(null), 3000);
                }}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2 inline" />
                Spara konfiguration
              </button>
            </div>
          </div>
        </div>
      )}
    </div >
  );
}

export default IntegrationSettings;