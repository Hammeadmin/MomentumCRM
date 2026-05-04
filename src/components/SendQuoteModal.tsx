
import { useState, useEffect } from 'react';
import { X, Send, Mail, MessageSquare, Loader2, User, FileText, Calendar, DollarSign, Edit2 } from 'lucide-react';
import { Button } from './ui';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { supabase } from '../lib/supabase';
import {
    sendQuoteEmail,
    generateQuoteEmailTemplate,
    saveQuoteTemplateSnapshot,
    getAttachmentsForQuote,
    getQuoteAttachmentPublicUrl,
    type QuoteWithRelations
} from '../lib/quotes';
import { formatCurrency, formatDate } from '../lib/database';
import { createCommunication } from '../lib/communications';
import type { QuoteTemplate } from '../lib/quoteTemplates';
import type { Customer } from '../types/database';

interface SendQuoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Quote to send. When provided, uses send-quote-email and shows quote info. */
    quote?: QuoteWithRelations | null;
    /** Customer for non-quote contexts (e.g. general contact). Used when quote is not provided. */
    customer?: Customer | null;
    /** Called after a successful send */
    onSent?: () => void;
    /** Alias for onSent — kept for backwards compat with ContactCustomerModal callers */
    onCommunicationSent?: () => void;
    templates?: QuoteTemplate[];
}

type SendMethod = 'email' | 'sms';
type TemplateType = 'standard' | 'formal' | 'friendly' | 'follow_up';

const TEMPLATE_OPTIONS: { value: TemplateType; label: string; description: string }[] = [
    { value: 'standard', label: 'Standard', description: 'Professionellt och neutralt' },
    { value: 'formal', label: 'Formell', description: 'Extra professionell ton' },
    { value: 'friendly', label: 'Vänlig', description: 'Personlig och välkomnande' },
    { value: 'follow_up', label: 'Påminnelse', description: 'Uppföljning av tidigare skickad offert' },
];

/** Normalise a Swedish phone number to E.164 format for 46elks */
const formatPhoneNumber = (phone: string): string => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
        cleaned = '46' + cleaned.substring(1);
    }
    if (!cleaned.startsWith('+')) {
        cleaned = '+' + cleaned;
    }
    return cleaned;
};

