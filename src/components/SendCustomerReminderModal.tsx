import React, { useState, useEffect } from 'react';
import { X, Mail, MessageSquare, Send, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Button } from './ui';
import { useToast } from '../hooks/useToast';

interface SendCustomerReminderModalProps {
    isOpen: boolean;
    onClose: () => void;
    entityType: 'invoice' | 'quote';
    entity: any; // InvoiceWithRelations or QuoteWithRelations
    customerEmail?: string;
    customerPhone?: string;
}

type ReminderLevel = 'courtesy' | 'first' | 'second' | 'final' | 'followup_1' | 'followup_2';

const TEMPLATES: Record<string, Record<ReminderLevel, { subject: string; body: string }>> = {
    invoice: {
        courtesy: {
            subject: 'Vänlig påminnelse om faktura #{id}',
            body: 'Hej,\n\nDetta är en vänlig påminnelse om att faktura #{id} snart förfaller till betalning. Om du redan har betalat kan du bortse från detta meddelande.\n\nMvh,\n{company}'
        },
        first: {
            subject: 'Påminnelse: Obetald faktura #{id}',
            body: 'Hej,\n\nVi har inte mottagit betalning för faktura #{id} som förföll {duedate}. Vänligen betala omgående.\n\nMvh,\n{company}'
        },
        second: {
            subject: 'Krav: Obetald faktura #{id}',
            body: 'Hej,\n\nFaktura #{id} är fortfarande obetald. Vi ber er reglera skulden omedelbart för att undvika vidare åtgärder.\n\nMvh,\n{company}'
        },
        final: {
            subject: 'Sista betalningspåminnelse faktura #{id}',
            body: 'Detta är en sista påminnelse. Om betalning inte inkommer inom 3 dagar kommer ärendet att gå vidare till inkasso.\n\nMvh,\n{company}'
        },
        // Unused for invoices but type safe
        followup_1: { subject: '', body: '' },
        followup_2: { subject: '', body: '' }
    },
    quote: {
        followup_1: {
            subject: 'Uppföljning av offert #{id}',
            body: 'Hej,\n\nJag undrar om du hunnit titta på offerten jag skickade? Hör gärna av dig om du har några frågor.\n\nMvh,\n{company}'
        },
        followup_2: {
            subject: 'Angående din offertförfrågan #{id}',
            body: 'Hej,\n\nHar du några funderingar kring offerten? Den är giltig till {duedate}.\n\nMvh,\n{company}'
        },
        // Unused for quotes
        courtesy: { subject: '', body: '' },
        first: { subject: '', body: '' },
        second: { subject: '', body: '' },
        final: { subject: '', body: '' }
    }
};

export default function SendCustomerReminderModal({
    isOpen,
    onClose,
    entityType,
    entity,
    customerEmail,
    customerPhone
}: SendCustomerReminderModalProps) {
    const { success, error } = useToast();
    const [channel, setChannel] = useState<'email' | 'sms' | 'both'>('email');
    const [selectedLevel, setSelectedLevel] = useState<ReminderLevel>(
        entityType === 'invoice' ? 'courtesy' : 'followup_1'
    );
    const [messageSubject, setMessageSubject] = useState('');
    const [messageBody, setMessageBody] = useState('');
    const [sending, setSending] = useState(false);
    const [autoRemind, setAutoRemind] = useState(false);

    // Load template when level changes
    useEffect(() => {
        if (!entity) return;
        const template = TEMPLATES[entityType][selectedLevel];
        const companyName = entity.organisation?.name || 'Ditt Företag';

        let subject = template.subject
            .replace('{id}', entityType === 'invoice' ? entity.invoice_number : entity.quote_number || entity.id.substring(0, 8));

        let body = template.body
            .replace('{id}', entityType === 'invoice' ? entity.invoice_number : entity.quote_number || entity.id.substring(0, 8))
            .replace('{duedate}', entity.due_date || 'snart')
            .replace('{company}', companyName);

        setMessageSubject(subject);
        setMessageBody(body);
    }, [selectedLevel, entity, entityType]);

    if (!isOpen) return null;

    const handleSend = async () => {
        setSending(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));

            success('Påminnelse skickad', `Påminnelse skickades via ${channel === 'both' ? 'Email & SMS' : channel === 'email' ? 'Email' : 'SMS'}`);
            onClose();
        } catch (err) {
            error('Kunde inte skicka', 'Ett fel uppstod vid sändning.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <Send className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">
                                Skicka {entityType === 'invoice' ? 'Betalningspåminnelse' : 'Uppföljning'}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {entityType === 'invoice' ? 'Faktura' : 'Offert'} #{entityType === 'invoice' ? entity?.invoice_number : (entity?.quote_number || entity?.id?.substring(0, 8))}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto">
                    {/* Recipient Info */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Mottagare</h4>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-gray-400" />
                                <span className={customerEmail ? 'text-gray-900' : 'text-gray-400 italic'}>
                                    {customerEmail || 'Ingen e-post angiven'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-gray-400" />
                                <span className={customerPhone ? 'text-gray-900' : 'text-gray-400 italic'}>
                                    {customerPhone || 'Inget telefonnummer'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Channel Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Kanal</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setChannel('email')}
                                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${channel === 'email' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                                        }`}
                                >
                                    E-post
                                </button>
                                <button
                                    onClick={() => setChannel('sms')}
                                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${channel === 'sms' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                                        }`}
                                >
                                    SMS
                                </button>
                                <button
                                    onClick={() => setChannel('both')}
                                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${channel === 'both' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                                        }`}
                                >
                                    Båda
                                </button>
                            </div>
                        </div>

                        {/* Template Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Mall / Nivå</label>
                            <select
                                value={selectedLevel}
                                onChange={(e) => setSelectedLevel(e.target.value as ReminderLevel)}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2"
                            >
                                {entityType === 'invoice' ? (
                                    <>
                                        <option value="courtesy">Vänlig påminnelse (Innan förfall)</option>
                                        <option value="first">Första påminnelsen (Efter förfall)</option>
                                        <option value="second">Andra påminnelsen (Krav)</option>
                                        <option value="final">Sista varningen (Inkasso)</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="followup_1">Uppföljning 1 (Har du sett?)</option>
                                        <option value="followup_2">Uppföljning 2 (Giltighetstid)</option>
                                    </>
                                )}
                            </select>
                        </div>
                    </div>

                    {/* Message Editor */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">Meddelande</label>

                        {channel !== 'sms' && (
                            <input
                                type="text"
                                value={messageSubject}
                                onChange={(e) => setMessageSubject(e.target.value)}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                placeholder="Ämne..."
                            />
                        )}

                        <div className="relative">
                            <textarea
                                value={messageBody}
                                onChange={(e) => setMessageBody(e.target.value)}
                                rows={6}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-3 font-mono"
                            />
                            {channel === 'sms' && (
                                <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                                    {messageBody.length} tecken
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Auto-reminder Option */}
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <input
                            type="checkbox"
                            id="autoRemind"
                            checked={autoRemind}
                            onChange={(e) => setAutoRemind(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="autoRemind" className="text-sm text-blue-900 cursor-pointer select-none">
                            Skicka automatiskt ny påminnelse om ej betald inom 3 dagar (Föreslås)
                        </label>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
                    <Button variant="outline" onClick={onClose} disabled={sending}>
                        Avbryt
                    </Button>
                    <Button variant="primary" onClick={handleSend} disabled={sending} icon={<Send className="w-4 h-4" />}>
                        {sending ? 'Skickar...' : 'Skicka påminnelse'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
