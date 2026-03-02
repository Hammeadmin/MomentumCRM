import React, { useState, useEffect } from 'react';
import {
    Sparkles,
    Download,
    Calendar,
    User,
    FileText,
    RefreshCw,
    AlertTriangle,
    TrendingUp,
    BarChart3,
    Loader2
} from 'lucide-react';
import { getRUTReport, getRUTSummary, formatRUTAmount } from '../lib/rut';
import { formatCurrency, formatDate } from '../lib/database';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfiles } from '../lib/database';
import ExportButton from './ExportButton';
import { Button } from './ui';

function RUTReport() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [rutData, setRutData] = useState<any[]>([]);
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
                setLoading(false);
                return;
            }

            setUserProfile(profile);

            // Load RUT report data and summary
            const [reportResult, summaryResult] = await Promise.all([
                getRUTReport(profile.organisation_id, selectedYear),
                getRUTSummary(profile.organisation_id, selectedYear)
            ]);

            if (reportResult.error) {
                setError(reportResult.error.message);
            } else {
                setRutData(reportResult.data || []);
            }

            if (summaryResult.data) {
                setSummary(summaryResult.data);
            }
        } catch (err) {
            setError('Ett fel uppstod vid hämtning av RUT-rapport');
            console.error('Error loading RUT report:', err);
        } finally {
            setLoading(false);
        }
    };

    const availableYears = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    const generateRUTExport = () => {
        return rutData.map((item: any) => ({
            'Fakturanummer': item.invoice_number || '-',
            'Kund': item.customer_name || '-',
            'Belopp': item.amount || 0,
            'RUT-belopp': item.rut_amount || 0,
            'Personnummer': item.rut_personnummer || '-',
            'Adress': item.address || '-',
            'Postnummer': item.postal_code || '-',
            'Stad': item.city || '-',
            'Datum': item.created_at ? new Date(item.created_at).toLocaleDateString('sv-SE') : '-'
        }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                <span className="ml-3 text-gray-600">Laddar RUT-rapport...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
                <p className="text-red-700 font-medium">{error}</p>
                <Button variant="outline" size="sm" onClick={loadData} className="mt-3">
                    Försök igen
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">RUT-rapport</h1>
                            <p className="text-purple-100">Översikt över RUT-avdrag för skattedeklaration och rapportering</p>
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
                            data={generateRUTExport()}
                            filename={`rut-rapport-${selectedYear}`}
                            title="Exportera"
                        />
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Totalt RUT-avdrag</p>
                                <p className="text-xl font-bold text-gray-900">{formatRUTAmount(summary.totalRUTAmount)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Antal fakturor</p>
                                <p className="text-xl font-bold text-gray-900">{summary.totalInvoices}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                <BarChart3 className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Snitt per faktura</p>
                                <p className="text-xl font-bold text-gray-900">{formatRUTAmount(summary.averageRUTPerInvoice)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* RUT Info */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                    <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-semibold text-purple-800">Om RUT-avdrag</h4>
                        <p className="text-sm text-purple-700 mt-1">
                            RUT-avdrag är ett skatteavdrag för hushållsnära tjänster som städning, trädgårdsarbete
                            och andra hemtjänster. Privatpersoner kan få avdrag för 50% av arbetskostnaden, upp till
                            maximalt 75 000 kr per person och år.
                        </p>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">RUT-transaktioner {selectedYear}</h3>
                </div>
                {rutData.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">Inga RUT-transaktioner hittades</p>
                        <p className="text-gray-400 text-sm mt-1">Det finns inga fakturor med RUT-avdrag för {selectedYear}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faktura</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kund</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Personnummer</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Belopp</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">RUT-avdrag</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {rutData.map((item: any) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {item.invoice_number || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {item.customer_name || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            <div className="flex items-center space-x-1">
                                                <User className="w-3.5 h-3.5 text-purple-500" />
                                                <span>{item.rut_personnummer || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                                            {formatCurrency(item.amount || 0)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-purple-600">
                                            {formatRUTAmount(item.rut_amount || 0)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {item.created_at ? formatDate(item.created_at) : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default RUTReport;
