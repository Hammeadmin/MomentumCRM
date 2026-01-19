/**
 * TimeEntryModal Component
 * 
 * Modal for creating/editing time entries with:
 * - Map showing job location
 * - Date and time pickers
 * - Worker assignment
 * - Notes and materials
 */

import { useState, useEffect } from 'react';
import { X, Clock, User, MapPin, Calendar, Save, Loader } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { TimeLog, UserProfile, Order } from '../types/database';
import { LocationMap, StaticLocationMap } from './LocationMap';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface TimeEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    order?: Order | null;
    existingEntry?: TimeLog | null;
    onSave?: (entry: Partial<TimeLog>) => void;
    workers?: UserProfile[];
}

export function TimeEntryModal({
    isOpen,
    onClose,
    order,
    existingEntry,
    onSave,
    workers = []
}: TimeEntryModalProps) {
    const { userId, organisationId } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        order_id: order?.id || '',
        user_id: existingEntry?.user_id || userId || '',
        date: format(new Date(), 'yyyy-MM-dd'),
        start_time: '08:00',
        end_time: '17:00',
        break_duration: 30,
        notes: '',
        work_type: order?.job_type || ''
    });

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setFormData({
                order_id: order?.id || '',
                user_id: existingEntry?.user_id || userId || '',
                date: existingEntry?.start_time
                    ? format(new Date(existingEntry.start_time), 'yyyy-MM-dd')
                    : format(new Date(), 'yyyy-MM-dd'),
                start_time: existingEntry?.start_time
                    ? format(new Date(existingEntry.start_time), 'HH:mm')
                    : '08:00',
                end_time: existingEntry?.end_time
                    ? format(new Date(existingEntry.end_time), 'HH:mm')
                    : '17:00',
                break_duration: existingEntry?.break_duration || 30,
                notes: existingEntry?.notes || '',
                work_type: existingEntry?.work_type || order?.job_type || ''
            });
            setError(null);
        }
    }, [isOpen, order, existingEntry, userId]);

    const calculateHours = () => {
        const [startH, startM] = formData.start_time.split(':').map(Number);
        const [endH, endM] = formData.end_time.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        const worked = (endMinutes - startMinutes - formData.break_duration) / 60;
        return Math.max(0, worked);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const startDateTime = new Date(`${formData.date}T${formData.start_time}`);
            const endDateTime = new Date(`${formData.date}T${formData.end_time}`);

            const entry: Partial<TimeLog> = {
                order_id: formData.order_id || null,
                user_id: formData.user_id || null,
                start_time: startDateTime.toISOString(),
                end_time: endDateTime.toISOString(),
                break_duration: formData.break_duration,
                notes: formData.notes || null,
                work_type: formData.work_type || null,
                photo_urls: [],
                materials_used: []
            };

            if (existingEntry?.id) {
                // Update existing
                const { error: updateError } = await supabase
                    .from('time_logs')
                    .update(entry)
                    .eq('id', existingEntry.id);

                if (updateError) throw updateError;
            } else {
                // Create new
                const { error: insertError } = await supabase
                    .from('time_logs')
                    .insert(entry);

                if (insertError) throw insertError;
            }

            onSave?.(entry);
            onClose();
        } catch (err: any) {
            console.error('Error saving time entry:', err);
            setError(err.message || 'Kunde inte spara tidsregistrering');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const hours = calculateHours();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                        {existingEntry ? 'Redigera tid' : 'Registrera tid'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        {/* Map Section */}
                        {order?.customer && (
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                    <MapPin className="w-4 h-4 inline mr-1" />
                                    Arbetsplats
                                </label>
                                <LocationMap
                                    address={order.customer.address || ''}
                                    city={order.customer.city || ''}
                                    postalCode={order.customer.postal_code || ''}
                                    title={order.title}
                                    height="150px"
                                    showNavigationButton={true}
                                />
                            </div>
                        )}

                        {/* Order Info */}
                        {order && (
                            <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                                <p className="text-sm font-medium text-zinc-900 dark:text-white">
                                    {order.title}
                                </p>
                                {order.customer && (
                                    <p className="text-xs text-zinc-500 mt-0.5">
                                        {order.customer.name} • {order.customer.city}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Worker Selection */}
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                                <User className="w-4 h-4 inline mr-1" />
                                Medarbetare
                            </label>
                            <select
                                value={formData.user_id}
                                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            >
                                <option value="">Välj medarbetare</option>
                                {workers.map(w => (
                                    <option key={w.id} value={w.id}>{w.full_name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Date */}
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                                <Calendar className="w-4 h-4 inline mr-1" />
                                Datum
                            </label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            />
                        </div>

                        {/* Time Range */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                                    <Clock className="w-4 h-4 inline mr-1" />
                                    Starttid
                                </label>
                                <input
                                    type="time"
                                    value={formData.start_time}
                                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                    className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                                    Sluttid
                                </label>
                                <input
                                    type="time"
                                    value={formData.end_time}
                                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                    className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Break */}
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                                Rast (minuter)
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="5"
                                value={formData.break_duration}
                                onChange={(e) => setFormData({ ...formData, break_duration: parseInt(e.target.value) || 0 })}
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            />
                        </div>

                        {/* Calculated Hours */}
                        <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg border border-cyan-200 dark:border-cyan-800">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-cyan-700 dark:text-cyan-300">Arbetade timmar:</span>
                                <span className="text-lg font-bold text-cyan-600">{hours.toFixed(1)} h</span>
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                                Anteckningar
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows={3}
                                placeholder="Beskriv utfört arbete..."
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                            />
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                        >
                            Avbryt
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            Spara
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default TimeEntryModal;
