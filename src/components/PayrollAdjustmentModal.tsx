import React, { useState } from 'react';
import { X, Plus, Minus, Edit, Calculator, Check, AlertCircle, Trash2 } from 'lucide-react';
import { formatCurrency } from '../lib/database';
import type { EmployeePayrollSummary } from '../lib/payroll';

interface PayrollAdjustmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    employeeSummary: EmployeePayrollSummary;
    onSaveAdjustments: (adjustments: PayrollAdjustment[]) => void;
}

export interface PayrollAdjustment {
    id: string;
    type: 'bonus' | 'deduction' | 'correction' | 'overtime_adjustment';
    description: string;
    amount: number;
    date?: string;
}

const ADJUSTMENT_TYPES = [
    { value: 'bonus', label: 'Bonus', icon: Plus, color: 'text-green-600' },
    { value: 'deduction', label: 'Avdrag', icon: Minus, color: 'text-red-600' },
    { value: 'correction', label: 'Korrigering', icon: Edit, color: 'text-blue-600' },
    { value: 'overtime_adjustment', label: 'Övertidsjustering', icon: Calculator, color: 'text-purple-600' }
];

function PayrollAdjustmentModal({ isOpen, onClose, employeeSummary, onSaveAdjustments }: PayrollAdjustmentModalProps) {
    const [adjustments, setAdjustments] = useState<PayrollAdjustment[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newAdjustment, setNewAdjustment] = useState<Omit<PayrollAdjustment, 'id'>>({
        type: 'bonus',
        description: '',
        amount: 0
    });
    const [saving, setSaving] = useState(false);

    if (!isOpen) return null;

    const handleAddAdjustment = () => {
        if (!newAdjustment.description || newAdjustment.amount === 0) return;

        const adjustment: PayrollAdjustment = {
            id: `adj-${Date.now()}`,
            ...newAdjustment
        };

        setAdjustments(prev => [...prev, adjustment]);
        setNewAdjustment({ type: 'bonus', description: '', amount: 0 });
        setShowAddForm(false);
    };

    const handleRemoveAdjustment = (id: string) => {
        setAdjustments(prev => prev.filter(a => a.id !== id));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSaveAdjustments(adjustments);
            onClose();
        } finally {
            setSaving(false);
        }
    };

    const totalAdjustments = adjustments.reduce((sum, adj) => {
        if (adj.type === 'deduction') return sum - adj.amount;
        return sum + adj.amount;
    }, 0);

    const newGrossPay = employeeSummary.totalGrossPay + totalAdjustments;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <div>
                        <h3 className="font-semibold text-gray-900">Lönejustering</h3>
                        <p className="text-sm text-gray-600">{employeeSummary.employee.full_name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
                    {/* Current Pay Summary */}
                    <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-blue-700">Nuvarande bruttolön</span>
                            <span className="font-semibold text-blue-900">{formatCurrency(employeeSummary.totalGrossPay)}</span>
                        </div>
                        {totalAdjustments !== 0 && (
                            <>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-blue-700">Justeringar</span>
                                    <span className={`font-medium ${totalAdjustments > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {totalAdjustments > 0 ? '+' : ''}{formatCurrency(totalAdjustments)}
                                    </span>
                                </div>
                                <div className="border-t border-blue-200 pt-2 flex items-center justify-between">
                                    <span className="text-sm font-medium text-blue-800">Ny bruttolön</span>
                                    <span className="font-bold text-blue-900">{formatCurrency(newGrossPay)}</span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Adjustments List */}
                    {adjustments.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-700">Justeringar att spara</h4>
                            {adjustments.map(adj => {
                                const typeInfo = ADJUSTMENT_TYPES.find(t => t.value === adj.type);
                                const Icon = typeInfo?.icon || Edit;
                                return (
                                    <div key={adj.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <Icon className={`w-4 h-4 ${typeInfo?.color}`} />
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{adj.description}</p>
                                                <p className="text-xs text-gray-500">{typeInfo?.label}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`font-medium ${adj.type === 'deduction' ? 'text-red-600' : 'text-green-600'}`}>
                                                {adj.type === 'deduction' ? '-' : '+'}{formatCurrency(adj.amount)}
                                            </span>
                                            <button
                                                onClick={() => handleRemoveAdjustment(adj.id)}
                                                className="text-gray-400 hover:text-red-600"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Add Adjustment Form */}
                    {showAddForm ? (
                        <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Typ av justering</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {ADJUSTMENT_TYPES.map(type => {
                                        const Icon = type.icon;
                                        return (
                                            <button
                                                key={type.value}
                                                onClick={() => setNewAdjustment(prev => ({ ...prev, type: type.value as PayrollAdjustment['type'] }))}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${newAdjustment.type === type.value
                                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <Icon className={`w-4 h-4 ${type.color}`} />
                                                {type.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivning *</label>
                                <input
                                    type="text"
                                    value={newAdjustment.description}
                                    onChange={e => setNewAdjustment(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="T.ex. 'Bonus Q4' eller 'Sjukavdrag'"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Belopp (SEK) *</label>
                                <input
                                    type="number"
                                    value={newAdjustment.amount || ''}
                                    onChange={e => setNewAdjustment(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                                    placeholder="0"
                                    min="0"
                                    step="100"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2">
                                <button
                                    onClick={() => setShowAddForm(false)}
                                    className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                                >
                                    Avbryt
                                </button>
                                <button
                                    onClick={handleAddAdjustment}
                                    disabled={!newAdjustment.description || newAdjustment.amount === 0}
                                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Lägg till
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            Lägg till justering
                        </button>
                    )}

                    {/* Info Note */}
                    <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-yellow-800">
                            Justeringar sparas som del av löneunderlaget och kommer att inkluderas i nästa lönekörning.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Avbryt
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={adjustments.length === 0 || saving}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <>
                                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                Sparar...
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4 mr-2" />
                                Spara justeringar ({adjustments.length})
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default PayrollAdjustmentModal;
