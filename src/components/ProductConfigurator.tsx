/**
 * ProductConfigurator Component
 * Modal for configuring line items with custom fields (m², hours, coats, etc.)
 * and auto-calculating prices via formula evaluation.
 */

import { useState, useMemo, useCallback } from 'react';
import { X, Check, Clock } from 'lucide-react';
import { evaluate } from 'mathjs';
import type { RichSavedLineItem, ProductMetadata } from '../types/database';
import type { LineItem } from './LineItemsEditor';

// ============================================================================
// Types
// ============================================================================

interface ProductConfiguratorProps {
    item: RichSavedLineItem;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (resolvedItem: LineItem) => void;
}

// ============================================================================
// Formula helpers
// ============================================================================

const safeEvaluate = (formula: string, fieldValues: Record<string, number | string | boolean>): number => {
    if (!formula?.trim()) return 0;
    try {
        const scope: Record<string, number> = {};
        Object.entries(fieldValues).forEach(([k, v]) => {
            scope[k] = typeof v === 'number' ? v : 0;
        });
        const result = evaluate(formula, scope);
        if (typeof result !== 'number' || !isFinite(result) || isNaN(result)) return 0;
        return Math.max(0, Math.round(result * 100) / 100);
    } catch {
        return 0;
    }
};

// ============================================================================
// Component
// ============================================================================

export function ProductConfigurator({ item, isOpen, onClose, onConfirm }: ProductConfiguratorProps) {
    const meta: ProductMetadata = item.metadata ?? {};
    const fields = meta.custom_fields ?? [];
    const includedItems = meta.included_items ?? [];

    // Field values state
    const [fieldValues, setFieldValues] = useState<Record<string, number | string | boolean>>(() => {
        const init: Record<string, number | string | boolean> = {};
        fields.forEach(f => {
            if (f.type === 'checkbox') {
                init[f.key] = f.defaultValue ?? false;
            } else if (f.type === 'select') {
                init[f.key] = f.defaultValue ?? (f.options?.[0] ?? '');
            } else {
                init[f.key] = f.defaultValue ?? 0;
            }
        });
        return init;
    });

    // Included items check state
    const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>(() => {
        const init: Record<number, boolean> = {};
        includedItems.forEach((item, idx) => { init[idx] = item.default; });
        return init;
    });

    const updateField = useCallback((key: string, value: number | string | boolean) => {
        setFieldValues(prev => ({ ...prev, [key]: value }));
    }, []);

    // Price calculation
    const { displayPrice, timeResult, showTime } = useMemo(() => {
        const scope: Record<string, number> = {};
        fields.forEach(f => { scope[f.key] = 0; });
        Object.entries(fieldValues).forEach(([k, v]) => {
            scope[k] = Number(v) || 0;
        });

        const formulaResult = safeEvaluate(meta.pricing_formula ?? '', scope);
        const basePrice = meta.base_price ?? 0;
        const calculatedTotal = formulaResult + basePrice;
        const dp = calculatedTotal > 0 ? calculatedTotal : item.unit_price;

        const tr = safeEvaluate(meta.time_formula ?? '', scope);
        return { displayPrice: dp, timeResult: tr, showTime: tr > 0 };
    }, [fieldValues, fields, meta, item.unit_price]);

    const handleConfirm = useCallback(() => {
        onConfirm({
            description: item.description || item.name,
            name: item.name,
            quantity: 1,
            unit_price: displayPrice,
            total: displayPrice,
            category: meta.category,
            is_library_item: true,
        });
    }, [onConfirm, item, displayPrice, meta.category]);

    if (!isOpen) return null;

    const hasIncludedItems = includedItems.length > 0;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Tilläggsfält ({item.name})
                    </h3>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className={`grid gap-8 ${hasIncludedItems ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                        {/* Left column: Custom fields */}
                        <div className="space-y-4">
                            {fields.length === 0 && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">Inga tilläggsfält definierade.</p>
                            )}
                            {fields.map(field => (
                                <div key={field.key}>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        {field.label}
                                    </label>
                                    {field.type === 'number' && (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="0"
                                                step="any"
                                                value={fieldValues[field.key] as number || ''}
                                                onChange={e => updateField(field.key, parseFloat(e.target.value) || 0)}
                                                placeholder={field.placeholder || '0'}
                                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                            />
                                            {field.unit && (
                                                <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{field.unit}</span>
                                            )}
                                        </div>
                                    )}
                                    {field.type === 'select' && (
                                        <select
                                            value={fieldValues[field.key] as string || ''}
                                            onChange={e => updateField(field.key, e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        >
                                            {(field.options || []).map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    )}
                                    {field.type === 'checkbox' && (
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={!!fieldValues[field.key]}
                                                onChange={e => updateField(field.key, e.target.checked)}
                                                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                                            />
                                            <span className="text-sm text-gray-600 dark:text-gray-400">Ja</span>
                                        </label>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Right column: Included items checklist */}
                        {hasIncludedItems && (
                            <div>
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                    Detta ingår ({item.name})
                                </h4>
                                <div className="space-y-2">
                                    {includedItems.map((incItem, idx) => (
                                        <label key={idx} className="flex items-center gap-2.5 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={!!checkedItems[idx]}
                                                onChange={e => setCheckedItems(prev => ({ ...prev, [idx]: e.target.checked }))}
                                                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                                                {incItem.label}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                                Försäljningspris: {displayPrice.toLocaleString('sv-SE')} kr
                            </p>
                            {showTime && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    Tid för utförandet: {timeResult.toLocaleString('sv-SE')} {meta.time_unit || 'tim'}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
                        >
                            Avbryt
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors"
                        >
                            <Check className="w-4 h-4 mr-1.5" />
                            Spara
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProductConfigurator;
