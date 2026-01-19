
import React, { useState, useEffect } from 'react';
import { X, Calendar, CheckCircle, Users, Loader2 } from 'lucide-react';
import { Button } from './ui';
import { UserProfile, AttendanceStatus, USER_ROLE_LABELS } from '../types/database';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

const toISODate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
const getWeekDays = () => {
    const start = new Date(currentWeek);
    const days = [];

    for (let i = 0; i < 7; i++) {
        const day = new Date(start);
        day.setDate(start.getDate() + i);
        days.push(day);
    }

    return days;
};

interface BulkAttendanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    employees: UserProfile[];
    onSave: (userIds: string[], dates: Date[], status: AttendanceStatus | null) => Promise<void>;
}

const ATTENDANCE_OPTIONS: { value: AttendanceStatus | null; label: string; color: string; bgColor: string }[] = [
    { value: 'present', label: 'Närvarande', color: 'text-green-800', bgColor: 'bg-green-100' },
    { value: 'sick', label: 'Sjuk', color: 'text-red-800', bgColor: 'bg-red-100' },
    { value: 'vacation', label: 'Semester', color: 'text-yellow-800', bgColor: 'bg-yellow-100' },
    { value: 'leave', label: 'Tjänstledig', color: 'text-blue-800', bgColor: 'bg-blue-100' },
    { value: 'absent', label: 'Frånvarande', color: 'text-gray-800', bgColor: 'bg-gray-200' },
    { value: null, label: 'Rensa', color: 'text-gray-500', bgColor: 'bg-white' }
];

export default function BulkAttendanceModal({ isOpen, onClose, employees, onSave }: BulkAttendanceModalProps) {
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [startDate, setStartDate] = useState<string>(toISODate(new Date()));
    const [endDate, setEndDate] = useState<string>(toISODate(new Date()));
    const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus | null>('present');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Reset or init state
            setSelectedUserIds([]);
            setStartDate(toISODate(new Date()));
            setEndDate(toISODate(new Date()));
            setLoading(false);
        }
    }, [isOpen]);

    const handleToggleUser = (userId: string) => {
        setSelectedUserIds(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleSelectAllUsers = () => {
        if (selectedUserIds.length === employees.length) {
            setSelectedUserIds([]);
        } else {
            setSelectedUserIds(employees.map(e => e.id));
        }
    };

    const calculateDays = () => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = [];
        for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
            days.push(new Date(dt));
        }
        return days;
    };

    const handleSubmit = async () => {
        if (selectedUserIds.length === 0) return;

        setLoading(true);
        try {
            const dateRange = calculateDays();
            await onSave(selectedUserIds, dateRange, selectedStatus);
            onClose();
        } catch (error) {
            console.error("Bulk update failed", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Users className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Masshantera Närvaro</h3>
                            <p className="text-sm text-gray-500">Uppdatera närvaro för flera anställda samtidigt</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Step 1: Select Users */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700">1. Välj Anställda ({selectedUserIds.length})</label>
                            <button onClick={handleSelectAllUsers} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                                {selectedUserIds.length === employees.length ? 'Avmarkera alla' : 'Välj alla'}
                            </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                            {employees.map(user => (
                                <div
                                    key={user.id}
                                    onClick={() => handleToggleUser(user.id)}
                                    className={`flex items-center p-2 rounded-md cursor-pointer transition-all ${selectedUserIds.includes(user.id)
                                        ? 'bg-blue-100 border-blue-200 text-blue-800'
                                        : 'bg-white border border-gray-200 hover:border-blue-300'
                                        }`}
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center mr-2 ${selectedUserIds.includes(user.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                                        }`}>
                                        {selectedUserIds.includes(user.id) && <CheckCircle className="w-3 h-3 text-white" />}
                                    </div>
                                    <span className="text-sm truncate">{user.full_name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Step 2: Select Date Range */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700">2. Välj Period</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Startdatum</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Slutdatum</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 3: Select Status */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700">3. Välj Status</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {ATTENDANCE_OPTIONS.map(option => (
                                <button
                                    key={option.label}
                                    onClick={() => setSelectedStatus(option.value)}
                                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${selectedStatus === option.value
                                        ? `ring-2 ring-blue-500 ${option.bgColor} border-transparent`
                                        : 'bg-white border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <span className={`font-semibold ${option.color}`}>{option.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="flex items-center justify-end p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl space-x-3">
                    <Button variant="outline" onClick={onClose} disabled={loading}>Avbryt</Button>
                    <Button
                        onClick={handleSubmit}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={loading || selectedUserIds.length === 0}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uppdaterar...
                            </>
                        ) : (
                            'Tillämpa Ändringar'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}


