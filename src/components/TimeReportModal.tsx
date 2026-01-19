
import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, Hash, FileText, AlertCircle } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { addTimeLog } from '../lib/timeLogs';
import type { Order } from '../types/database';

interface TimeReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    userId: string;
    preselectedOrder?: Order;
    availableOrders: any[];
}

export default function TimeReportModal({
    isOpen,
    onClose,
    onSuccess,
    userId,
    preselectedOrder,
    availableOrders
}: TimeReportModalProps) {
    const { success, error: showError } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        orderId: '',
        date: new Date().toISOString().substring(0, 10),
        startTime: '08:00',
        endTime: '17:00',
        breakDuration: 60,
        notes: ''
    });

    useEffect(() => {
        if (isOpen) {
            setFormData(prev => ({
                ...prev,
                orderId: preselectedOrder?.id || availableOrders[0]?.related_order_id || '',
                date: new Date().toISOString().substring(0, 10),
                startTime: '08:00',
                endTime: '17:00'
            }));
        }
    }, [isOpen, preselectedOrder, availableOrders]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`);
            const endDateTime = new Date(`${formData.date}T${formData.endTime}:00`);

            if (endDateTime <= startDateTime) {
                showError('Ogiltig tid', 'Sluttid måste vara efter starttid.');
                setLoading(false);
                return;
            }

            const totalMinutes = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60);
            const workMinutes = totalMinutes - formData.breakDuration;

            // Calculate pay based on hours (simplified)
            const hourlyRate = 650; // Should fetch from profile
            const totalAmount = (workMinutes / 60) * hourlyRate;

            const { error } = await addTimeLog({
                user_id: userId,
                order_id: formData.orderId,
                start_time: startDateTime.toISOString(),
                end_time: endDateTime.toISOString(),
                break_duration: formData.breakDuration,
                notes: formData.notes,
                hourly_rate: hourlyRate,
                total_amount: Math.round(totalAmount),
                is_approved: false,
                photo_urls: [],
                materials_used: [],
                travel_time_minutes: 0
            });

            if (error) throw error;

            success('Tidrapport sparad', 'Din tid har rapporterats.');
            onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            showError('Fel', 'Kunde inte spara tidrapport.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center">
                        <Clock className="w-6 h-6 mr-2 text-blue-600" />
                        Rapportera Tid
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Uppdrag
                        </label>
                        <select
                            required
                            value={formData.orderId}
                            onChange={(e) => setFormData(prev => ({ ...prev, orderId: e.target.value }))}
                            className="w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Välj uppdrag...</option>
                            {availableOrders.map((event) => (
                                <option key={event.related_order.id} value={event.related_order.id}>
                                    {event.related_order.title} ({event.related_order.customer?.name})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Datum
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="date"
                                    required
                                    value={formData.date}
                                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                    className="w-full pl-9 rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Rast (min)
                            </label>
                            <input
                                type="number"
                                min="0"
                                required
                                value={formData.breakDuration}
                                onChange={(e) => setFormData(prev => ({ ...prev, breakDuration: Number(e.target.value) }))}
                                className="w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Starttid
                            </label>
                            <input
                                type="time"
                                required
                                value={formData.startTime}
                                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                                className="w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Sluttid
                            </label>
                            <input
                                type="time"
                                required
                                value={formData.endTime}
                                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                                className="w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Anteckningar
                        </label>
                        <textarea
                            rows={3}
                            value={formData.notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            className="w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Vad har du gjort?"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-50 rounded-lg transition-colors"
                        >
                            Avbryt
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Sparar...' : 'Rapportera tid'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
