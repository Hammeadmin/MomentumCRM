
import { useState, useEffect } from 'react';
import { X, Send, Mail, MessageSquare, Loader2, User, FileText, Calendar, DollarSign, Edit2 } from 'lucide-react';
import { Button } from './ui';
import { useToast } from '../hooks/useToast';
import { sendQuoteEmail, generateQuoteEmailTemplate, type QuoteWithRelations } from '../lib/quotes';
import { formatCurrency, formatDate } from '../lib/database';

interface SendQuoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    quote: QuoteWithRelations;
    onSent?: () => void;
}

type SendMethod = 'email' | 'sms';
type TemplateType = 'standard' | 'formal' | 'friendly' | 'follow_up';

const TEMPLATE_OPTIONS: { value: TemplateType; label: string; description: string }[] = [
    { value: 'standard', label: 'Standard', description: 'Professionellt och neutralt' },
    { value: 'formal', label: 'Formell', description: 'Extra professionell ton' },
    { value: 'friendly', label: 'Vänlig', description: 'Personlig och välkomnande' },
    { value: 'follow_up', label: 'Påminnelse', description: 'Uppföljning av tidigare skickad offert' },
];

export default function SendQuoteModal({ isOpen, onClose, quote, onSent }: SendQuoteModalProps) {
    const { success, error: showError } = useToast();
    const [method, setMethod] = useState<SendMethod>('email');
    const [loading, setLoading] = useState(false);
    const [templateType, setTemplateType] = useState<TemplateType>('standard');
    const [isEditingCustomer, setIsEditingCustomer] = useState(false);

    // Form state
    const [recipient, setRecipient] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [includeAcceptanceLink, setIncludeAcceptanceLink] = useState(true);

    // Editable customer info
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');

    // Initialize form with customer data
    useEffect(() => {
        if (isOpen && quote) {
            // Set customer info
            setCustomerName(quote.customer?.name || '');
            setCustomerEmail(quote.customer?.email || '');
            setCustomerPhone(quote.customer?.phone_number || '');
            setRecipient(quote.customer?.email || '');

            // Generate template
            updateMessageFromTemplate('standard');
        }
    }, [isOpen, quote]);

    // Update message when template or acceptance link changes
    useEffect(() => {
        if (isOpen && quote) {
            updateMessageFromTemplate(templateType);
        }
    }, [templateType, includeAcceptanceLink]);

    const updateMessageFromTemplate = (template: TemplateType) => {
        const { subject: defaultSubject, body } = generateQuoteEmailTemplate(quote, includeAcceptanceLink, template);
        setSubject(defaultSubject);
        setMessage(body);
    };

    if (!isOpen) return null;

    const handleSend = async () => {
        const finalRecipient = method === 'email' ? (isEditingCustomer ? customerEmail : recipient) : (isEditingCustomer ? customerPhone : recipient);

        if (!finalRecipient) {
            showError('Fel', `Ange en giltig ${method === 'email' ? 'e-postadress' : 'mobilnummer'}.`);
            return;
        }

        if (!message) {
            showError('Fel', 'Meddelandet kan inte vara tomt.');
            return;
        }

        setLoading(true);
        try {
            if (method === 'email') {
                const result = await sendQuoteEmail(quote.id, {
                    recipient_email: finalRecipient,
                    subject,
                    body: message,
                    include_acceptance_link: includeAcceptanceLink
                });

                if (result.error) throw result.error;

                success('Skickat', `Offerten har skickats till ${finalRecipient}`);
                onSent?.();
                onClose();
            } else {
                // SMS implementation - simulated for now
                await new Promise(resolve => setTimeout(resolve, 1000));
                success('Skickat', `SMS har skickats till ${finalRecipient}`);
                onSent?.();
                onClose();
            }
        } catch (err: any) {
            console.error('Error sending quote:', err);
            showError('Fel', 'Kunde inte skicka offerten: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                            <Send className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Skicka Offert</h2>
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
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/50">
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
                            <div className="flex items-center gap-6 text-sm">
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
                                setRecipient(customerEmail);
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md transition-all ${method === 'email' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Mail className="w-4 h-4" />
                            E-post
                        </button>
                        <button
                            onClick={() => {
                                setMethod('sms');
                                setRecipient(customerPhone);
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md transition-all ${method === 'sms' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <MessageSquare className="w-4 h-4" />
                            SMS
                        </button>
                    </div>

                    {/* Template Selector - Only for Email */}
                    {method === 'email' && (
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

                    {/* Email Specific Fields */}
                    {method === 'email' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ämne</label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    )}

                    {/* Message Body */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700">Meddelande</label>
                            {method === 'email' && (
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
                        />
                        {method === 'sms' && (
                            <p className="text-xs text-gray-500 mt-1">
                                {message.length} / 160 tecken ({Math.ceil(message.length / 160)} SMS)
                            </p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                        {quote.line_items?.length || 0} rader • {formatCurrency(quote.total_amount)}
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
