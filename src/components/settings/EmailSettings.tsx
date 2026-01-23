import React, { useState, useEffect } from 'react';
import { Mail, Server, Lock, CheckCircle, AlertCircle, Loader2, Eye, EyeOff, Trash2, Sparkles, ExternalLink, ChevronDown, ChevronRight, HelpCircle, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface SmtpSettings {
    smtp_host: string;
    smtp_port: number;
    smtp_user: string;
    smtp_pass: string;
    provider: string;
}

// Pre-configured email provider settings for Swedish market
const EMAIL_PROVIDERS = [
    {
        id: 'gmail',
        name: 'Gmail',
        icon: '📧',
        host: 'smtp.gmail.com',
        port: 587,
        requiresAppPassword: true,
        helpUrl: 'https://support.google.com/accounts/answer/185833',
        helpText: 'Kräver app-lösenord (inte ditt vanliga lösenord)',
        instructions: [
            'Gå till myaccount.google.com',
            'Välj "Säkerhet" i vänstermenyn',
            'Aktivera 2-stegsverifiering om det inte redan är aktivt',
            'Sök efter "App-lösenord" och klicka på det',
            'Välj "E-post" och "Windows-dator" (eller annat)',
            'Klicka "Generera" och kopiera det 16-tecken långa lösenordet',
            'Klistra in det i lösenordsfältet nedan'
        ]
    },
    {
        id: 'outlook',
        name: 'Outlook / Microsoft 365',
        icon: '📬',
        host: 'smtp.office365.com',
        port: 587,
        requiresAppPassword: false,
        helpUrl: 'https://support.microsoft.com/en-us/account-billing/manage-app-passwords-for-two-step-verification-d6dc8c6d-4bf7-4851-ad95-6d07799387e9',
        helpText: 'Använd ditt vanliga lösenord (eller app-lösenord om du har 2FA)',
        instructions: [
            'Om du har 2-faktorautentisering aktiverat, skapa ett app-lösenord',
            'Gå till account.microsoft.com',
            'Välj "Säkerhet" → "Avancerade säkerhetsalternativ"',
            'Under "App-lösenord", klicka "Skapa ett nytt applösenord"',
            'Kopiera lösenordet och klistra in det nedan'
        ]
    },
    {
        id: 'loopia',
        name: 'Loopia',
        icon: '🇸🇪',
        host: 'mailcluster.loopia.se',
        port: 587,
        requiresAppPassword: false,
        helpUrl: 'https://support.loopia.se/wiki/smtp-installningar/',
        helpText: 'Använd din e-postadress och lösenord från Loopia',
        instructions: [
            'Logga in på Loopia kundzon',
            'Din SMTP-server är alltid mailcluster.loopia.se',
            'Använd din fullständiga e-postadress som användarnamn',
            'Använd samma lösenord som för din e-post'
        ]
    },
    {
        id: 'onecom',
        name: 'One.com',
        icon: '🌐',
        host: 'send.one.com',
        port: 587,
        requiresAppPassword: false,
        helpUrl: 'https://help.one.com/hc/sv/articles/115005594685',
        helpText: 'Använd din e-postadress och lösenord från One.com',
        instructions: [
            'Logga in på One.com kontrollpanel',
            'SMTP-servern är send.one.com',
            'Använd din fullständiga e-postadress som användarnamn',
            'Använd samma lösenord som för webbmail'
        ]
    },
    {
        id: 'binero',
        name: 'Binero',
        icon: '💼',
        host: 'smtp.binero.se',
        port: 587,
        requiresAppPassword: false,
        helpUrl: 'https://www.binero.se/support',
        helpText: 'Använd din e-postadress och lösenord från Binero',
        instructions: [
            'SMTP-servern är smtp.binero.se',
            'Använd din fullständiga e-postadress som användarnamn',
            'Använd samma lösenord som för din e-post'
        ]
    },
    {
        id: 'bahnhof',
        name: 'Bahnhof',
        icon: '🔒',
        host: 'outgoing.bahnhof.se',
        port: 587,
        requiresAppPassword: false,
        helpUrl: 'https://www.bahnhof.se',
        helpText: 'Använd din e-postadress och lösenord från Bahnhof',
        instructions: [
            'SMTP-servern är outgoing.bahnhof.se',
            'Använd din fullständiga e-postadress som användarnamn',
            'Använd samma lösenord som för din e-post'
        ]
    },
    {
        id: 'custom',
        name: 'Annan leverantör',
        icon: '⚙️',
        host: '',
        port: 587,
        requiresAppPassword: false,
        helpUrl: null,
        helpText: 'Ange dina egna SMTP-inställningar manuellt',
        instructions: [
            'Kontakta din e-postleverantör för SMTP-inställningar',
            'Vanliga SMTP-portar är 587 (TLS) eller 465 (SSL)',
            'Användarnamn är oftast din fullständiga e-postadress'
        ]
    }
];

export default function EmailSettings() {
    const [settings, setSettings] = useState<SmtpSettings>({
        smtp_host: '',
        smtp_port: 587,
        smtp_user: '',
        smtp_pass: '',
        provider: 'custom'
    });
    const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
    const [hasExistingSettings, setHasExistingSettings] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Load existing settings on mount
    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setMessage({ type: 'error', text: 'Du måste vara inloggad för att hantera e-postinställningar.' });
                return;
            }

            const { data, error } = await supabase
                .from('user_smtp_settings')
                .select('smtp_host, smtp_port, smtp_user, smtp_pass, provider')
                .eq('user_id', user.id)
                .single();

            if (data && !error) {
                setSettings({
                    smtp_host: data.smtp_host,
                    smtp_port: data.smtp_port,
                    smtp_user: data.smtp_user,
                    smtp_pass: data.smtp_pass,
                    provider: data.provider || 'custom'
                });
                setHasExistingSettings(true);

                // Use saved provider or detect from host
                if (data.provider) {
                    setSelectedProvider(data.provider);
                } else {
                    const provider = EMAIL_PROVIDERS.find(p => p.host === data.smtp_host);
                    setSelectedProvider(provider?.id || 'custom');
                }
                setShowAdvanced(true);
            }
        } catch (error) {
            console.error('Error loading SMTP settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleProviderSelect = (providerId: string) => {
        const provider = EMAIL_PROVIDERS.find(p => p.id === providerId);
        if (provider) {
            setSelectedProvider(providerId);
            setSettings(prev => ({
                ...prev,
                smtp_host: provider.host,
                smtp_port: provider.port,
                provider: providerId
            }));
            setShowAdvanced(true);
            setShowInstructions(true);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setMessage(null);

            // Validate required fields
            if (!settings.smtp_host || !settings.smtp_port || !settings.smtp_user || !settings.smtp_pass) {
                setMessage({ type: 'error', text: 'Alla fält är obligatoriska.' });
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setMessage({ type: 'error', text: 'Du måste vara inloggad.' });
                return;
            }

            const { error } = await supabase
                .from('user_smtp_settings')
                .upsert({
                    user_id: user.id,
                    smtp_host: settings.smtp_host,
                    smtp_port: settings.smtp_port,
                    smtp_user: settings.smtp_user,
                    smtp_pass: settings.smtp_pass,
                    provider: selectedProvider || 'custom'
                }, { onConflict: 'user_id' });

            if (error) {
                console.error('Error saving SMTP settings:', error);
                setMessage({ type: 'error', text: 'Kunde inte spara inställningarna. Försök igen.' });
                return;
            }

            setHasExistingSettings(true);
            setMessage({ type: 'success', text: 'E-postinställningar sparade! Vi rekommenderar att testa anslutningen.' });
        } catch (error) {
            console.error('Error saving SMTP settings:', error);
            setMessage({ type: 'error', text: 'Ett fel uppstod. Försök igen.' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Är du säker på att du vill ta bort dina SMTP-inställningar? Systemet kommer att använda standard-e-post istället.')) {
            return;
        }

        try {
            setDeleting(true);
            setMessage(null);

            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setMessage({ type: 'error', text: 'Du måste vara inloggad.' });
                return;
            }

            const { error } = await supabase
                .from('user_smtp_settings')
                .delete()
                .eq('user_id', user.id);

            if (error) {
                console.error('Error deleting SMTP settings:', error);
                setMessage({ type: 'error', text: 'Kunde inte ta bort inställningarna. Försök igen.' });
                return;
            }

            setSettings({
                smtp_host: '',
                smtp_port: 587,
                smtp_user: '',
                smtp_pass: '',
                provider: 'custom'
            });
            setHasExistingSettings(false);
            setSelectedProvider(null);
            setShowAdvanced(false);
            setShowInstructions(false);
            setMessage({ type: 'success', text: 'SMTP-inställningar borttagna. Systemet använder nu standard-e-post.' });
        } catch (error) {
            console.error('Error deleting SMTP settings:', error);
            setMessage({ type: 'error', text: 'Ett fel uppstod. Försök igen.' });
        } finally {
            setDeleting(false);
        }
    };

    const handleTestConnection = async () => {
        try {
            setTesting(true);
            setMessage(null);

            // Validate required fields first
            if (!settings.smtp_host || !settings.smtp_port || !settings.smtp_user || !settings.smtp_pass) {
                setMessage({ type: 'error', text: 'Fyll i alla fält innan du testar anslutningen.' });
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setMessage({ type: 'error', text: 'Du måste vara inloggad.' });
                return;
            }

            // Send a test email to the user's own email
            const response = await supabase.functions.invoke('send-email', {
                body: {
                    to: user.email,
                    subject: 'MomentumCRM - Test av e-postanslutning ✅',
                    content: 'Detta är ett testmeddelande för att verifiera att din e-postkonfiguration fungerar korrekt.',
                    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #10b981;">✅ E-posttest lyckades!</h2>
              <p>Din SMTP-konfiguration fungerar korrekt.</p>
              <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Leverantör:</strong> ${EMAIL_PROVIDERS.find(p => p.id === selectedProvider)?.name || 'Egen SMTP'}</p>
                <p style="margin: 8px 0 0 0;"><strong>Server:</strong> ${settings.smtp_host}:${settings.smtp_port}</p>
                <p style="margin: 8px 0 0 0;"><strong>Användare:</strong> ${settings.smtp_user}</p>
              </div>
              <p>Du kan nu skicka e-post från MomentumCRM via din egen e-postserver!</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
              <p style="color: #6b7280; font-size: 14px;">Detta meddelande skickades från MomentumCRM.</p>
            </div>
          `,
                    from_name: 'MomentumCRM Test'
                }
            });

            if (response.error) {
                console.error('Test email failed:', response.error);
                setMessage({ type: 'error', text: `Testet misslyckades: ${response.error.message}` });
                return;
            }

            if (response.data?.success) {
                setMessage({ type: 'success', text: `Testet lyckades! Ett testmeddelande har skickats till ${user.email}.` });
            } else {
                setMessage({ type: 'error', text: response.data?.error || 'Kunde inte skicka testmeddelande.' });
            }
        } catch (error) {
            console.error('Error testing connection:', error);
            setMessage({ type: 'error', text: 'Ett fel uppstod vid test av anslutningen.' });
        } finally {
            setTesting(false);
        }
    };

    const currentProvider = EMAIL_PROVIDERS.find(p => p.id === selectedProvider);

    if (loading) {
        return (
            <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">Laddar e-postinställningar...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <Mail className="w-6 h-6 text-blue-600 mr-3" />
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">E-postintegrering</h3>
                            <p className="text-sm text-gray-500">
                                Skicka e-post från din egen adress för bättre leveransbarhet och professionellt intryck.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Status indicator */}
                <div className={`mt-4 p-4 rounded-lg ${hasExistingSettings ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
                    <div className="flex items-center">
                        {hasExistingSettings ? (
                            <>
                                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                                <span className="text-green-800 font-medium">
                                    Ansluten till {currentProvider?.name || 'Egen SMTP-server'}
                                </span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5 text-blue-600 mr-2" />
                                <span className="text-blue-800 font-medium">Kom igång på 2 minuter!</span>
                            </>
                        )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1 ml-7">
                        {hasExistingSettings
                            ? 'E-post skickas via din egen server. Svar går direkt till din inkorg.'
                            : 'Välj din e-postleverantör nedan för att snabbt konfigurera din e-post.'}
                    </p>
                </div>
            </div>

            {/* Message display */}
            {message && (
                <div className={`p-4 rounded-lg flex items-start ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                    {message.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                    ) : (
                        <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                    )}
                    <span>{message.text}</span>
                </div>
            )}

            {/* Provider Selection */}
            <div className="bg-white shadow rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-4">
                    {hasExistingSettings ? 'Byt e-postleverantör' : 'Steg 1: Välj din e-postleverantör'}
                </h4>

                {/* Popular providers row */}
                <div className="mb-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Populära val</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {EMAIL_PROVIDERS.filter(p => ['gmail', 'outlook', 'loopia', 'onecom'].includes(p.id)).map((provider) => (
                            <button
                                key={provider.id}
                                onClick={() => handleProviderSelect(provider.id)}
                                className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${selectedProvider === provider.id
                                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                    : 'border-gray-200 hover:border-blue-300'
                                    }`}
                            >
                                <div className="text-2xl mb-2">{provider.icon}</div>
                                <div className="font-medium text-gray-900 text-sm">{provider.name}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Other providers row */}
                <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Fler alternativ</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {EMAIL_PROVIDERS.filter(p => ['binero', 'bahnhof', 'custom'].includes(p.id)).map((provider) => (
                            <button
                                key={provider.id}
                                onClick={() => handleProviderSelect(provider.id)}
                                className={`p-3 rounded-lg border-2 text-left transition-all hover:shadow-md ${selectedProvider === provider.id
                                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                    : 'border-gray-200 hover:border-blue-300'
                                    }`}
                            >
                                <div className="flex items-center">
                                    <span className="text-xl mr-2">{provider.icon}</span>
                                    <span className="font-medium text-gray-900 text-sm">{provider.name}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Instructions Section */}
            {currentProvider && showAdvanced && (
                <div className="bg-white shadow rounded-lg p-6">
                    {/* Collapsible Instructions */}
                    <button
                        onClick={() => setShowInstructions(!showInstructions)}
                        className="w-full flex items-center justify-between text-left mb-4"
                    >
                        <div className="flex items-center">
                            <HelpCircle className="w-5 h-5 text-amber-600 mr-2" />
                            <span className="font-medium text-gray-900">
                                Instruktioner för {currentProvider.name}
                            </span>
                        </div>
                        {showInstructions ? (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                    </button>

                    {showInstructions && (
                        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-start">
                                <span className="text-2xl mr-3 flex-shrink-0">{currentProvider.icon}</span>
                                <div className="flex-1">
                                    <p className="text-amber-800 font-medium mb-2">
                                        {currentProvider.helpText}
                                    </p>

                                    {currentProvider.requiresAppPassword && (
                                        <div className="mb-3 p-3 bg-amber-100 rounded-md">
                                            <div className="flex items-start">
                                                <Info className="w-4 h-4 text-amber-700 mr-2 mt-0.5 flex-shrink-0" />
                                                <p className="text-sm text-amber-800">
                                                    <strong>Viktigt:</strong> Du måste använda ett app-lösenord, inte ditt vanliga lösenord.
                                                    Det vanliga lösenordet fungerar inte med SMTP.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <ol className="space-y-2 text-sm text-amber-700">
                                        {currentProvider.instructions.map((instruction, index) => (
                                            <li key={index} className="flex items-start">
                                                <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-xs font-medium mr-2 flex-shrink-0 mt-0.5">
                                                    {index + 1}
                                                </span>
                                                {instruction}
                                            </li>
                                        ))}
                                    </ol>

                                    {currentProvider.helpUrl && (
                                        <a
                                            href={currentProvider.helpUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center text-amber-800 hover:text-amber-900 text-sm mt-3 font-medium"
                                        >
                                            Öppna officiell guide <ExternalLink className="w-3 h-3 ml-1" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Settings Form */}
                    <h4 className="font-medium text-gray-900 mb-4">
                        {hasExistingSettings ? 'Dina e-postinställningar' : 'Steg 2: Ange dina uppgifter'}
                    </h4>

                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <Server className="w-4 h-4 inline mr-1" />
                                    SMTP-server
                                </label>
                                <input
                                    type="text"
                                    value={settings.smtp_host}
                                    onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                                    placeholder="smtp.example.com"
                                    disabled={selectedProvider !== 'custom'}
                                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${selectedProvider !== 'custom' ? 'bg-gray-50 text-gray-600' : ''
                                        }`}
                                />
                                {selectedProvider !== 'custom' && (
                                    <p className="text-xs text-gray-500 mt-1">Förifyllt för {currentProvider?.name}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Port
                                </label>
                                <input
                                    type="number"
                                    value={settings.smtp_port}
                                    onChange={(e) => setSettings({ ...settings, smtp_port: parseInt(e.target.value) || 587 })}
                                    placeholder="587"
                                    disabled={selectedProvider !== 'custom'}
                                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${selectedProvider !== 'custom' ? 'bg-gray-50 text-gray-600' : ''
                                        }`}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Mail className="w-4 h-4 inline mr-1" />
                                E-postadress
                            </label>
                            <input
                                type="email"
                                value={settings.smtp_user}
                                onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                                placeholder="ditt-namn@foretag.se"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Lock className="w-4 h-4 inline mr-1" />
                                {currentProvider?.requiresAppPassword ? 'App-lösenord' : 'Lösenord'}
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={settings.smtp_pass}
                                    onChange={(e) => setSettings({ ...settings, smtp_pass: e.target.value })}
                                    placeholder={currentProvider?.requiresAppPassword ? 'xxxx xxxx xxxx xxxx' : '••••••••••••'}
                                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {currentProvider?.requiresAppPassword && (
                                <p className="text-xs text-gray-500 mt-1">
                                    OBS: Detta är ett speciellt app-lösenord, inte ditt vanliga lösenord
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-6 flex flex-wrap gap-3">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-medium"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Sparar...
                                </>
                            ) : (
                                'Spara inställningar'
                            )}
                        </button>

                        <button
                            onClick={handleTestConnection}
                            disabled={testing || !settings.smtp_host}
                            className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-medium"
                        >
                            {testing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Testar...
                                </>
                            ) : (
                                <>
                                    <Mail className="w-4 h-4 mr-2" />
                                    Skicka testmail
                                </>
                            )}
                        </button>

                        {hasExistingSettings && (
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="px-5 py-2.5 bg-white text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-medium"
                            >
                                {deleting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Tar bort...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Ta bort
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Benefits Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 mb-3">Varför använda egen e-post?</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span><strong>Bättre leveransbarhet</strong> – E-post från din domän hamnar sällan i skräppost</span>
                    </li>
                    <li className="flex items-start">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span><strong>Professionellt intryck</strong> – Kunder ser din e-postadress som avsändare</span>
                    </li>
                    <li className="flex items-start">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span><strong>Direkta svar</strong> – Kundsvar kommer till din vanliga inkorg</span>
                    </li>
                    <li className="flex items-start">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span><strong>Full kontroll</strong> – Du äger och kontrollerar all e-postkommunikation</span>
                    </li>
                </ul>
            </div>
        </div>
    );
}
