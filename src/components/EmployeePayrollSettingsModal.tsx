import React, { useState, useEffect } from 'react';
import { X, DollarSign, Clock, Users, Briefcase } from 'lucide-react';
import { Button } from './ui';
import type { UserProfile, EmploymentType } from '../types/database';
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks/useToast';

interface EmployeePayrollSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    employee: UserProfile;
    onSave: (updatedEmployee: UserProfile) => void;
}

const WORK_DAYS = [
    { value: 'mon', label: 'Mån' },
    { value: 'tue', label: 'Tis' },
    { value: 'wed', label: 'Ons' },
    { value: 'thu', label: 'Tor' },
    { value: 'fri', label: 'Fre' },
    { value: 'sat', label: 'Lör' },
    { value: 'sun', label: 'Sön' },
];

export default function EmployeePayrollSettingsModal({
    isOpen,
    onClose,
    employee,
    onSave,
}: EmployeePayrollSettingsModalProps) {
    const { success, error: showError } = useToast();

    // Form state
    const [employmentType, setEmploymentType] = useState<EmploymentType | null>(employee?.employment_type || null);
    const [hourlyRate, setHourlyRate] = useState<number | ''>(employee?.base_hourly_rate || '');
    const [monthlySalary, setMonthlySalary] = useState<number | ''>(employee?.base_monthly_salary || '');
    const [hasCommission, setHasCommission] = useState(employee?.has_commission || false);
    const [commissionRate, setCommissionRate] = useState<number | ''>(employee?.commission_rate || '');
    const [weeklyHours, setWeeklyHours] = useState<number>(40);
    const [workDays, setWorkDays] = useState<string[]>(['mon', 'tue', 'wed', 'thu', 'fri']);
    const [saving, setSaving] = useState(false);

    // Reset form when employee changes
    useEffect(() => {
        if (employee) {
            setEmploymentType(employee.employment_type || null);
            setHourlyRate(employee.base_hourly_rate || '');
            setMonthlySalary(employee.base_monthly_salary || '');
            setHasCommission(employee.has_commission || false);
            setCommissionRate(employee.commission_rate || '');
            // Load work schedule from employee profile
            setWeeklyHours(employee.weekly_hours || 40);
            setWorkDays(employee.work_days || ['mon', 'tue', 'wed', 'thu', 'fri']);
        }
    }, [employee]);

    const toggleWorkDay = (day: string) => {
        setWorkDays(prev =>
            prev.includes(day)
                ? prev.filter(d => d !== day)
                : [...prev, day]
        );
    };

    const handleSave = async () => {
        if (!employee) return;

        setSaving(true);
        try {
            const updates: Partial<UserProfile> = {
                employment_type: employmentType,
                base_hourly_rate: typeof hourlyRate === 'number' ? hourlyRate : null,
                base_monthly_salary: typeof monthlySalary === 'number' ? monthlySalary : null,
                has_commission: hasCommission,
                commission_rate: hasCommission && typeof commissionRate === 'number' ? commissionRate : null,
                weekly_hours: weeklyHours,
                work_days: workDays,
            };

            const { error } = await supabase
                .from('user_profiles')
                .update(updates)
                .eq('id', employee.id);

            if (error) throw error;

            success('Sparad', 'Löneinställningar har uppdaterats.');
            onSave({ ...employee, ...updates });
            onClose();
        } catch (err: any) {
            console.error('Error saving payroll settings:', err);
            showError('Kunde inte spara', err.message || 'Ett fel uppstod');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen || !employee) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Briefcase className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Löneinställningar</h2>
                            <p className="text-sm text-gray-600">{employee.full_name}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                    {/* Employment Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Anställningstyp
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setEmploymentType('hourly')}
                                className={`p-4 rounded-lg border-2 text-left transition-all ${employmentType === 'hourly'
                                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                <div className="flex items-center space-x-3">
                                    <Clock className={`w-5 h-5 ${employmentType === 'hourly' ? 'text-blue-600' : 'text-gray-400'}`} />
                                    <div>
                                        <p className={`font-medium ${employmentType === 'hourly' ? 'text-blue-900' : 'text-gray-900'}`}>
                                            Timanställd
                                        </p>
                                        <p className="text-xs text-gray-500">Betalas per arbetad timme</p>
                                    </div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setEmploymentType('salary')}
                                className={`p-4 rounded-lg border-2 text-left transition-all ${employmentType === 'salary'
                                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                <div className="flex items-center space-x-3">
                                    <DollarSign className={`w-5 h-5 ${employmentType === 'salary' ? 'text-blue-600' : 'text-gray-400'}`} />
                                    <div>
                                        <p className={`font-medium ${employmentType === 'salary' ? 'text-blue-900' : 'text-gray-900'}`}>
                                            Fast månadslön
                                        </p>
                                        <p className="text-xs text-gray-500">Fast månadsbelopp</p>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Conditional fields based on employment type */}
                    {employmentType === 'hourly' && (
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                            <label className="block text-sm font-medium text-blue-900 mb-2">
                                Timlön (kr/timme)
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={hourlyRate}
                                    onChange={(e) => setHourlyRate(e.target.value ? Number(e.target.value) : '')}
                                    placeholder="t.ex. 250"
                                    className="w-full px-4 py-2 pr-16 rounded-lg border border-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                    kr/h
                                </span>
                            </div>
                            <p className="text-xs text-blue-600 mt-2">
                                Beräknad lön baseras på antal närvarotimmar × timlön
                            </p>
                        </div>
                    )}

                    {employmentType === 'salary' && (
                        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                            <label className="block text-sm font-medium text-green-900 mb-2">
                                Fast månadslön (kr/månad)
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min="0"
                                    step="100"
                                    value={monthlySalary}
                                    onChange={(e) => setMonthlySalary(e.target.value ? Number(e.target.value) : '')}
                                    placeholder="t.ex. 43000"
                                    className="w-full px-4 py-2 pr-16 rounded-lg border border-green-200 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                    kr/mån
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Commission settings */}
                    <div className="border-t pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                                <Users className="w-5 h-5 text-purple-600" />
                                <div>
                                    <p className="font-medium text-gray-900">Provision</p>
                                    <p className="text-xs text-gray-500">För säljare och provisionsbaserade roller</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setHasCommission(!hasCommission)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${hasCommission ? 'bg-purple-600' : 'bg-gray-200'
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${hasCommission ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>

                        {hasCommission && (
                            <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                                <label className="block text-sm font-medium text-purple-900 mb-2">
                                    Provisionssats (%)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.5"
                                        value={commissionRate}
                                        onChange={(e) => setCommissionRate(e.target.value ? Number(e.target.value) : '')}
                                        placeholder="t.ex. 5"
                                        className="w-full px-4 py-2 pr-12 rounded-lg border border-purple-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                                        %
                                    </span>
                                </div>
                                <p className="text-xs text-purple-600 mt-2">
                                    Provision beräknas från ordervärden kopplade till denna anställd
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Work Schedule (simplified for now) */}
                    <div className="border-t pt-6">
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Arbetsdagar
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {WORK_DAYS.map(day => (
                                <button
                                    key={day.value}
                                    type="button"
                                    onClick={() => toggleWorkDay(day.value)}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${workDays.includes(day.value)
                                        ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                >
                                    {day.label}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Veckoschema: {workDays.length} dagar × {weeklyHours / 5} timmar = {weeklyHours} timmar/vecka
                        </p>
                    </div>

                    {/* Summary */}
                    {employmentType && (
                        <div className="bg-gray-50 rounded-lg p-4 border">
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Sammanfattning</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• Anställningstyp: {employmentType === 'hourly' ? 'Timanställd' : 'Fast månadslön'}</li>
                                {employmentType === 'hourly' && hourlyRate && (
                                    <li>• Timlön: {hourlyRate} kr/h</li>
                                )}
                                {employmentType === 'salary' && monthlySalary && (
                                    <li>• Månadslön: {Number(monthlySalary).toLocaleString('sv-SE')} kr/mån</li>
                                )}
                                {hasCommission && commissionRate && (
                                    <li>• Provision: {commissionRate}% på ordervärde</li>
                                )}
                                <li>• Arbetsdagar: {workDays.length} per vecka</li>
                            </ul>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
                    <Button variant="secondary" onClick={onClose}>
                        Avbryt
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSave}
                        disabled={!employmentType || saving}
                    >
                        {saving ? 'Sparar...' : 'Spara inställningar'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
