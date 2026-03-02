/**
 * QuoteDetailPage - Comprehensive quote detail view
 * 
 * Enhanced layout matching OrderDetailPage with:
 * - Status workflow (draft → sent → accepted/declined)
 * - Customer info sidebar
 * - Line items breakdown
 * - Quote Preview tab
 * - Activity timeline
 * - Delete functionality
 * - Assignment/Origin information
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import {
    FileText,
    MapPin,
    Phone,
    Mail,
    Clock,
    Edit,
    CheckCircle,
    AlertCircle,
    Send,
    Download,
    XCircle,
    Package,
    Loader2,
    Briefcase,
    History,
    ArrowLeft,
    Printer,
    Trash2,
    Eye,
    User,
    Building2,
    Calendar,
    Link2,
    ExternalLink,
    MessageSquare,
    Copy,
    Flame
} from 'lucide-react';
import QuoteEditModal from '../components/QuoteEditModal';
import QuotePreview from '../components/QuotePreview';
import SendQuoteModal from '../components/SendQuoteModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { convertQuoteToJob, formatDate, formatCurrency } from '../lib/database';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { getQuote, updateQuote, deleteQuote } from '../lib/quotes';
import { getCustomers, getLeads } from '../lib/database';
import { getQuoteTemplates, type QuoteTemplate } from '../lib/quoteTemplates';
import { supabase } from '../lib/supabase';
import { QUOTE_STATUS_LABELS, type QuoteStatus, type Customer, type Lead } from '../types/database';
import { Button } from '../components/ui';

// Pipeline stages for quote workflow
const QUOTE_PIPELINE: { status: QuoteStatus; label: string }[] = [
    { status: 'draft', label: 'Utkast' },
    { status: 'sent', label: 'Skickad' },
    { status: 'accepted', label: 'Accepterad' },
    { status: 'declined', label: 'Avvisad' },
];

// Use imported QuoteWithRelations from lib/quotes
import { type QuoteWithRelations } from '../lib/quotes';

export default function QuoteDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { organisationId } = useAuth();
    const { success, error: showError } = useToast();

    const [quote, setQuote] = useState<QuoteWithRelations | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'items' | 'preview' | 'details' | 'history'>('items');
    const [showEditModal, setShowEditModal] = useState(false);
    const [showSendModal, setShowSendModal] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Company info for preview
    const [companyInfo, setCompanyInfo] = useState<any>(null);

    // Aux data for Edit Modal
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [templates, setTemplates] = useState<QuoteTemplate[]>([]);

    // View tracking data
    const [viewData, setViewData] = useState<{ count: number; lastViewed: string | null }>({ count: 0, lastViewed: null });

    // Print ref for preview
    const printRef = useRef<HTMLDivElement>(null);

    // Print handler
    const handlePrintPreview = useReactToPrint({
        contentRef: printRef,
        documentTitle: quote?.quote_number || 'Offert',
    });

    useEffect(() => {
        if (id) {
            loadQuoteData();
            loadViewData();
        }
    }, [id]);

    const loadViewData = async () => {
        if (!id) return;
        try {
            const { data, error } = await supabase
                .from('quote_views')
                .select('viewed_at')
                .eq('quote_id', id)
                .order('viewed_at', { ascending: false });

            if (!error && data) {
                setViewData({
                    count: data.length,
                    lastViewed: data.length > 0 ? data[0].viewed_at : null
                });
            }
        } catch (err) {
            console.error('Error loading view data:', err);
        }
    };

    const loadQuoteData = async () => {
        if (!id) return;

        setLoading(true);
        try {
            const { data, error } = await getQuote(id);
            if (error) throw error;
            setQuote(data);
        } catch (err: any) {
            showError('Kunde inte ladda offert', err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (organisationId) {
            loadAuxData();
        }
    }, [organisationId]);

    const loadAuxData = async () => {
        try {
            const [custRes, leadsRes, templRes] = await Promise.all([
                getCustomers(organisationId!),
                getLeads(organisationId!),
                getQuoteTemplates(organisationId!)
            ]);

            setCustomers(custRes.data || []);
            setLeads(leadsRes.data || []);
            setTemplates(templRes.data || []);

            const { data: orgData } = await supabase
                .from('organisations')
                .select('*')
                .eq('id', organisationId!)
                .single();
            setCompanyInfo(orgData);
        } catch (err) {
            console.error('Error loading aux data', err);
        }
    };

    const handleStatusChange = async (newStatus: QuoteStatus) => {
        if (!quote || !id) return;

        try {
            const { error } = await updateQuote(id, { status: newStatus });
            if (error) throw error;

            setQuote(prev => prev ? { ...prev, status: newStatus } : null);
            success('Status uppdaterad', `Offerten ändrades till "${QUOTE_STATUS_LABELS[newStatus]}"`);
        } catch (err: any) {
            showError('Kunde inte uppdatera status', err.message);
        }
    };

    const handleDelete = async () => {
        if (!id) return;

        setDeleteLoading(true);
        try {
            const { error } = await deleteQuote(id);
            if (error) throw error;

            success('Offert raderad', 'Offerten har tagits bort.');
            navigate('/app/offerter');
        } catch (err: any) {
            showError('Kunde inte radera', err.message);
        } finally {
            setDeleteLoading(false);
            setShowDeleteDialog(false);
        }
    };

    const handleConvert = async () => {
        if (!quote || !id) return;
        if (!confirm('Vill du konvertera denna offert till ett jobb?')) return;

        try {
            const result = await convertQuoteToJob(id);
            if (result.error) throw result.error;

            success('Konverterad', 'Offert har konverterats till ett jobb.');
            loadQuoteData();
        } catch (err: any) {
            showError('Tyvärr', 'Kunde inte konvertera offert: ' + err.message);
        }
    };

    const copyAcceptanceLink = async () => {
        if (!quote?.acceptance_token) {
            showError('Fel', 'Ingen godkännande-länk finns. Skicka offerten först.');
            return;
        }
        const link = `${window.location.origin}/quote-accept/${quote.acceptance_token}`;
        try {
            await navigator.clipboard.writeText(link);
            success('Kopierad', 'Godkännande-länk kopierad till urklipp.');
        } catch {
            showError('Fel', 'Kunde inte kopiera länken.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
                    <p className="text-gray-600">Laddar offert...</p>
                </div>
            </div>
        );
    }

    if (!quote) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Offert hittades inte</h2>
                <p className="text-gray-600 mb-4">Offerten du letar efter finns inte eller har tagits bort.</p>
                <Button onClick={() => navigate('/app/offerter')}>Tillbaka till offerter</Button>
            </div>
        );
    }

    const currentStageIndex = QUOTE_PIPELINE.findIndex(s => s.status === quote.status);
    const selectedTemplate = templates.find(t => t.id === (quote as any).template_id) || templates[0];

    // Customer info for preview
    const customerInfo = quote.customer || {
        name: 'Kundnamn',
        email: '',
        phone: '',
        address: '',
        postal_code: '',
        city: ''
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header with back button */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{quote.title}</h1>
                        <p className="text-gray-500 text-sm">Offert #{quote.quote_number || id?.substring(0, 8)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 no-print">
                    <Button
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 className="w-4 h-4" />}
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-red-600 hover:bg-red-50"
                    >
                        Radera
                    </Button>
                    <Button variant="outline" size="sm" icon={<Printer className="w-4 h-4" />} onClick={() => handlePrintPreview()}>
                        Skriv ut
                    </Button>
                    <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />} onClick={() => handlePrintPreview()}>
                        PDF
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        icon={<Edit className="w-4 h-4" />}
                        onClick={() => setShowEditModal(true)}
                    >
                        Redigera
                    </Button>
                    {quote.status === 'accepted' && (
                        <Button
                            variant="primary"
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                            icon={<Briefcase className="w-4 h-4" />}
                            onClick={handleConvert}
                        >
                            Konvertera till Jobb
                        </Button>
                    )}
                    {quote.status === 'draft' && (
                        <Button
                            variant="primary"
                            size="sm"
                            icon={<Send className="w-4 h-4" />}
                            onClick={() => setShowSendModal(true)}
                        >
                            Skicka till kund
                        </Button>
                    )}
                </div>
            </div>

            {/* Status Pipeline */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                    {QUOTE_PIPELINE.map((stage, index) => {
                        const isCompleted = index < currentStageIndex;
                        const isCurrent = index === currentStageIndex;
                        const isDeclined = quote.status === 'declined' && stage.status === 'declined';

                        return (
                            <div key={stage.status} className="flex-1 flex items-center">
                                <button
                                    onClick={() => handleStatusChange(stage.status)}
                                    className={`flex flex-col items-center flex-1 py-2 px-4 rounded-lg transition-all ${isCurrent
                                        ? isDeclined
                                            ? 'bg-red-50 border-2 border-red-500'
                                            : 'bg-blue-50 border-2 border-blue-500'
                                        : isCompleted
                                            ? 'bg-green-50 hover:bg-green-100'
                                            : 'hover:bg-gray-50'
                                        }`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${isDeclined ? 'bg-red-500 text-white' :
                                        isCompleted ? 'bg-green-500 text-white' :
                                            isCurrent ? 'bg-blue-500 text-white' :
                                                'bg-gray-200 text-gray-500'
                                        }`}>
                                        {isDeclined ? (
                                            <XCircle className="w-5 h-5" />
                                        ) : isCompleted ? (
                                            <CheckCircle className="w-5 h-5" />
                                        ) : (
                                            <span className="text-sm font-medium">{index + 1}</span>
                                        )}
                                    </div>
                                    <span className={`text-xs font-medium ${isDeclined ? 'text-red-700' :
                                        isCurrent ? 'text-blue-700' :
                                            isCompleted ? 'text-green-700' :
                                                'text-gray-500'
                                        }`}>
                                        {stage.label}
                                    </span>
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Customer & Summary Info */}
                <div className="space-y-6">
                    {/* Customer Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Kund</h3>
                        {quote.customer ? (
                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-white font-semibold text-sm">
                                            {quote.customer.name?.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">{quote.customer.name}</p>
                                        <p className="text-sm text-gray-500">{quote.customer.customer_type === 'company' ? 'Företag' : 'Privatperson'}</p>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-3 border-t border-gray-100">
                                    {quote.customer.email && (
                                        <a href={`mailto:${quote.customer.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600">
                                            <Mail className="w-4 h-4" />
                                            {quote.customer.email}
                                        </a>
                                    )}
                                    {quote.customer.phone_number && (
                                        <a href={`tel:${quote.customer.phone_number}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600">
                                            <Phone className="w-4 h-4" />
                                            {quote.customer.phone_number}
                                        </a>
                                    )}
                                    {quote.customer.address && (
                                        <div className="flex items-start gap-2 text-sm text-gray-600">
                                            <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                            <span>
                                                {quote.customer.address}
                                                {quote.customer.postal_code && `, ${quote.customer.postal_code}`}
                                                {quote.customer.city && ` ${quote.customer.city}`}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm">Ingen kund kopplad</p>
                        )}
                    </div>

                    {/* Quote Summary */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Sammanfattning</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Delsumma</span>
                                <span className="font-medium">{formatCurrency(quote.subtotal || 0)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Moms</span>
                                <span className="font-medium">{formatCurrency(quote.vat_amount || 0)}</span>
                            </div>
                            <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                                <span className="font-semibold text-gray-900">Totalt</span>
                                <span className="text-xl font-bold text-gray-900">{formatCurrency(quote.total_amount)}</span>
                            </div>
                            {quote.include_rot && (
                                <div className="bg-green-50 rounded-lg p-3 mt-3">
                                    <div className="flex justify-between items-center text-green-700">
                                        <span className="text-sm font-medium">ROT-avdrag</span>
                                        <span className="font-semibold">-{formatCurrency(quote.rot_amount || 0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1 text-green-800">
                                        <span className="text-sm">Att betala</span>
                                        <span className="font-bold">{formatCurrency((quote.total_amount || 0) - (quote.rot_amount || 0))}</span>
                                    </div>
                                </div>
                            )}
                            {(quote as any).include_rut && (
                                <div className="bg-purple-50 rounded-lg p-3 mt-3">
                                    <div className="flex justify-between items-center text-purple-700">
                                        <span className="text-sm font-medium">RUT-avdrag</span>
                                        <span className="font-semibold">-{formatCurrency((quote as any).rut_amount || 0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1 text-purple-800">
                                        <span className="text-sm">Att betala</span>
                                        <span className="font-bold">{formatCurrency((quote.total_amount || 0) - ((quote as any).rut_amount || 0))}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Validity & Origin */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Information</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-gray-600">
                                <Clock className="w-4 h-4" />
                                <span className="text-sm">
                                    {quote.valid_until ? `Giltig till ${formatDate(quote.valid_until)}` : 'Inget slutdatum'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                                <Calendar className="w-4 h-4" />
                                <span className="text-sm">Skapad {quote.created_at ? formatDate(quote.created_at) : '-'}</span>
                            </div>
                            {quote.lead_id && (
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Link2 className="w-4 h-4" />
                                    <span className="text-sm">Skapad från lead</span>
                                </div>
                            )}
                            {quote.order_id && (
                                <div className="flex items-center gap-2 text-green-600">
                                    <Briefcase className="w-4 h-4" />
                                    <span className="text-sm">Kopplad till order</span>
                                </div>
                            )}
                        </div>

                        {/* Acceptance Link */}
                        {quote.acceptance_token && quote.status === 'sent' && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <button
                                    onClick={copyAcceptanceLink}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
                                >
                                    <Copy className="w-4 h-4" />
                                    Kopiera godkännande-länk
                                </button>
                            </div>
                        )}
                    </div>

                    {/* View Tracking */}
                    {quote.status === 'sent' && (
                        <div className={`rounded-xl shadow-sm border p-5 ${viewData.count >= 3 ? 'bg-gradient-to-br from-orange-50 to-red-50 border-orange-200' : 'bg-white border-gray-200'}`}>
                            <div className="flex items-center gap-2 mb-4">
                                {viewData.count >= 3 ? (
                                    <Flame className="w-5 h-5 text-orange-500" />
                                ) : (
                                    <Eye className="w-5 h-5 text-purple-500" />
                                )}
                                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Kundaktivitet</h3>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600">Visningar</span>
                                    <span className={`text-2xl font-bold ${viewData.count >= 3 ? 'text-orange-600' : 'text-gray-900'}`}>
                                        {viewData.count}
                                    </span>
                                </div>

                                {viewData.lastViewed && (
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Clock className="w-4 h-4" />
                                        <span>Senast: {new Date(viewData.lastViewed).toLocaleString('sv-SE')}</span>
                                    </div>
                                )}

                                {viewData.count >= 3 && (
                                    <div className="pt-3 border-t border-orange-200">
                                        <div className="flex items-center gap-2 text-orange-700 mb-3">
                                            <Flame className="w-4 h-4" />
                                            <span className="text-sm font-medium">Het lead! Kunden är intresserad.</span>
                                        </div>
                                        {quote.customer?.phone_number && (
                                            <a
                                                href={`tel:${quote.customer.phone_number}`}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                                            >
                                                <Phone className="w-4 h-4" />
                                                Ring nu: {quote.customer.phone_number}
                                            </a>
                                        )}
                                        {quote.customer?.email && (
                                            <a
                                                href={`mailto:${quote.customer.email}?subject=Angående offert ${quote.quote_number}`}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2 mt-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm"
                                            >
                                                <Mail className="w-4 h-4" />
                                                Skicka e-post
                                            </a>
                                        )}
                                    </div>
                                )}

                                {viewData.count === 0 && (
                                    <p className="text-sm text-gray-400">Offerten har inte öppnats än</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column - Tabs */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Tabs */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="flex border-b border-gray-200">
                            <button
                                onClick={() => setActiveTab('items')}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium text-sm transition-colors ${activeTab === 'items'
                                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <Package className="w-4 h-4" />
                                Rader ({quote.line_items?.length || 0})
                            </button>
                            <button
                                onClick={() => setActiveTab('preview')}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium text-sm transition-colors ${activeTab === 'preview'
                                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <Eye className="w-4 h-4" />
                                Förhandsgranska
                            </button>
                            <button
                                onClick={() => setActiveTab('details')}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium text-sm transition-colors ${activeTab === 'details'
                                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <FileText className="w-4 h-4" />
                                Detaljer
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium text-sm transition-colors ${activeTab === 'history'
                                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <History className="w-4 h-4" />
                                Historik
                            </button>
                        </div>

                        <div className="p-5">
                            {/* Items Tab */}
                            {activeTab === 'items' && (
                                <div>
                                    {quote.line_items && quote.line_items.length > 0 ? (
                                        <table className="w-full">
                                            <thead>
                                                <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-200">
                                                    <th className="pb-3 font-semibold">Beskrivning</th>
                                                    <th className="pb-3 font-semibold text-right">Antal</th>
                                                    <th className="pb-3 font-semibold text-right">Á-pris</th>
                                                    <th className="pb-3 font-semibold text-right">Summa</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {quote.line_items.map((item, index) => (
                                                    <tr key={item.id || index} className="border-b border-gray-100 last:border-0">
                                                        <td className="py-3">
                                                            <p className="text-sm font-medium text-gray-900">{item.name || item.description}</p>
                                                            {item.description && item.name && (
                                                                <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                                                            )}
                                                        </td>
                                                        <td className="py-3 text-sm text-gray-600 text-right">{item.quantity}</td>
                                                        <td className="py-3 text-sm text-gray-600 text-right">{formatCurrency(item.unit_price)}</td>
                                                        <td className="py-3 text-sm font-medium text-gray-900 text-right">{formatCurrency(item.total)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="text-center py-8">
                                            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                            <p className="text-gray-500">Inga rader tillagda</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Preview Tab */}
                            {activeTab === 'preview' && (
                                <div className="bg-gray-50 rounded-lg p-4 overflow-auto max-h-[600px]">
                                    <div ref={printRef} className="bg-white shadow-lg mx-auto" style={{ width: '210mm', minHeight: '297mm' }}>
                                        <QuotePreview
                                            quote={quote}
                                            template={selectedTemplate}
                                            companyInfo={companyInfo}
                                            customerInfo={customerInfo}
                                            logoUrl={companyInfo?.logo_url}
                                            quoteNumber={quote.quote_number || 'UTKAST'}
                                            validUntil={quote.valid_until}
                                            isEditable={false}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Details Tab */}
                            {activeTab === 'details' && (
                                <div className="space-y-6">
                                    {quote.description && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Beskrivning</h4>
                                            <p className="text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-4">{quote.description}</p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        {quote.quote_number && (
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <p className="text-xs text-gray-500 mb-1">Offertnummer</p>
                                                <p className="font-medium text-gray-900">{quote.quote_number}</p>
                                            </div>
                                        )}
                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <p className="text-xs text-gray-500 mb-1">Status</p>
                                            <p className="font-medium text-gray-900">{QUOTE_STATUS_LABELS[quote.status]}</p>
                                        </div>
                                        {quote.lead_id && (
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <p className="text-xs text-gray-500 mb-1">Kopplat Lead</p>
                                                <p className="font-medium text-gray-900">#{quote.lead_id.substring(0, 8)}</p>
                                            </div>
                                        )}
                                        {quote.order_id && (
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <p className="text-xs text-gray-500 mb-1">Kopplad Order</p>
                                                <p className="font-medium text-gray-900">#{quote.order_id.substring(0, 8)}</p>
                                            </div>
                                        )}
                                    </div>

                                    {quote.include_rot && (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                            <h4 className="text-sm font-semibold text-green-800 mb-2">ROT-information</h4>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                {quote.rot_personnummer && (
                                                    <div>
                                                        <p className="text-green-600">Personnummer</p>
                                                        <p className="font-medium text-green-800">{quote.rot_personnummer}</p>
                                                    </div>
                                                )}
                                                {quote.rot_fastighetsbeteckning && (
                                                    <div>
                                                        <p className="text-green-600">Fastighetsbeteckning</p>
                                                        <p className="font-medium text-green-800">{quote.rot_fastighetsbeteckning}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {(quote as any).include_rut && (
                                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                            <h4 className="text-sm font-semibold text-purple-800 mb-2">RUT-information</h4>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                {(quote as any).rut_personnummer && (
                                                    <div>
                                                        <p className="text-purple-600">Personnummer</p>
                                                        <p className="font-medium text-purple-800">{(quote as any).rut_personnummer}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {quote.accepted_at && (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                            <div className="flex items-center gap-2 text-green-700">
                                                <CheckCircle className="w-5 h-5" />
                                                <span className="font-medium">Accepterad {formatDate(quote.accepted_at)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* History Tab */}
                            {activeTab === 'history' && (
                                <div className="space-y-4">
                                    <div className="relative">
                                        {/* Timeline line */}
                                        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                                        {/* Timeline items */}
                                        <div className="space-y-6">
                                            {/* Created */}
                                            <div className="flex gap-4 relative">
                                                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center z-10">
                                                    <FileText className="w-3 h-3 text-gray-600" />
                                                </div>
                                                <div className="flex-1 pb-4">
                                                    <p className="text-sm font-medium text-gray-900">Offert skapad</p>
                                                    <p className="text-xs text-gray-500">{quote.created_at ? formatDate(quote.created_at) : '-'}</p>
                                                    {quote.lead_id && (
                                                        <p className="text-xs text-indigo-600 mt-1">Skapad från lead</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Sent */}
                                            {(quote.status === 'sent' || quote.status === 'accepted' || quote.status === 'declined') && (
                                                <div className="flex gap-4 relative">
                                                    <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center z-10">
                                                        <Send className="w-3 h-3 text-blue-600" />
                                                    </div>
                                                    <div className="flex-1 pb-4">
                                                        <p className="text-sm font-medium text-gray-900">Skickad till kund</p>
                                                        {quote.customer?.email && (
                                                            <p className="text-xs text-gray-500">Till: {quote.customer.email}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Accepted */}
                                            {quote.accepted_at && (
                                                <div className="flex gap-4 relative">
                                                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center z-10">
                                                        <CheckCircle className="w-3 h-3 text-white" />
                                                    </div>
                                                    <div className="flex-1 pb-4">
                                                        <p className="text-sm font-medium text-gray-900">Accepterad av kund</p>
                                                        <p className="text-xs text-gray-500">{formatDate(quote.accepted_at)}</p>
                                                        {quote.accepted_by_ip && (
                                                            <p className="text-xs text-gray-400 mt-1">IP: {quote.accepted_by_ip}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Declined */}
                                            {quote.status === 'declined' && !quote.accepted_at && (
                                                <div className="flex gap-4 relative">
                                                    <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center z-10">
                                                        <XCircle className="w-3 h-3 text-white" />
                                                    </div>
                                                    <div className="flex-1 pb-4">
                                                        <p className="text-sm font-medium text-gray-900">Avvisad</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Order created */}
                                            {quote.order_id && (
                                                <div className="flex gap-4 relative">
                                                    <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center z-10">
                                                        <Briefcase className="w-3 h-3 text-white" />
                                                    </div>
                                                    <div className="flex-1 pb-4">
                                                        <p className="text-sm font-medium text-gray-900">Order skapad</p>
                                                        <a
                                                            href={`/app/order/${quote.order_id}`}
                                                            className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1"
                                                        >
                                                            Visa order
                                                            <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showEditModal && quote && (
                <QuoteEditModal
                    isOpen={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    quote={quote as any}
                    onSave={async () => {
                        setShowEditModal(false);
                        await loadQuoteData();
                    }}
                    organisationId={organisationId || ''}
                    customers={customers}
                    leads={leads}
                    templates={templates}
                    companyInfo={companyInfo}
                />
            )}

            {showSendModal && quote && (
                <SendQuoteModal
                    isOpen={showSendModal}
                    onClose={() => setShowSendModal(false)}
                    quote={quote}
                    onSent={() => loadQuoteData()}
                />
            )}

            <ConfirmDialog
                isOpen={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                onConfirm={handleDelete}
                title="Radera offert"
                message={`Är du säker på att du vill radera offert "${quote?.title}"? Detta går inte att ångra.`}
                confirmLabel="Radera"
                confirmVariant="danger"
                loading={deleteLoading}
            />
        </div>
    );
}
