/**
 * LineItemsEditor Component
 * Reusable component for editing line items (products/services)
 * Used in Lead creation, Quote creation, and Invoice management
 */

import { useState, useEffect } from 'react';
import { Plus, Trash2, Package, Search, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getSavedLineItems } from '../lib/database';
import { ProductConfigurator } from './ProductConfigurator';
import type { RichSavedLineItem } from '../types/database';

// ============================================================================
// Types
// ============================================================================

export interface LineItem {
    id?: string;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
    name?: string;
    category?: string;
    is_library_item?: boolean;
}

interface LineItemsEditorProps {
    lineItems: LineItem[];
    onChange: (items: LineItem[]) => void;
    showLibrary?: boolean;
    readOnly?: boolean;
    compact?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function LineItemsEditor({
    lineItems,
    onChange,
    showLibrary = true,
    readOnly = false,
    compact = false
}: LineItemsEditorProps) {
    const { organisationId } = useAuth();
    const [savedItems, setSavedItems] = useState<RichSavedLineItem[]>([]);
    const [showLibraryDropdown, setShowLibraryDropdown] = useState(false);
    const [librarySearch, setLibrarySearch] = useState('');
    const [loadingLibrary, setLoadingLibrary] = useState(false);
    const [configuringItem, setConfiguringItem] = useState<RichSavedLineItem | null>(null);

    // Load product library
    useEffect(() => {
        if (showLibrary && organisationId) {
            setLoadingLibrary(true);
            getSavedLineItems(organisationId).then(({ data }) => {
                if (data) {
                    setSavedItems(data);
                }
                setLoadingLibrary(false);
            });
        }
    }, [showLibrary, organisationId]);

    // Add empty item
    const addItem = () => {
        const newItem: LineItem = {
            description: '',
            quantity: 1,
            unit_price: 0,
            total: 0
        };
        onChange([...lineItems, newItem]);
    };

    // Add item from library
    const addFromLibrary = (savedItem: RichSavedLineItem) => {
        const meta = savedItem.metadata;
        const hasCustomFields = (meta?.custom_fields?.length ?? 0) > 0;
        const hasIncludedItems = (meta?.included_items?.length ?? 0) > 0;

        if (hasCustomFields || hasIncludedItems) {
            setConfiguringItem(savedItem);
            setShowLibraryDropdown(false);
            setLibrarySearch('');
        } else {
            const newItem: LineItem = {
                description: savedItem.description || savedItem.name,
                name: savedItem.name,
                quantity: 1,
                unit_price: savedItem.unit_price,
                total: savedItem.unit_price,
                is_library_item: true,
            };
            onChange([...lineItems, newItem]);
            setShowLibraryDropdown(false);
            setLibrarySearch('');
        }
    };

    // Update item
    const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
        const updated = [...lineItems];
        updated[index] = { ...updated[index], [field]: value };

        // Recalculate total when quantity or price changes
        if (field === 'quantity' || field === 'unit_price') {
            updated[index].total = updated[index].quantity * updated[index].unit_price;
        }

        onChange(updated);
    };

    // Remove item
    const removeItem = (index: number) => {
        onChange(lineItems.filter((_, i) => i !== index));
    };

    // Calculate totals
    const subtotal = lineItems.reduce((sum, item) => sum + (item.total || 0), 0);

    // Filter library items
    const filteredLibrary = savedItems.filter(item =>
        item.name.toLowerCase().includes(librarySearch.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(librarySearch.toLowerCase()))
    );

