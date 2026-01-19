import React, { useState } from 'react';
import { X, Bell, Calendar, Clock, FileText, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createCalendarEvent } from '../lib/calendar';
import { useToast } from '../hooks/useToast';
import type { EventType } from '../types/database';

interface ReminderModalProps {
    isOpen: boolean;
    onClose: () => void;
    entityType: 'invoice' | 'quote' | 'lead';
    entityId: string;
    entityTitle: string;
    onSave?: () => void;
}

const ReminderModal: React.FC<ReminderModalProps> = ({
    isOpen,
    onClose,
    entityType,
    entityId,
    entityTitle,
    onSave
}) => {
    const { user } = useAuth();
    const { success, error: showError } = useToast();
    const [loading, setLoading] = useState(false);

    // Form State
    const [date, setDate] = useState('');
    const [time, setTime] = useState('09:00');
    const [note, setNote] = useState('');
    const [reminderType, setReminderType] = useState<EventType>('reminder');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!date || !time) {
            showError('Fel', 'Vänligen ange datum och tid.');
            return;
        }

        setLoading(true);

        try {
            // Construct start and end time (default 15 min for reminder)
            const startTime = `${date}T${time}:00`;
            // Simple end time calc - just add 15 mins roughly or keep same for point-in-time
            const endDateObj = new Date(startTime);
            endDateObj.setMinutes(endDateObj.getMinutes() + 15);
            const endTime = endDateObj.toISOString().slice(0, 16); // format to string if needed by DB, currently simpler

            const eventPayload: any = { // Using any loosely here to match createCalendarEvent args which might overlap
                organisation_id: user.organisation_id, // Assuming user has this on profile or we fetch it
                title: `Påminnelse: ${entityTitle}`,
                description: note || `Uppföljning av ${entityType}`,
                type: reminderType,
                start_time: startTime,
                end_time: endTime, // or same as start
                assigned_to_user_id: user.id,
            };

            // Conditionally add the relation ID
            if (entityType === 'invoice') eventPayload.related_invoice_id = entityId;
            if (entityType === 'quote') eventPayload.related_quote_id = entityId;
            if (entityType === 'lead') eventPayload.related_lead_id = entityId;

            const { error } = await createCalendarEvent(eventPayload);

            if (error) throw error;

            success('Sparat', 'Påminnelse har lagts till i kalendern.');
            if (onSave) onSave();
            onClose();
        } catch (err: any) {
            console.error('Error creating reminder:', err);
            showError('Fel', 'Kunde inte skapa påminnelse.');
        } finally {
            setLoading(false);
        }
    };

    // Preset quick times
    const setQuickTime = (daysFromNow: number) => {
        const d = new Date();
        d.setDate(d.getDate() + daysFromNow);
        setDate(d.toISOString().split('T')[0]);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden transform transition-all" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <Bell className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Sätt påminnelse</h3>
                            <p className="text-xs text-gray-500 truncate max-w-[200px]">{entityTitle}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">

                    {/* Quick Actions */}
                    <div className="flex gap-2 mb-2">
                        <button type="button" onClick={() => setQuickTime(1)} className="flex-1 py-2 px-3 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors">
                            Imorgon
                        </button>
                        <button type="button" onClick={() => setQuickTime(3)} className="flex-1 py-2 px-3 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors">
                            Om 3 dagar
                        </button>
                        <button type="button" onClick={() => setQuickTime(7)} className="flex-1 py-2 px-3 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors">
                            Om 1 vecka
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Datum</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                <input
                                    type="date"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tid</label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                <input
                                    type="time"
                                    value={time}
                                    onChange={e => setTime(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Anteckning</label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <textarea
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                placeholder="Vad behöver göras?"
                                rows={3}
                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none"
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-medium py-2.5 px-4 rounded-lg transition-all shadow-sm shadow-orange-200 disabled:opacity-70"
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    Spara påminnelse
                                </>
                            )}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default ReminderModal;
