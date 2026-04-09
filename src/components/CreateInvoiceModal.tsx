/**
 * Global Create Invoice Modal
 * Self-contained invoice creation with inline customer creation
 * Can be opened from anywhere in the app via GlobalActionContext
 * Provides a simpler interface than the full CreateEditInvoiceModal
 */

import React, { useState, useEffect } from 'react';
import {
    X, Loader2, Plus, Trash2, UserPlus
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { createInvoice, type InvoiceWithRelations } from '../lib/invoices';
import { getCustomers, createCustomer, formatCurrency, getSavedLineItems } from '../lib/database';
import ROTFields from './ROTFields';
import RUTFields from './RUTFields';
import type { Customer, SavedLineItem } from '../types/database';

interface LineItem {
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
}

interface CreateInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInvoiceCreated: () => void;
}

const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
    isOpen,
    onClose,
    onInvoiceCreated,
}) => {
    const { organisationId } = useAuth();
    const { success, error: showError } = useToast();

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [savedLineItems, setSavedLineItems] = useState<SavedLineItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(false);

    const [formData, setFormData] = useState({
        customer_id: '',
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        line_items: [{ description: '', quantity: 1, unit_price: 0, total: 0 }] as LineItem[],
        work_summary: '',
        include_rot: false,
        rot_personnummer: null as string | null,
        rot_organisationsnummer: null as string | null,
        rot_fastighetsbeteckning: null as string | null,
        rot_amount: 0,
        include_rut: false,
        rut_personnummer: null as string | null,
        rut_amount: 0,
    });

    // Inline customer creation state
    const [isNewCustomer, setIsNewCustomer] = useState(false);
    const [newCustomerForm, setNewCustomerForm] = useState({
        name: '',
        customer_type: 'company' as 'company' | 'private',
        org_number: '',
        email: '',
        address: '',
        postal_code: '',
        city: '',
    });

    useEffect(() => {
        if (isOpen && organisationId) {
            setDataLoading(true);
            Promise.all([
                getCustomers(organisationId),
                getSavedLineItems(organisationId),
            ]).then(([customersResult, savedItemsResult]) => {
                if (customersResult.data) setCustomers(customersResult.data);
                if (savedItemsResult.data) setSavedLineItems(savedItemsResult.data);
                setDataLoading(false);
            });
        }
    }, [isOpen, organisationId]);

    const resetForm = () => {
        setFormData({
            customer_id: '',
            due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
            line_items: [{ description: '', quantity: 1, unit_price: 0, total: 0 }],
            work_summary: '',
            include_rot: false,
            rot_personnummer: null,
            rot_organisationsnummer: null,
            rot_fastighetsbeteckning: null,
            rot_amount: 0,
            include_rut: false,
            rut_personnummer: null,
            rut_amount: 0,
        });
        setIsNewCustomer(false);
        setNewCustomerForm({
            name: '', customer_type: 'company', org_number: '',
            email: '', address: '', postal_code: '', city: '',
        });
    };

    const addLineItem = () => {
        setFormData(prev => ({
            ...prev,
            line_items: [...prev.line_items, { description: '', quantity: 1, unit_price: 0, total: 0 }]
        }));
    };

    const removeLineItem = (index: number) => {
        if (formData.line_items.length > 1) {
            setFormData(prev => ({
                ...prev,
                line_items: prev.line_items.filter((_, i) => i !== index)
            }));
        }
    };

    const updateLineItem = (index: number, field: string, value: unknown) => {
        setFormData(prev => ({
            ...prev,
            line_items: prev.line_items.map((item, i) => {
                if (i !== index) return item;
                const updated = { ...item, [field]: value };
                updated.total = updated.quantity * updated.unit_price;
                return updated;
            })
        }));
    };

    const handleAddSavedItem = (itemId: string) => {
        const item = savedLineItems.find(i => i.id === itemId);
        if (!item) return;
        const newItem: LineItem = { description: item.name, quantity: 1, unit_price: item.unit_price, total: item.unit_price };
        const last = formData.line_items[formData.line_items.length - 1];
        if (formData.line_items.length === 1 && !last.description && last.unit_price === 0) {
            setFormData(prev => ({ ...prev, line_items: [newItem] }));
        } else {
            setFormData(prev => ({ ...prev, line_items: [...prev.line_items, newItem] }));
        }
    };

    const calculateSubtotal = () => formData.line_items.reduce((s, i) => s + i.total, 0);
    const calculateVAT = () => calculateSubtotal() * 0.25;
    const calculateTotal = () => calculateSubtotal() + calculateVAT();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organisationId) {
            showError('Fel', 'Organisation saknas');
            return;
        }

        setLoading(true);

        try {
            // Handle inline customer creation
            let customerId = formData.customer_id;
            if (isNewCustomer) {
                if (!newCustomerForm.name.trim()) {
                    showError('Fel', 'Kundnamn är obligatoriskt');
                    setLoading(false);
                    return;
                }

                const { data: createdCustomer, error: customerError } = await createCustomer({
                    organisation_id: organisationId,
                    name: newCustomerForm.name.trim(),
                    customer_type: newCustomerForm.customer_type,
                    org_number: newCustomerForm.org_number.trim() || null,
                    email: newCustomerForm.email.trim() || null,
                    address: newCustomerForm.address.trim() || null,
                    postal_code: newCustomerForm.postal_code.trim() || null,
                    city: newCustomerForm.city.trim() || null,
                } as Omit<Customer, 'id' | 'created_at'>);

                if (customerError || !createdCustomer) {
                    showError('Fel', `Kunde inte skapa kund: ${customerError?.message || 'Okänt fel'}`);
                    setLoading(false);
                    return;
                }

                customerId = createdCustomer.id;
                setCustomers(prev => [...prev, createdCustomer]);
            }

            if (!customerId) {
                showError('Fel', 'Kund är obligatoriskt');
                setLoading(false);
                return;
            }

            const validItems = formData.line_items.filter(i => i.description.trim() && i.quantity > 0);
            if (validItems.length === 0) {
                showError('Fel', 'Minst en fakturarad krävs');
                setLoading(false);
                return;
            }

            const total = calculateTotal();

            const { error } = await createInvoice({
                organisation_id: organisationId,
                customer_id: customerId,
                amount: total,
                due_date: formData.due_date,
                job_description: formData.work_summary || null,
                invoice_line_items: validItems,
                include_rot: formData.include_rot,
                rot_personnummer: formData.rot_personnummer,
                rot_organisationsnummer: formData.rot_organisationsnummer,
                rot_fastighetsbeteckning: formData.rot_fastighetsbeteckning,
                rot_amount: formData.rot_amount,
                include_rut: formData.include_rut,
                rut_personnummer: formData.rut_personnummer,
                rut_amount: formData.rut_amount,
            } as any);

            if (error) {
                showError('Fel', error.message);
                return;
            }

            success('Faktura skapad', 'Fakturan har skapats.');
            onInvoiceCreated();
            onClose();
            resetForm();
        } catch (err) {
            console.error('Error creating invoice:', err);
            showError('Fel', 'Kunde inte skapa faktura');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-900">Skapa Ny Faktura</h3>
                    <button onClick={() => { onClose(); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {dataLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                        </div>
                    ) : (
                        <>
                            {/* Customer + Due Date */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-sm font-medium text-gray-700">Kund *</label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsNewCustomer(!isNewCustomer);
                                                if (!isNewCustomer) setFormData(prev => ({ ...prev, customer_id: '' }));
                                            }}
                                            className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                        >
                                            <UserPlus className="w-3 h-3" />
                                            {isNewCustomer ? 'Välj befintlig kund' : 'Ny kund (Manuell)'}
                                        </button>
                                    </div>

                                    {isNewCustomer ? (
                                        <div className="space-y-3 bg-gray-50 p-3 rounded-md border">
                                            <div className="flex space-x-2">
                                                <button type="button"
                                                    onClick={() => setNewCustomerForm(prev => ({ ...prev, customer_type: 'company' }))}
                                                    className={`flex-1 py-1 text-xs rounded border ${newCustomerForm.customer_type === 'company' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-gray-300'}`}
                                                >
                                                    Företag
                                                </button>
                                                <button type="button"
                                                    onClick={() => setNewCustomerForm(prev => ({ ...prev, customer_type: 'private' }))}
                                                    className={`flex-1 py-1 text-xs rounded border ${newCustomerForm.customer_type === 'private' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-gray-300'}`}
                                                >
                                                    Privatperson
                                                </button>
                                            </div>
                                            <input type="text" placeholder={newCustomerForm.customer_type === 'company' ? 'Företagsnamn *' : 'Namn *'}
                                                className="block w-full rounded-md border-gray-300 shadow-sm text-sm px-3 py-2 border"
                                                value={newCustomerForm.name}
                                                onChange={e => setNewCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                                            />
                                            {newCustomerForm.customer_type === 'company' && (
                                                <input type="text" placeholder="Organisationsnummer"
                                                    className="block w-full rounded-md border-gray-300 shadow-sm text-sm px-3 py-2 border"
                                                    value={newCustomerForm.org_number}
                                                    onChange={e => setNewCustomerForm(prev => ({ ...prev, org_number: e.target.value }))}
                                                />
                                            )}
                                            <input type="email" placeholder="E-post"
                                                className="block w-full rounded-md border-gray-300 shadow-sm text-sm px-3 py-2 border"
                                                value={newCustomerForm.email}
                                                onChange={e => setNewCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                                            />
                                            <input type="text" placeholder="Adress"
                                                className="block w-full rounded-md border-gray-300 shadow-sm text-sm px-3 py-2 border"
                                                value={newCustomerForm.address}
                                                onChange={e => setNewCustomerForm(prev => ({ ...prev, address: e.target.value }))}
                                            />
                                            <div className="grid grid-cols-2 gap-2">
                                                <input type="text" placeholder="Postnummer"
                                                    className="block w-full rounded-md border-gray-300 shadow-sm text-sm px-3 py-2 border"
                                                    value={newCustomerForm.postal_code}
                                                    onChange={e => setNewCustomerForm(prev => ({ ...prev, postal_code: e.target.value }))}
                                                />
                                                <input type="text" placeholder="Ort"
                                                    className="block w-full rounded-md border-gray-300 shadow-sm text-sm px-3 py-2 border"
                                                    value={newCustomerForm.city}
                                                    onChange={e => setNewCustomerForm(prev => ({ ...prev, city: e.target.value }))}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <select
                                            required={!isNewCustomer}
                                            value={formData.customer_id}
                                            onChange={e => setFormData(prev => ({ ...prev, customer_id: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        >
                                            <option value="">Välj kund...</option>
                                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Förfallodatum</label>
                                    <input
                                        type="date"
                                        value={formData.due_date}
                                        onChange={e => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    />
                                </div>
                            </div>

                            {/* Work Summary */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Arbetsbeskrivning</label>
                                <textarea
                                    value={formData.work_summary}
                                    onChange={e => setFormData(prev => ({ ...prev, work_summary: e.target.value }))}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    placeholder="Beskriv det utförda arbetet..."
                                />
                            </div>

                            {/* ROT / RUT fields */}
                            <div className="border-t border-gray-200 pt-4 space-y-4">
                                <ROTFields
                                    data={{
                                        include_rot: formData.include_rot,
                                        rot_personnummer: formData.rot_personnummer,
                                        rot_organisationsnummer: formData.rot_organisationsnummer,
                                        rot_fastighetsbeteckning: formData.rot_fastighetsbeteckning,
                                        rot_amount: formData.rot_amount,
                                    }}
                                    onChange={(rotData) =>
                                        setFormData(prev => ({
                                            ...prev, ...rotData,
                                            ...(rotData.include_rot ? { include_rut: false, rut_personnummer: null, rut_amount: 0 } : {})
                                        }))
                                    }
                                    totalAmount={calculateTotal()}
                                />
                                <RUTFields
                                    data={{
                                        include_rut: formData.include_rut,
                                        rut_personnummer: formData.rut_personnummer,
                                        rut_amount: formData.rut_amount,
                                    }}
                                    onChange={(rutData) =>
                                        setFormData(prev => ({
                                            ...prev, ...rutData,
                                            ...(rutData.include_rut ? { include_rot: false, rot_personnummer: null, rot_organisationsnummer: null, rot_fastighetsbeteckning: null, rot_amount: 0 } : {})
                                        }))
                                    }
                                    totalAmount={calculateTotal()}
                                />
                            </div>

                            {/* Line Items */}
                            <div className="border-t border-gray-200 pt-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-lg font-medium text-gray-900">Fakturarader</h4>
                                    <div className="flex items-center space-x-2">
                                        {savedLineItems.length > 0 && (
                                            <select
                                                onChange={e => { handleAddSavedItem(e.target.value); e.target.value = ''; }}
                                                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                                                value=""
                                            >
                                                <option value="" disabled>Sparade artiklar...</option>
                                                {savedLineItems.map(item => (
                                                    <option key={item.id} value={item.id}>
                                                        {item.name} - {formatCurrency(item.unit_price)}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                        <button type="button" onClick={addLineItem}
                                            className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                                            <Plus className="w-4 h-4 mr-1" /> Lägg till rad
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {formData.line_items.map((item, index) => (
                                        <div key={index} className="grid grid-cols-12 gap-2 items-end">
                                            <div className="col-span-5">
                                                {index === 0 && <label className="block text-xs font-medium text-gray-700 mb-1">Beskrivning</label>}
                                                <input type="text" value={item.description}
                                                    onChange={e => updateLineItem(index, 'description', e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                                    placeholder="Beskrivning av tjänst/produkt"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                {index === 0 && <label className="block text-xs font-medium text-gray-700 mb-1">Antal</label>}
                                                <input type="number" min="0" step="0.01" value={item.quantity}
                                                    onChange={e => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                {index === 0 && <label className="block text-xs font-medium text-gray-700 mb-1">Enhetspris</label>}
                                                <input type="number" min="0" step="0.01" value={item.unit_price}
                                                    onChange={e => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                {index === 0 && <label className="block text-xs font-medium text-gray-700 mb-1">Totalt</label>}
                                                <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm">
                                                    {formatCurrency(item.total)}
                                                </div>
                                            </div>
                                            <div className="col-span-1">
                                                {formData.line_items.length > 1 && (
                                                    <button type="button" onClick={() => removeLineItem(index)}
                                                        className="p-2 text-red-600 hover:text-red-900">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Totals */}
                                <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Delsumma</span>
                                            <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Moms (25%)</span>
                                            <span className="font-medium">{formatCurrency(calculateVAT())}</span>
                                        </div>
                                        <div className="flex justify-between text-lg font-bold pt-2 border-t">
                                            <span>Totalt</span>
                                            <span className="text-emerald-600">{formatCurrency(calculateTotal())}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end space-x-3 pt-4">
                                <button type="button" onClick={() => { onClose(); resetForm(); }}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                                    Avbryt
                                </button>
                                <button type="submit" disabled={loading}
                                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">
                                    {loading ? (
                                        <div className="flex items-center">
                                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                                            <span className="ml-2">Skapar...</span>
                                        </div>
                                    ) : (
                                        isNewCustomer ? 'Skapa kund & faktura' : 'Skapa Faktura'
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
};

export default CreateInvoiceModal;