    return (
        <>
            <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Produkter / Tjänster
                    </label>
                    {!readOnly && (
                        <div className="flex items-center gap-2">
                            {/* Library Dropdown */}
                            {showLibrary && savedItems.length > 0 && (
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setShowLibraryDropdown(!showLibraryDropdown)}
                                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                                    >
                                        <Package className="w-3.5 h-3.5 mr-1.5" />
                                        Produktbibliotek
                                        <ChevronDown className={`w-3.5 h-3.5 ml-1 transition-transform ${showLibraryDropdown ? 'rotate-180' : ''}`} />
                                    </button>

                                    {showLibraryDropdown && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-10"
                                                onClick={() => setShowLibraryDropdown(false)}
                                            />
                                            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-20 max-h-80 overflow-hidden">
                                                <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                                                    <div className="relative">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                        <input
                                                            type="text"
                                                            value={librarySearch}
                                                            onChange={(e) => setLibrarySearch(e.target.value)}
                                                            placeholder="Sök produkter..."
                                                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-primary-500"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="max-h-60 overflow-y-auto">
                                                    {loadingLibrary ? (
                                                        <div className="p-4 text-center text-sm text-gray-500">Laddar...</div>
                                                    ) : filteredLibrary.length === 0 ? (
                                                        <div className="p-4 text-center text-sm text-gray-500">Inga produkter hittades</div>
                                                    ) : (
                                                        filteredLibrary.map(item => (
                                                            <button
                                                                key={item.id}
                                                                type="button"
                                                                onClick={() => addFromLibrary(item)}
                                                                className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0"
                                                            >
                                                                <div className="font-medium text-sm text-gray-900 dark:text-white">
                                                                    {item.name}
                                                                </div>
                                                                {item.description && (
                                                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                                                        {item.description}
                                                                    </div>
                                                                )}
                                                                <div className="text-xs font-medium text-primary-600 dark:text-primary-400 mt-1">
                                                                    {item.unit_price.toLocaleString('sv-SE')} kr
                                                                </div>
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Add Custom Item */}
                            <button
                                type="button"
                                onClick={addItem}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5 mr-1.5" />
                                Lägg till rad
                            </button>
                        </div>
                    )}
                </div>

                {/* Items List */}
                {lineItems.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Inga produkter tillagda ännu
                        </p>
                        {!readOnly && (
                            <button
                                type="button"
                                onClick={addItem}
                                className="mt-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
                            >
                                Lägg till första produkten
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {/* Table Header */}
                        {!compact && (
                            <div className="grid grid-cols-12 gap-2 px-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                <div className="col-span-5">Beskrivning</div>
                                <div className="col-span-2 text-right">Antal</div>
                                <div className="col-span-2 text-right">Pris</div>
                                <div className="col-span-2 text-right">Summa</div>
                                <div className="col-span-1"></div>
                            </div>
                        )}

                        {/* Items */}
                        {lineItems.map((item, index) => (
                            <div
                                key={index}
                                className="grid grid-cols-12 gap-2 items-center bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700"
                            >
                                {/* Description */}
                                <div className="col-span-5">
                                    <input
                                        type="text"
                                        value={item.description}
                                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                                        disabled={readOnly}
                                        placeholder="Beskrivning..."
                                        className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 disabled:opacity-50"
                                    />
                                </div>

                                {/* Quantity */}
                                <div className="col-span-2">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                        disabled={readOnly}
                                        className="w-full px-2 py-1.5 text-sm text-right border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 disabled:opacity-50"
                                    />
                                </div>

                                {/* Unit Price */}
                                <div className="col-span-2">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={item.unit_price}
                                        onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                        disabled={readOnly}
                                        className="w-full px-2 py-1.5 text-sm text-right border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 disabled:opacity-50"
                                    />
                                </div>

                                {/* Total */}
                                <div className="col-span-2 text-right font-medium text-sm text-gray-900 dark:text-white">
                                    {(item.total || 0).toLocaleString('sv-SE')} kr
                                </div>

                                {/* Delete */}
                                <div className="col-span-1 text-right">
                                    {!readOnly && (
                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Subtotal */}
                        <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
                            <div className="text-right">
                                <span className="text-sm text-gray-500 dark:text-gray-400 mr-4">Summa:</span>
                                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {subtotal.toLocaleString('sv-SE')} kr
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {configuringItem && (
                <ProductConfigurator
                    item={configuringItem}
                    isOpen={true}
                    onClose={() => setConfiguringItem(null)}
                    onConfirm={(resolvedItem) => {
                        onChange([...lineItems, resolvedItem]);
                        setConfiguringItem(null);
                    }}
                />
            )}
        </>
    );
}

export default LineItemsEditor;
