import React, { useState, useEffect } from 'react';
import { MessageSquare, Key, User, CheckCircle, AlertCircle, Loader2, Eye, EyeOff, Trash2, ExternalLink, ChevronDown, ChevronRight, HelpCircle, Info, Phone, Send } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getSmsSettings, saveSmsSettings, sendTestSms } from '../../lib/sms';
import { supabase } from '../../lib/supabase';

export default function SmsSettings() {
    const { organisationId } = useAuth();
    const [settings, setSettings] = useState({
        apiUsername: '',
        apiPassword: '',
        senderName: ''
    });
    const [testPhone, setTestPhone] = useState('');
    const [hasExistingSettings, setHasExistingSettings] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showInstructions, setShowInstructions] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        if (organisationId) {
            loadSettings();
        }
    }, [organisationId]);

    const loadSettings = async () => {
        if (!organisationId) return;

        try {
            setLoading(true);
            const data = await getSmsSettings(organisationId);

            if (data.isConfigured) {
                setSettings({
                    apiUsername: data.apiUsername || '',
                    apiPassword: data.apiPassword || '',
                    senderName: data.senderName || ''
                });
                setHasExistingSettings(true);
                setShowForm(true);
            }
        } catch (error) {
            console.error('Error loading SMS settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!organisationId) {
            setMessage({ type: 'error', text: 'Du måste vara inloggad.' });
            return;
        }

        if (!settings.apiUsername || !settings.apiPassword) {
            setMessage({ type: 'error', text: 'API-användare och API-lösenord är obligatoriska.' });
            return;
        }

        if (settings.senderName.length > 11) {
            setMessage({ type: 'error', text: 'Avsändarnamn får max vara 11 tecken.' });
            return;
        }

        try {
            setSaving(true);
            setMessage(null);

            const result = await saveSmsSettings(organisationId, settings);

            if (!result.success) {
                setMessage({ type: 'error', text: result.error || 'Kunde inte spara inställningarna.' });
                return;
            }

            setHasExistingSettings(true);
            setMessage({ type: 'success', text: 'SMS-inställningar sparade! Vi rekommenderar att skicka ett test-SMS.' });
        } catch (error) {
            console.error('Error saving SMS settings:', error);
            setMessage({ type: 'error', text: 'Ett fel uppstod. Försök igen.' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Är du säker på att du vill ta bort dina SMS-inställningar?')) {
            return;
        }

        if (!organisationId) return;

        try {
            setDeleting(true);
            setMessage(null);

            const { error } = await supabase
                .from('organisations')
                .update({
                    sms_api_username: null,
                    sms_api_password: null,
                    sms_sender_name: null
                })
                .eq('id', organisationId);

            if (error) {
                setMessage({ type: 'error', text: 'Kunde inte ta bort inställningarna.' });
                return;
            }

            setSettings({ apiUsername: '', apiPassword: '', senderName: '' });
            setHasExistingSettings(false);
            setShowForm(false);
            setMessage({ type: 'success', text: 'SMS-inställningar borttagna.' });
        } catch (error) {
            console.error('Error deleting SMS settings:', error);
            setMessage({ type: 'error', text: 'Ett fel uppstod.' });
        } finally {
            setDeleting(false);
        }
    };

    const handleTestSms = async () => {
        if (!organisationId) return;

        if (!testPhone) {
            setMessage({ type: 'error', text: 'Ange ett telefonnummer för testet.' });
            return;
        }

        try {
            setTesting(true);
            setMessage(null);

            const result = await sendTestSms(organisationId, testPhone);

            if (result.success) {
                setMessage({ type: 'success', text: `Test-SMS skickat till ${testPhone}!` });
            } else {
                setMessage({ type: 'error', text: result.error || 'Kunde inte skicka test-SMS.' });
            }
        } catch (error) {
            console.error('Error sending test SMS:', error);
            setMessage({ type: 'error', text: 'Ett fel uppstod vid test.' });
        } finally {
            setTesting(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600 dark:text-gray-300">Laddar SMS-inställningar...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <MessageSquare className="w-6 h-6 text-green-600 mr-3" />
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">SMS-integrering (46elks)</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Skicka SMS direkt från Momentum via 46elks.
                            </p>
                        </div>
                    </div>
                </div>

                <div className={`mt-4 p-4 rounded-lg ${hasExistingSettings ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'}`}>
                    <div className="flex items-center">
                        {hasExistingSettings ? (
                            <>
                                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                                <span className="text-green-800 dark:text-green-300 font-medium">
                                    Ansluten till 46elks
                                </span>
                            </>
                        ) : (
                            <>
                                <MessageSquare className="w-5 h-5 text-blue-600 mr-2" />
                                <span className="text-blue-800 dark:text-blue-300 font-medium">Kom igång på 5 minuter!</span>
                            </>
                        )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 ml-7">
                        {hasExistingSettings
                            ? `SMS skickas via 46elks med avsändarnamn "${settings.senderName || 'Momentum'}".`
                            : 'Följ stegen nedan för att konfigurera SMS-utskick.'}
                    </p>
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-lg flex items-start ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'}`}>
                    {message.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                    ) : (
                        <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                    )}
                    <span>{message.text}</span>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <button
                    onClick={() => setShowInstructions(!showInstructions)}
                    className="w-full flex items-center justify-between text-left mb-4"
                >
                    <div className="flex items-center">
                        <HelpCircle className="w-5 h-5 text-amber-600 mr-2" />
                        <span className="font-medium text-gray-900 dark:text-white">
                            Hur sätter jag upp 46elks?
                        </span>
                    </div>
                    {showInstructions ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                </button>

                {showInstructions && (
                    <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <div className="flex items-start">
                            <span className="text-2xl mr-3 flex-shrink-0">📱</span>
                            <div className="flex-1">
                                <p className="text-amber-800 dark:text-amber-300 font-medium mb-3">
                                    46elks är en svensk SMS-tjänst med enkel prissättning och hög leveranssäkerhet.
                                </p>

                                <div className="mb-4 p-3 bg-amber-100 dark:bg-amber-900/40 rounded-md">
                                    <div className="flex items-start">
                                        <Info className="w-4 h-4 text-amber-700 dark:text-amber-400 mr-2 mt-0.5 flex-shrink-0" />
                                        <p className="text-sm text-amber-800 dark:text-amber-300">
                                            <strong>Prisexempel:</strong> Ca 0,35 kr per SMS till svenska nummer.
                                            Du betalar endast för det du använder - inga fasta avgifter.
                                        </p>
                                    </div>
                                </div>

                                <ol className="space-y-3 text-sm text-amber-700 dark:text-amber-300">
                                    <li className="flex items-start">
                                        <span className="w-6 h-6 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 flex items-center justify-center text-xs font-medium mr-3 flex-shrink-0 mt-0.5">
                                            1
                                        </span>
                                        <div>
                                            <strong>Skapa ett 46elks-konto</strong>
                                            <p className="text-amber-600 dark:text-amber-400 mt-1">
                                                Gå till 46elks.se och registrera dig. Bekräfta din e-post och telefon.
                                            </p>
                                        </div>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="w-6 h-6 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 flex items-center justify-center text-xs font-medium mr-3 flex-shrink-0 mt-0.5">
                                            2
                                        </span>
                                        <div>
                                            <strong>Fyll på saldo</strong>
                                            <p className="text-amber-600 dark:text-amber-400 mt-1">
                                                Klicka på "Fyll på" i dashboarden. Minsta belopp är 100 kr.
                                                Betala med kort eller faktura.
                                            </p>
                                        </div>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="w-6 h-6 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 flex items-center justify-center text-xs font-medium mr-3 flex-shrink-0 mt-0.5">
                                            3
                                        </span>
                                        <div>
                                            <strong>Hämta dina API-nycklar</strong>
                                            <p className="text-amber-600 dark:text-amber-400 mt-1">
                                                Gå till <strong>Konto → API-nycklar</strong> i menyn.
                                                Här hittar du "API-användare" och "API-lösenord".
                                            </p>
                                        </div>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="w-6 h-6 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 flex items-center justify-center text-xs font-medium mr-3 flex-shrink-0 mt-0.5">
                                            4
                                        </span>
                                        <div>
                                            <strong>Klistra in nycklarna nedan</strong>
                                            <p className="text-amber-600 dark:text-amber-400 mt-1">
                                                Kopiera API-användare (börjar med "u") och API-lösenord,
                                                och klistra in dem i formuläret nedan.
                                            </p>
                                        </div>
                                    </li>
                                </ol>

                                <div className="mt-4 flex flex-wrap gap-3">
                                    <a
                                        href="https://46elks.se/register"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
                                    >
                                        Skapa 46elks-konto <ExternalLink className="w-3 h-3 ml-2" />
                                    </a>
                                    <a
                                        href="https://46elks.se/account"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center px-4 py-2 border border-amber-600 text-amber-700 dark:text-amber-400 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-sm font-medium"
                                    >
                                        Logga in på 46elks <ExternalLink className="w-3 h-3 ml-2" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {!showForm && !hasExistingSettings && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-green-400 hover:text-green-600 dark:hover:text-green-400 transition-colors flex items-center justify-center"
                    >
                        <Key className="w-5 h-5 mr-2" />
                        Jag har mina API-nycklar - fortsätt
                    </button>
                )}

                {showForm && (
                    <div className="space-y-4">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                            {hasExistingSettings ? 'Dina SMS-inställningar' : 'Ange dina 46elks-uppgifter'}
                        </h4>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                <User className="w-4 h-4 inline mr-1" />
                                API-användare
                            </label>
                            <input
                                type="text"
                                value={settings.apiUsername}
                                onChange={(e) => setSettings({ ...settings, apiUsername: e.target.value })}
                                placeholder="u1234567890abcdef..."
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Hittas under Konto → API-nycklar i 46elks. Börjar med "u".
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                <Key className="w-4 h-4 inline mr-1" />
                                API-lösenord
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={settings.apiPassword}
                                    onChange={(e) => setSettings({ ...settings, apiPassword: e.target.value })}
                                    placeholder="Ditt API-lösenord från 46elks"
                                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                <MessageSquare className="w-4 h-4 inline mr-1" />
                                Avsändarnamn (max 11 tecken)
                            </label>
                            <input
                                type="text"
                                value={settings.senderName}
                                onChange={(e) => setSettings({ ...settings, senderName: e.target.value.slice(0, 11) })}
                                placeholder="Momentum"
                                maxLength={11}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Detta namn visas som avsändare i kundens telefon. {settings.senderName.length}/11 tecken.
                            </p>
                        </div>

                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-medium"
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

                                {hasExistingSettings && (
                                    <button
                                        onClick={handleDelete}
                                        disabled={deleting}
                                        className="px-5 py-2.5 bg-white dark:bg-gray-700 text-red-600 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-medium"
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
                    </div>
                )}
            </div>

            {hasExistingSettings && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-4">Testa SMS-anslutningen</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Skicka ett test-SMS för att verifiera att allt fungerar korrekt.
                    </p>

                    <div className="flex gap-3">
                        <div className="flex-1">
                            <div className="relative">
                                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="tel"
                                    value={testPhone}
                                    onChange={(e) => setTestPhone(e.target.value)}
                                    placeholder="0701234567"
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleTestSms}
                            disabled={testing || !testPhone}
                            className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-medium"
                        >
                            {testing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Skickar...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Skicka test
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 border border-green-100 dark:border-green-800 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Fördelar med SMS-utskick</h4>
                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <li className="flex items-start">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span><strong>Hög öppningsgrad</strong> - Över 98% av SMS läses inom 3 minuter</span>
                    </li>
                    <li className="flex items-start">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span><strong>Påminnelser</strong> - Skicka bokningsbekräftelser och påminnelser automatiskt</span>
                    </li>
                    <li className="flex items-start">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span><strong>Snabb kommunikation</strong> - Nå kunder omedelbart vid förändringar</span>
                    </li>
                    <li className="flex items-start">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span><strong>Professionellt</strong> - Ditt företagsnamn som avsändare</span>
                    </li>
                </ul>
            </div>
        </div>
    );
}
