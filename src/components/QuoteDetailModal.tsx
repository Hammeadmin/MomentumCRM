/**
 * QuoteDetailModal Component
 * Full-featured modal for viewing and managing quotes
 * Shows details, line items, and actions (edit, delete, send, accept)
 */

import { useState, useEffect } from 'react';
import {
    X, FileText, Trash2, Send, Check, Edit, User, Calendar,
    Package, Clock, Mail, Building, Loader2, Copy, ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import {
    getQuote, updateQuote, deleteQuote, sendQuoteEmail,
    acceptQuoteAndCreateOrder, type QuoteWithRelations
} from '../lib/quotes';
import LineItemsEditor, { type LineItem } from './LineItemsEditor';
import type { QuoteStatus } from '../types/database';
import ConfirmDialog from './ConfirmDialog';

// ============================================================================
// Types
// ============================================================================

interface QuoteDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    onQuoteUpdated?: () => void;
    quoteId: string;
}

type TabType = 'details' | 'items' | 'actions';

const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
    draft: 'Utkast',
    sent: 'Skickad',
    accepted: 'Accepterad',
    declined: 'Avvisad'
};

const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
    draft: 'bg-gray-100 text-gray-700',
    sent: 'bg-blue-100 text-blue-700',
    accepted: 'bg-green-100 text-green-700',
    declined: 'bg-red-100 text-red-700'
};

// ============================================================================
// Component
// ============================================================================

