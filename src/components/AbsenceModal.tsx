
import React, { useState } from 'react';
import { X, Calendar, AlertTriangle, UserX, Stethoscope, Baby, Palmtree } from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../contexts/AuthContext';
import { updateAttendance } from '../lib/teams';
import type { AttendanceStatus } from '../types/database';

interface AbsenceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    userId: string;
}

const ABSENCE_TYPES: { id: AttendanceStatus; label: string; icon: any; color: string }[] = [
    { id: 'sjuk', label: 'Sjuk', icon: Stethoscope, color: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' },
    { id: 'vab', label: 'VAB', icon: Baby, color: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' },
    { id: 'semester', label: 'Semester', icon: Palmtree, color: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100' },
    { id: 'tjänstledig', label: 'Tjänstledig', icon: UserX, color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' },
];

export default function AbsenceModal({
    isOpen,
    onClose,
    onSuccess,
    userId
}: AbsenceModalProps) {
    const { success, error: showError } = useToast();
    const { organisationId } = useAuth();
    const [loading, setLoading] = useState(false);
    const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
    const [selectedType, setSelectedType] = useState<AttendanceStatus | null>(null);

    const handleSubmit = async () => {
        if (!selectedType || !organisationId) return;
        setLoading(true);

        try {
            const { error } = await updateAttendance({
                organisation_id: organisationId,
                user_id: userId,
                date: date,
                status: selectedType
            });

            if (error) throw error;

            success('Frånvaro anmäld', `Din frånvaro (${selectedType}) har registrerats.`);
            onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            showError('Fel', 'Kunde inte anmäla frånvaro.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center">
                        <AlertTriangle className="w-6 h-6 mr-2 text-orange-600" />
                        Anmäl Frånvaro
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Datum
                        </label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="date"
                                required
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full pl-9 rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Orsak
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {ABSENCE_TYPES.map((type) => {
                                const Icon = type.icon;
                                const isSelected = selectedType === type.id;
                                return (
                                    <button
                                        key={type.id}
                                        onClick={() => setSelectedType(type.id)}
                                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${isSelected
                                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                                            : `${type.color} border-transparent`
                                            }`}
                                    >
                                        <Icon className="w-6 h-6 mb-2" />
                                        <span className="font-medium">{type.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-50 rounded-lg transition-colors"
                        >
                            Avbryt
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !selectedType}
                            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Sparar...' : 'Skicka anmälan'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