export default function SendQuoteModal({
    isOpen,
    onClose,
    quote,
    customer,
    onSent,
    onCommunicationSent,
    templates = []
}: SendQuoteModalProps) {
    const { user, organisationId } = useAuth();
    const { success, error: showError } = useToast();

    const [method, setMethod] = useState<SendMethod>('email');
    const [loading, setLoading] = useState(false);
    const [templateType, setTemplateType] = useState<TemplateType>('standard');
    const [isEditingCustomer, setIsEditingCustomer] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
        (quote as any)?.template_id || templates[0]?.id || ''
    );

    // Form state
    const [recipient, setRecipient] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [includeAcceptanceLink, setIncludeAcceptanceLink] = useState(true);

    // Editable customer info
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');

    // Effective customer: prefer quote's customer, fall back to explicit customer prop
    const effectiveCustomer = quote?.customer ?? customer ?? null;

    // Generate email template only when a quote is present
    const updateMessageFromTemplate = (template: TemplateType) => {
        if (!quote) return;
        const { subject: defaultSubject, body } = generateQuoteEmailTemplate(quote, includeAcceptanceLink, template);
        setSubject(defaultSubject);
        setMessage(body);
    };

    // Initialise form when modal opens
    useEffect(() => {
        if (isOpen) {
            const eff = quote?.customer ?? customer ?? null;
            setCustomerName(eff?.name || '');
            setCustomerEmail(eff?.email || '');
            setCustomerPhone(eff?.phone_number || '');
            setRecipient(eff?.email || '');
            setIsEditingCustomer(false);
            setTemplateType('standard');
            setSelectedTemplateId((quote as any)?.template_id || templates[0]?.id || '');

            if (quote) {
                // Generate default email body from template
                const { subject: defaultSubject, body } = generateQuoteEmailTemplate(quote, true, 'standard');
                setSubject(defaultSubject);
                setMessage(body);
                setIncludeAcceptanceLink(true);
            } else {
                setSubject('');
                setMessage('');
                setIncludeAcceptanceLink(false);
            }
        }
    }, [isOpen, quote?.id, customer?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Re-generate template when type or acceptance link changes (quote only)
    useEffect(() => {
        if (isOpen && quote) {
            updateMessageFromTemplate(templateType);
        }
    }, [templateType, includeAcceptanceLink]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!isOpen) return null;

    const handleSend = async () => {
        const finalRecipient = method === 'email'
            ? (isEditingCustomer ? customerEmail : recipient)
            : (isEditingCustomer ? customerPhone : recipient);

        if (!finalRecipient) {
            showError('Fel', `Ange en giltig ${method === 'email' ? 'e-postadress' : 'mobilnummer'}.`);
            return;
        }

        if (!message.trim()) {
            showError('Fel', 'Meddelandet kan inte vara tomt.');
            return;
        }

        setLoading(true);
        try {
            if (method === 'email') {
                if (quote) {
                    // ── Quote email → send-quote-email edge function ──
                    // Save template snapshot (non-fatal)
                    if (selectedTemplateId && templates.length > 0) {
                        const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
                        if (selectedTemplate) {
                            try {
                                await saveQuoteTemplateSnapshot(quote.id, selectedTemplateId, selectedTemplate);
                            } catch (err) {
                                console.error('Template snapshot failed (non-fatal):', err);
                            }
                        }
                    }

                    // Append attachment download links (non-fatal)
                    let bodyWithAttachments = message;
                    try {
                        const { data: attachments } = await getAttachmentsForQuote(quote.id);
                        if (attachments && attachments.length > 0) {
                            const links = attachments
                                .map(a => `- ${a.file_name}: ${getQuoteAttachmentPublicUrl(a.file_path)}`)
                                .join('\n');
                            bodyWithAttachments = `${message}\n\n📎 Bilagor:\n${links}`;
                        }
                    } catch {
                        // Non-fatal
                    }

                    const result = await sendQuoteEmail(quote.id, {
                        recipient_email: finalRecipient,
                        subject,
                        body: bodyWithAttachments,
                        include_acceptance_link: includeAcceptanceLink
                    });

                    if (result.error) throw result.error;
                } else {
                    // ── General email → send-email edge function ──
                    const { data, error } = await supabase.functions.invoke('send-email', {
                        body: {
                            to: finalRecipient,
                            subject,
                            content: message,
                        }
                    });
                    if (error || !data?.success) {
                        throw new Error(error?.message || data?.error || 'Kunde inte skicka e-post');
                    }
                }
            } else {
                // ── SMS → send-sms edge function (46elks) ──
                const formattedPhone = formatPhoneNumber(finalRecipient);
                const { data, error } = await supabase.functions.invoke('send-sms', {
                    body: {
                        to: formattedPhone,
                        message,
                        organisation_id: organisationId,
                        created_by_user_id: user?.id
                    }
                });
                if (error || !data?.success) {
                    throw new Error(error?.message || data?.error || 'Kunde inte skicka SMS');
                }
            }

            // ── Log communication ──
            const effectiveCustomerId = quote?.customer_id ?? effectiveCustomer?.id;
            if (effectiveCustomerId && organisationId) {
                try {
                    await createCommunication({
                        organisation_id: organisationId,
                        customer_id: effectiveCustomerId,
                        quote_id: quote?.id ?? null,
                        type: method,
                        recipient: finalRecipient,
                        subject: method === 'email' ? subject : null,
                        content: message,
                        status: 'sent',
                        created_by_user_id: user?.id ?? null,
                    } as any);
                } catch (logErr) {
                    console.error('Communication log failed (non-fatal):', logErr);
                }
            }

            success('Skickat', `${method === 'email' ? 'E-post' : 'SMS'} har skickats till ${finalRecipient}`);
            onSent?.();
            onCommunicationSent?.();
            onClose();
        } catch (err: any) {
            console.error('Error sending:', err);
            showError('Fel', 'Kunde inte skicka: ' + (err.message || 'Okänt fel'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                            <Send className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {quote ? 'Skicka Offert' : 'Kontakta Kund'}
                            </h2>
                            {quote ? (
                                <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                                    <span className="flex items-center gap-1">
                                        <FileText className="w-3.5 h-3.5" />
                                        {quote.quote_number || 'Utkast'}
                                    </span>
                                    <span className="text-gray-300">•</span>
                                    <span className="flex items-center gap-1">
                                        <DollarSign className="w-3.5 h-3.5" />
                                        {formatCurrency(quote.total_amount)}
                                    </span>
                                    {quote.valid_until && (
                                        <>
                                            <span className="text-gray-300">•</span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5" />
                                                Giltig till {formatDate(quote.valid_until)}
                                            </span>
                                        </>
                                    )}
                                </div>
                            ) : effectiveCustomer ? (
                                <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                                    <User className="w-3.5 h-3.5" />
                                    {effectiveCustomer.name}
                                </p>
                            ) : null}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Customer Info Section */}
                    <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <User className="w-4 h-4" />
                                Kundinformation
                            </h3>
                            <button
                                onClick={() => setIsEditingCustomer(!isEditingCustomer)}
                                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                            >
                                <Edit2 className="w-3 h-3" />
                                {isEditingCustomer ? 'Avbryt redigering' : 'Redigera'}
                            </button>
                        </div>

                        {isEditingCustomer ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Namn</label>
                                    <input
                                        type="text"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">E-post</label>
                                    <input
                                        type="email"
                                        value={customerEmail}
                                        onChange={(e) => {
                                            setCustomerEmail(e.target.value);
                                            if (method === 'email') setRecipient(e.target.value);
                                        }}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Telefon</label>
                                    <input
                                        type="tel"
                                        value={customerPhone}
                                        onChange={(e) => {
                                            setCustomerPhone(e.target.value);
                                            if (method === 'sms') setRecipient(e.target.value);
                                        }}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-6 text-sm flex-wrap">
                                <div>
                                    <span className="text-gray-500">Namn:</span>
                                    <span className="ml-2 font-medium text-gray-900">{customerName || 'Ej angivet'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">E-post:</span>
                                    <span className="ml-2 font-medium text-gray-900">{customerEmail || 'Ej angivet'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Telefon:</span>
                                    <span className="ml-2 font-medium text-gray-900">{customerPhone || 'Ej angivet'}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Method Selector */}
                    <div className="flex p-1 bg-gray-100 rounded-lg">
                        <button
                            onClick={() => {
                                setMethod('email');
                                setRecipient(isEditingCustomer ? customerEmail : (effectiveCustomer?.email || ''));
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md transition-all ${method === 'email' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Mail className="w-4 h-4" />
                            E-post
                        </button>
                        <button
                            onClick={() => {
                                setMethod('sms');
                                setRecipient(isEditingCustomer ? customerPhone : (effectiveCustomer?.phone_number || ''));
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md transition-all ${method === 'sms' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <MessageSquare className="w-4 h-4" />
                            SMS
                        </button>
                    </div>

                    {/* Email template type selector — only when quote is present */}
                    {method === 'email' && quote && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Välj mall</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {TEMPLATE_OPTIONS.map((template) => (
                                    <button
                                        key={template.value}
                                        onClick={() => setTemplateType(template.value)}
                                        className={`p-3 rounded-lg border-2 text-left transition-all ${templateType === template.value
                                            ? 'border-indigo-500 bg-indigo-50'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <p className={`text-sm font-medium ${templateType === template.value ? 'text-indigo-700' : 'text-gray-900'}`}>
                                            {template.label}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quote template selector — only when templates exist and quote is present */}
                    {quote && templates.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Offertmall</label>
                            <select
                                value={selectedTemplateId}
                                onChange={(e) => setSelectedTemplateId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:ring-blue-500 focus:border-blue-500"
                            >
                                {templates.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Recipient */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {method === 'email' ? 'Mottagare (E-post)' : 'Mottagare (Mobil)'}
                        </label>
                        <input
                            type={method === 'email' ? 'email' : 'tel'}
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder={method === 'email' ? 'exempel@foretag.se' : '070-123 45 67'}
                        />
                    </div>

                    {/* Subject — email only */}
                    {method === 'email' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ämne</label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Ange ämne..."
                            />
                        </div>
                    )}

                    {/* Message Body */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700">Meddelande</label>
                            {/* Acceptance link toggle — only for quote emails */}
                            {method === 'email' && quote && (
                                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={includeAcceptanceLink}
                                        onChange={(e) => setIncludeAcceptanceLink(e.target.checked)}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    Inkludera länk för godkännande
                                </label>
                            )}
                        </div>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={method === 'sms' ? 4 : 10}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none font-mono text-sm"
                            placeholder={method === 'sms' ? 'Skriv ditt SMS...' : 'Skriv ditt meddelande...'}
                        />
                        {method === 'sms' && (
                            <p className="text-xs text-gray-500 mt-1">
                                {message.length} / 160 tecken ({Math.ceil(message.length / 160) || 1} SMS)
                            </p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                        {quote
                            ? `${quote.line_items?.length || 0} rader • ${formatCurrency(quote.total_amount)}`
                            : effectiveCustomer?.name || ''}
                    </div>
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={onClose} disabled={loading}>
                            Avbryt
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleSend}
                            disabled={loading}
                            icon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        >
                            {loading ? 'Skickar...' : `Skicka ${method === 'email' ? 'e-post' : 'SMS'}`}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