export function QuoteDetailModal({
    isOpen,
    onClose,
    onQuoteUpdated,
    quoteId
}: QuoteDetailModalProps) {
    const { success, error: showError } = useToast();
    const navigate = useNavigate();

    const [quote, setQuote] = useState<QuoteWithRelations | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('details');
    const [isEditing, setIsEditing] = useState(false);

    // Edit form state
    const [editForm, setEditForm] = useState({
        title: '',
        description: '',
        valid_until: ''
    });
    const [lineItems, setLineItems] = useState<LineItem[]>([]);

    // Dialog states
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showSendDialog, setShowSendDialog] = useState(false);
    const [sendEmail, setSendEmail] = useState('');

    // Load quote data
    useEffect(() => {
        if (isOpen && quoteId) {
            loadQuote();
        }
    }, [isOpen, quoteId]);

    const loadQuote = async () => {
        setLoading(true);
        try {
            const { data, error } = await getQuote(quoteId);
            if (error) throw error;
            if (data) {
                setQuote(data);
                setEditForm({
                    title: data.title || '',
                    description: data.description || '',
                    valid_until: data.valid_until || ''
                });
                // Map line items - Supabase returns 'quote_line_items' not 'line_items'
                const rawLineItems = (data as any).quote_line_items || data.line_items || [];
                const items: LineItem[] = rawLineItems.map((item: any) => ({
                    id: item.id,
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    total: item.total || item.quantity * item.unit_price
                }));
                setLineItems(items);
            }
        } catch (err: any) {
            showError('Fel', `Kunde inte ladda offert: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!quote) return;
        setSaving(true);
        try {
            // Map line items to quote format
            const quoteLineItems = lineItems.map((item, index) => ({
                ...(item.id ? { id: item.id } : {}),
                quote_id: quote.id,
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total: item.quantity * item.unit_price,
                sort_order: index
            })) as any;

            const { error } = await updateQuote(
                quote.id,
                {
                    title: editForm.title,
                    description: editForm.description,
                    valid_until: editForm.valid_until || null
                },
                quoteLineItems
            );

            if (error) throw error;

            success('Offert uppdaterad!', 'Ändringarna har sparats.');
            setIsEditing(false);
            await loadQuote();
            onQuoteUpdated?.();
        } catch (err: any) {
            showError('Fel', `Kunde inte spara: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!quote) return;
        try {
            const { error } = await deleteQuote(quote.id);
            if (error) throw error;

            success('Offert borttagen', 'Offerten har tagits bort.');
            onQuoteUpdated?.();
            onClose();
        } catch (err: any) {
            showError('Fel', `Kunde inte ta bort: ${err.message}`);
        }
    };

    const handleSend = async () => {
        if (!quote || !sendEmail) return;
        setSaving(true);
        try {
            const { error } = await sendQuoteEmail(quote.id, {
                recipient_email: sendEmail,
                subject: `Offert: ${quote.title}`,
                body: `Hej,\n\nBifogat finner du offert "${quote.title}".\n\nTotalt belopp: ${quote.total_amount?.toLocaleString('sv-SE')} kr\n\nVänliga hälsningar`,
                include_acceptance_link: true
            });

            if (error) throw error;

            success('Offert skickad!', `Offerten har skickats till ${sendEmail}`);
            setShowSendDialog(false);
            setSendEmail('');
            await loadQuote();
            onQuoteUpdated?.();
        } catch (err: any) {
            showError('Fel', `Kunde inte skicka: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleAccept = async () => {
        if (!quote) return;
        setSaving(true);
        try {
            const { error } = await acceptQuoteAndCreateOrder(quote.id);
            if (error) throw error;

            success('Offert accepterad!', 'En order har skapats automatiskt.');
            onQuoteUpdated?.();
            onClose();
        } catch (err: any) {
            showError('Fel', `Kunde inte acceptera: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleMarkStatus = async (status: QuoteStatus) => {
        if (!quote) return;
        setSaving(true);
        try {
            const { error } = await updateQuote(quote.id, { status });
            if (error) throw error;

            success('Status uppdaterad', `Offerten är nu markerad som "${QUOTE_STATUS_LABELS[status]}"`);
            await loadQuote();
            onQuoteUpdated?.();
        } catch (err: any) {
            showError('Fel', `Kunde inte uppdatera status: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const copyAcceptanceLink = () => {
        if (quote?.acceptance_token) {
            const link = `${window.location.origin}/quote-accept/${quote.acceptance_token}`;
            navigator.clipboard.writeText(link);
            success('Kopierad!', 'Accepteringslänk har kopierats.');
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mr-3">
                                <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                {loading ? (
                                    <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                ) : (
                                    <>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            {quote?.title}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                {quote?.quote_number}
                                            </span>
                                            {quote?.status && (
                                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${QUOTE_STATUS_COLORS[quote.status]}`}>
                                                    {QUOTE_STATUS_LABELS[quote.status]}
                                                </span>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {!loading && quote?.status === 'draft' && (
                                <button
                                    onClick={() => setIsEditing(!isEditing)}
                                    className={`p-2 rounded-lg transition-colors ${isEditing ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                                >
                                    <Edit className="w-5 h-5" />
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    onClose();
                                    navigate(`/offert/${quoteId}`);
                                }}
                                title="Visa fullständig sida"
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                                <ExternalLink className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setShowDeleteDialog(true)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <nav className="flex space-x-8 px-6">
                            {[
                                { id: 'details', label: 'Detaljer', icon: FileText },
                                { id: 'items', label: 'Produkter', icon: Package },
                                { id: 'actions', label: 'Åtgärder', icon: Send }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as TabType)}
                                    className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                                        ? 'border-purple-500 text-purple-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                            </div>
                        ) : (
                            <>
                                {/* Details Tab */}
                                {activeTab === 'details' && quote && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Quote Info */}
                                        <div className="space-y-4">
                                            <h4 className="font-medium text-gray-900 dark:text-white">Offertinformation</h4>
                                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                                                {isEditing ? (
                                                    <>
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-500">Titel</label>
                                                            <input
                                                                type="text"
                                                                value={editForm.title}
                                                                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                                                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-500">Beskrivning</label>
                                                            <textarea
                                                                value={editForm.description}
                                                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                                                rows={3}
                                                                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-sm font-medium text-gray-500">Giltig till</label>
                                                            <input
                                                                type="date"
                                                                value={editForm.valid_until}
                                                                onChange={(e) => setEditForm({ ...editForm, valid_until: e.target.value })}
                                                                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg"
                                                            />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        {quote.description && (
                                                            <div>
                                                                <span className="text-sm font-medium text-gray-500">Beskrivning</span>
                                                                <p className="text-sm text-gray-900 dark:text-white">{quote.description}</p>
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="w-4 h-4 text-gray-400" />
                                                            <span className="text-sm text-gray-500">Skapad:</span>
                                                            <span className="text-sm text-gray-900 dark:text-white">
                                                                {new Date(quote.created_at || '').toLocaleDateString('sv-SE')}
                                                            </span>
                                                        </div>
                                                        {quote.valid_until && (
                                                            <div className="flex items-center gap-2">
                                                                <Clock className="w-4 h-4 text-gray-400" />
                                                                <span className="text-sm text-gray-500">Giltig till:</span>
                                                                <span className="text-sm text-gray-900 dark:text-white">
                                                                    {new Date(quote.valid_until).toLocaleDateString('sv-SE')}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Customer Info */}
                                        <div className="space-y-4">
                                            <h4 className="font-medium text-gray-900 dark:text-white">Kund</h4>
                                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
                                                {quote.customer ? (
                                                    <>
                                                        <div className="flex items-center gap-2">
                                                            <Building className="w-4 h-4 text-gray-400" />
                                                            <span className="font-medium text-gray-900 dark:text-white">
                                                                {quote.customer.name}
                                                            </span>
                                                        </div>
                                                        {quote.customer.email && (
                                                            <div className="flex items-center gap-2">
                                                                <Mail className="w-4 h-4 text-gray-400" />
                                                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                                                    {quote.customer.email}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {quote.customer.phone_number && (
                                                            <div className="flex items-center gap-2">
                                                                <User className="w-4 h-4 text-gray-400" />
                                                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                                                    {quote.customer.phone_number}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <p className="text-sm text-gray-500">Ingen kund kopplad</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Summary */}
                                        <div className="lg:col-span-2">
                                            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="text-sm text-purple-600 dark:text-purple-400">
                                                            {lineItems.length} produkt(er)
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm text-purple-600 dark:text-purple-400">Totalt belopp</p>
                                                        <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                                                            {(quote.total_amount || 0).toLocaleString('sv-SE')} kr
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Items Tab */}
                                {activeTab === 'items' && (
                                    <LineItemsEditor
                                        lineItems={lineItems}
                                        onChange={setLineItems}
                                        showLibrary={isEditing}
                                        readOnly={!isEditing}
                                    />
                                )}

                                {/* Actions Tab */}
                                {activeTab === 'actions' && quote && (
                                    <div className="space-y-4">
                                        {/* Quick Actions */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Send Quote */}
                                            <button
                                                onClick={() => {
                                                    setSendEmail(quote.customer?.email || '');
                                                    setShowSendDialog(true);
                                                }}
                                                disabled={saving}
                                                className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                            >
                                                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                                                    <Send className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-medium text-blue-700 dark:text-blue-300">Skicka offert</p>
                                                    <p className="text-sm text-blue-600 dark:text-blue-400">Skicka via e-post till kund</p>
                                                </div>
                                            </button>

                                            {/* Accept & Create Order - Direct */}
                                            <button
                                                onClick={handleAccept}
                                                disabled={saving || quote.status === 'accepted'}
                                                className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50"
                                            >
                                                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center">
                                                    <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-medium text-green-700 dark:text-green-300">Acceptera direkt</p>
                                                    <p className="text-sm text-green-600 dark:text-green-400">Skapa order utan ändringar</p>
                                                </div>
                                            </button>

                                            {/* Edit first, then Accept */}
                                            {quote.status !== 'accepted' && (
                                                <button
                                                    onClick={() => {
                                                        setIsEditing(true);
                                                        setActiveTab('items');
                                                    }}
                                                    disabled={saving}
                                                    className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                                                >
                                                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-lg flex items-center justify-center">
                                                        <Edit className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="font-medium text-amber-700 dark:text-amber-300">Redigera först</p>
                                                        <p className="text-sm text-amber-600 dark:text-amber-400">Ändra offerten innan acceptera</p>
                                                    </div>
                                                </button>
                                            )}

                                            {/* Copy Link */}
                                            {quote.acceptance_token && (
                                                <button
                                                    onClick={copyAcceptanceLink}
                                                    className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                >
                                                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                                                        <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="font-medium text-gray-700 dark:text-gray-300">Kopiera accepteringslänk</p>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">Dela länk direkt med kund</p>
                                                    </div>
                                                </button>
                                            )}

                                            {/* Mark as Declined */}
                                            {quote.status !== 'declined' && quote.status !== 'accepted' && (
                                                <button
                                                    onClick={() => handleMarkStatus('declined')}
                                                    disabled={saving}
                                                    className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                                >
                                                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/50 rounded-lg flex items-center justify-center">
                                                        <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="font-medium text-red-700 dark:text-red-300">Markera som avvisad</p>
                                                        <p className="text-sm text-red-600 dark:text-red-400">Kunden avböjde offerten</p>
                                                    </div>
                                                </button>
                                            )}
                                        </div>

                                        {/* Status Change */}
                                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Ändra status</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {(['draft', 'sent', 'accepted', 'declined'] as QuoteStatus[]).map(status => (
                                                    <button
                                                        key={status}
                                                        onClick={() => handleMarkStatus(status)}
                                                        disabled={saving || quote.status === status}
                                                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${quote.status === status
                                                            ? QUOTE_STATUS_COLORS[status] + ' ring-2 ring-offset-2 ring-gray-300'
                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                            }`}
                                                    >
                                                        {QUOTE_STATUS_LABELS[status]}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    {isEditing && (
                        <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex justify-end gap-3">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                Avbryt
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Sparar...
                                    </>
                                ) : (
                                    'Spara ändringar'
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Dialog */}
            <ConfirmDialog
                isOpen={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                onConfirm={handleDelete}
                title="Ta bort offert"
                message={`Är du säker på att du vill ta bort offerten "${quote?.title}"? Denna åtgärd kan inte ångras.`}
                confirmText="Ta bort"
                cancelText="Avbryt"
                type="danger"
            />

            {/* Send Dialog */}
            {showSendDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
                    <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Skicka offert via e-post
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Mottagarens e-post
                                </label>
                                <input
                                    type="email"
                                    value={sendEmail}
                                    onChange={(e) => setSendEmail(e.target.value)}
                                    placeholder="kund@example.com"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowSendDialog(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                            >
                                Avbryt
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={saving || !sendEmail}
                                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                                Skicka
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default QuoteDetailModal;
