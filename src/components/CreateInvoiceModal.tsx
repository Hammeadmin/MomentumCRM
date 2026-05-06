/**
 * Global Create Invoice Modal
 * Self-contained invoice creation with inline customer creation
 * Can be opened from anywhere in the app via GlobalActionContext
 */

import React, { useState, useEffect } from 'react';
import {
    X, Loader2, Plus, Trash2, UserPlus, Edit2, Save, Link
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { createInvoice } from '../lib/invoices';
import { getCustomers, createCustomer, updateCustomer, formatCurrency, getSavedLineItems } from '../lib/database';
import { supabase } from '../lib/supabase';
import ROTFields from './ROTFields';
import RUTFields from './RUTFields';
import type { Customer, SavedLineItem } from '../types/database';

interface LineItem {
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
}

interface LinkedOrder {
    id: string;
    title: string;
    customer_id: string | null;
    customer?: { id: string; name: string } | null;
    value?: number | null;
    job_description?: string | null;
}

interface CreateInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInvoiceCreated: () => void;
    defaultOrderId?: string;
    defaultCustomerId?: string;
    defaultWorkSummary?: string;
}

const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
    isOpen,
    onClose,
    onInvoiceCreated,
    defaultOrderId,
    defaultCustomerId,
    defaultWorkSummary,
}) => {
    const { organisationId, user } = useAuth();
    const { success, error: showError } = useToast();

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [savedLineItems, setSavedLineItems] = useState<SavedLineItem[]>([]);
    const [readyOrders, setReadyOrders] = useState<LinkedOrder[]>([]);
    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(false);

    const [formData, setFormData] = useState({
        customer_id: '',
        order_id: '',
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

    // Inline new customer state
    const [isNewCustomer, setIsNewCustomer] = useState(false);
    const [newCustomerForm, setNewCustomerForm] = useState({
        name: '',
        customer_type: 'company' as 'company' | 'private',
        org_number: '',
        email: '',
        phone_number: '',
        address: '',
        postal_code: '',
        city: '',
        sales_area: '',
        vat_handling: '25%',
        invoice_delivery_method: 'e-post',
        e_invoice_address: '',
    });

    // Inline existing customer edit state
    const [isEditingExistingCustomer, setIsEditingExistingCustomer] = useState(false);
    const [existingCustomerEditForm, setExistingCustomerEditForm] = useState({
        name: '', email: '', phone_number: '', org_number: '',
        address: '', postal_code: '', city: '',
        sales_area: '', vat_handling: '25%', invoice_delivery_method: 'e-post', e_invoice_address: '',
    });
    const [savingExistingCustomer, setSavingExistingCustomer] = useState(false);

    useEffect(() => {
        if (isOpen && organisationId) {
            setDataLoading(true);
            Promise.all([
                getCustomers(organisationId),
                getSavedLineItems(organisationId),
                supabase
                    .from('orders')
                    .select('id, title, customer_id, customer:customers(id, name), value, job_description')
                    .eq('organisation_id', organisationId)
                    .eq('status', 'redo_fakturera')
                    .order('created_at', { ascending: false }),
            ]).then(([customersResult, savedItemsResult, ordersResult]) => {
                if (customersResult.data) setCustomers(customersResult.data);
                if (savedItemsResult.data) setSavedLineItems(savedItemsResult.data);
                if (ordersResult.data) setReadyOrders(ordersResult.data as LinkedOrder[]);
                setDataLoading(false);
            });
        }
    }, [isOpen, organisationId]);

    // Apply pre-fill defaults when modal opens with them
    useEffect(() => {
        if (isOpen && (defaultOrderId || defaultCustomerId || defaultWorkSummary)) {
            setFormData(prev => ({
                ...prev,
                order_id: defaultOrderId || prev.order_id,
                customer_id: defaultCustomerId || prev.customer_id,
                work_summary: defaultWorkSummary || prev.work_summary,
            }));
        }
    }, [isOpen, defaultOrderId, defaultCustomerId, defaultWorkSummary]);

    const resetForm = () => {
        setFormData({
            customer_id: '',
            order_id: '',
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
        setIsEditingExistingCustomer(false);
        setNewCustomerForm({
            name: '', customer_type: 'company', org_number: '',
            email: '', phone_number: '', address: '', postal_code: '', city: '',
            sales_area: '', vat_handling: '25%', invoice_delivery_method: 'e-post', e_invoice_address: '',
        });
    };

    // When an order is selected, auto-populate customer and work summary
    const handleOrderSelect = (orderId: string) => {
        const order = readyOrders.find(o => o.id === orderId);
        if (!order) {
            setFormData(prev => ({ ...prev, order_id: '' }));
            return;
        }
        setFormData(prev => ({
            ...prev,
            order_id: orderId,
            customer_id: order.customer_id || prev.customer_id,
            work_summary: order.job_description || order.title || prev.work_summary,
        }));
        setIsNewCustomer(false);
        setIsEditingExistingCustomer(false);
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

    const handleUpdateExistingCustomer = async () => {
        const sel = customers.find(c => c.id === formData.customer_id);
        if (!sel) return;
        setSavingExistingCustomer(true);
        try {
            await updateCustomer(sel.id, {
                name: existingCustomerEditForm.name || undefined,
                email: existingCustomerEditForm.email || null,
                phone_number: existingCustomerEditForm.phone_number || null,
                org_number: existingCustomerEditForm.org_number || null,
                address: existingCustomerEditForm.address || null,
                postal_code: existingCustomerEditForm.postal_code || null,
                city: existingCustomerEditForm.city || null,
                sales_area: existingCustomerEditForm.sales_area || null,
                vat_handling: existingCustomerEditForm.vat_handling as any,
                invoice_delivery_method: existingCustomerEditForm.invoice_delivery_method as any,
                e_invoice_address: existingCustomerEditForm.e_invoice_address || null,
            } as any);
            if (organisationId) {
                const res = await getCustomers(organisationId);
                if (res.data) setCustomers(res.data);
            }
            setIsEditingExistingCustomer(false);
        } catch {
            // silent
        } finally {
            setSavingExistingCustomer(false);
        }
    };

    const calculateSubtotal = () => formData.line_items.reduce((s, i) => s + i.total, 0);

    const getActiveVatHandling = (): string => {
        if (isNewCustomer) return newCustomerForm.vat_handling;
        const sel = customers.find(c => c.id === formData.customer_id);
        return (sel as any)?.vat_handling || '25%';
    };

    const getVatRate = (): number => {
        const vh = getActiveVatHandling();
        if (vh === '12%') return 0.12;
        if (vh === '6%') return 0.06;
        if (vh === '0%' || vh === 'omvänd byggmoms') return 0;
        return 0.25;
    };

    const calculateVAT = () => calculateSubtotal() * getVatRate();
    const calculateTotal = () => calculateSubtotal() + calculateVAT();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organisationId) {
            showError('Fel', 'Organisation saknas');
            return;
        }

        setLoading(true);

        try {
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
                    phone_number: newCustomerForm.phone_number.trim() || null,
                    address: newCustomerForm.address.trim() || null,
                    postal_code: newCustomerForm.postal_code.trim() || null,
                    city: newCustomerForm.city.trim() || null,
                    sales_area: newCustomerForm.sales_area.trim() || null,
                    vat_handling: newCustomerForm.vat_handling || '25%',
                    invoice_delivery_method: newCustomerForm.invoice_delivery_method || 'e-post',
                    e_invoice_address: newCustomerForm.e_invoice_address.trim() || null,
                } as Omit<Customer, 'id' | 'created_at'>);

                if (customerError || !createdCustomer) {
                    showError('Fel', `Kunde inte skapa kund: ${customerError?.message || 'Okänt fel'}`);
                    setLoading(false);
                    return;
                }

                customerId = createdCustomer.id;
                setCustomers(prev => [...prev, createdCustomer]);
                success('Kund skapad', `${createdCustomer.name} har lagts till`);
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

            const subtotalAmount = calculateSubtotal();
            const vatAmount = calculateVAT();
            const total = calculateTotal();

            // Generate sequential invoice number via RPC, with client-side fallback
            let invoiceNumber: string;
            const { data: rpcNumber, error: numberError } = await supabase.rpc('generate_invoice_number', {
                org_id: organisationId,
            });
            if (numberError) {
                console.error('[Invoice] generate_invoice_number RPC error:', numberError);
                const now = new Date();
                invoiceNumber = `${now.getFullYear()}-${String(Date.now()).slice(-6)}`;
            } else if (!rpcNumber) {
                console.warn('[Invoice] generate_invoice_number returned null, using fallback');
                const now = new Date();
                invoiceNumber = `${now.getFullYear()}-${String(Date.now()).slice(-6)}`;
            } else {
                invoiceNumber = rpcNumber as string;
            }
            const ocrNumber = invoiceNumber.replace(/\D/g, '');

            console.log('[Invoice] Creating invoice:', { invoice_number: invoiceNumber, customer_id: customerId, lineItemCount: validItems.length });
            const { data: createdInvoice, error } = await createInvoice(
                {
                    organisation_id: organisationId,
                    invoice_number: invoiceNumber,
                    ocr_number: ocrNumber,
                    customer_id: customerId,
                    order_id: formData.order_id || null,
                    amount: total,
                    due_date: formData.due_date,
                    job_description: formData.work_summary || null,
                    work_summary: formData.work_summary || null,
                    include_rot: formData.include_rot,
                    rot_personnummer: formData.rot_personnummer,
                    rot_organisationsnummer: formData.rot_organisationsnummer,
                    rot_fastighetsbeteckning: formData.rot_fastighetsbeteckning,
                    rot_amount: formData.rot_amount,
                    include_rut: formData.include_rut,
                    rut_personnummer: formData.rut_personnummer,
                    rut_amount: formData.rut_amount,
                } as any,
                validItems,
                user?.id
            );

            if (error) {
                console.error('[Invoice] createInvoice failed:', error);
                showError('Fel', error.message);
                return;
            }

            console.log('[Invoice] Invoice created successfully:', createdInvoice?.id);
            success('Faktura skapad', 'Fakturan har skapats.');
            onInvoiceCreated();
            onClose();
            resetForm();
        } catch (err) {
            console.error('[Invoice] Unexpected error in handleSubmit:', err);
            showError('Fel', 'Kunde inte skapa faktura');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
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
                            {/* Link to order (optional) */}
                            {readyOrders.length > 0 && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Link className="w-4 h-4 text-amber-600" />
                                        <label className="block text-sm font-medium text-amber-800">
                                            Koppla till redo-att-fakturera order (valfritt)
                                        </label>
                                    </div>
                                    <select
                                        value={formData.order_id}
                                        onChange={e => handleOrderSelect(e.target.value)}
                                        className="w-full px-3 py-2 border border-amber-300 rounded-md text-sm bg-white focus:ring-amber-500 focus:border-amber-500"
                                    >
                                        <option value="">— Ingen kopplad order —</option>
                                        {readyOrders.map(o => (
                                            <option key={o.id} value={o.id}>
                                                {o.title}{o.customer ? ` — ${o.customer.name}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {formData.order_id && (
                                        <p className="text-xs text-amber-700 mt-1">
                                            Ordern markeras automatiskt som "Fakturerad" när fakturan skapas.
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Customer + Due Date */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-sm font-medium text-gray-700">Kund *</label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsNewCustomer(!isNewCustomer);
                                                setIsEditingExistingCustomer(false);
                                                if (!isNewCustomer) setFormData(prev => ({ ...prev, customer_id: '' }));
                                            }}
                                            className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                        >
                                            <UserPlus className="w-3 h-3" />
                                            {isNewCustomer ? 'Välj befintlig kund' : 'Ny kund (Manuell)'}
                                        </button>
                                    </div>

                                    {isNewCustomer ? (
                                        <div className="space-y-3 bg-blue-50 border border-blue-200 p-3 rounded-md">
                                            {/* Företag/Privatperson toggle */}
                                            <div className="flex space-x-2">
                                                <button type="button"
                                                    onClick={() => setNewCustomerForm(prev => ({ ...prev, customer_type: 'company' }))}
                                                    className={`flex-1 py-1 text-xs rounded border ${newCustomerForm.customer_type === 'company' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-gray-300'}`}
                                                >
                                                    Företag
                                                </button>
                                                <button type="button"
                                                    onClick={() => setNewCustomerForm(prev => ({ ...prev, customer_type: 'private', org_number: '' }))}
                                                    className={`flex-1 py-1 text-xs rounded border ${newCustomerForm.customer_type === 'private' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-gray-300'}`}
                                                >
                                                    Privatperson
                                                </button>
                                            </div>
                                            <input type="text"
                                                placeholder={newCustomerForm.customer_type === 'company' ? 'Företagsnamn *' : 'Namn *'}
                                                className="block w-full rounded-md border-gray-300 shadow-sm text-sm px-3 py-2 border focus:ring-blue-500 focus:border-blue-500"
                                                value={newCustomerForm.name}
                                                onChange={e => setNewCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                                            />
                                            <div className="grid grid-cols-2 gap-2">
                                                <input type="text"
                                                    placeholder={newCustomerForm.customer_type === 'company' ? 'Org.nummer' : 'Personnummer'}
                                                    className="block w-full rounded-md border-gray-300 shadow-sm text-sm px-3 py-2 border focus:ring-blue-500 focus:border-blue-500"
                                                    value={newCustomerForm.org_number}
                                                    onChange={e => setNewCustomerForm(prev => ({ ...prev, org_number: e.target.value }))}
                                                />
                                                <input type="tel"
                                                    placeholder="Telefon"
                                                    className="block w-full rounded-md border-gray-300 shadow-sm text-sm px-3 py-2 border focus:ring-blue-500 focus:border-blue-500"
                                                    value={newCustomerForm.phone_number}
                                                    onChange={e => setNewCustomerForm(prev => ({ ...prev, phone_number: e.target.value }))}
                                                />
                                            </div>
                                            <input type="email" placeholder="E-post"
                                                className="block w-full rounded-md border-gray-300 shadow-sm text-sm px-3 py-2 border focus:ring-blue-500 focus:border-blue-500"
                                                value={newCustomerForm.email}
                                                onChange={e => setNewCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                                            />
                                            <input type="text" placeholder="Adress"
                                                className="block w-full rounded-md border-gray-300 shadow-sm text-sm px-3 py-2 border focus:ring-blue-500 focus:border-blue-500"
                                                value={newCustomerForm.address}
                                                onChange={e => setNewCustomerForm(prev => ({ ...prev, address: e.target.value }))}
                                            />
                                            <div className="grid grid-cols-2 gap-2">
                                                <input type="text" placeholder="Postnummer"
                                                    className="block w-full rounded-md border-gray-300 shadow-sm text-sm px-3 py-2 border focus:ring-blue-500 focus:border-blue-500"
                                                    value={newCustomerForm.postal_code}
                                                    onChange={e => setNewCustomerForm(prev => ({ ...prev, postal_code: e.target.value }))}
                                                />
                                                <input type="text" placeholder="Ort"
                                                    className="block w-full rounded-md border-gray-300 shadow-sm text-sm px-3 py-2 border focus:ring-blue-500 focus:border-blue-500"
                                                    value={newCustomerForm.city}
                                                    onChange={e => setNewCustomerForm(prev => ({ ...prev, city: e.target.value }))}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <input type="text" placeholder="Försäljningsområde"
                                                    className="block w-full rounded-md border-gray-300 shadow-sm text-sm px-3 py-2 border focus:ring-blue-500 focus:border-blue-500"
                                                    value={newCustomerForm.sales_area}
                                                    onChange={e => setNewCustomerForm(prev => ({ ...prev, sales_area: e.target.value }))}
                                                />
                                                <select
                                                    className="block w-full rounded-md border-gray-300 shadow-sm text-sm px-3 py-2 border focus:ring-blue-500 focus:border-blue-500"
                                                    value={newCustomerForm.vat_handling}
                                                    onChange={e => setNewCustomerForm(prev => ({ ...prev, vat_handling: e.target.value }))}
                                                >
                                                    <option value="25%">25% moms</option>
                                                    <option value="12%">12% moms</option>
                                                    <option value="6%">6% moms</option>
                                                    <option value="0%">Momsfri (0%)</option>
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <select
                                                    className="block w-full rounded-md border-gray-300 shadow-sm text-sm px-3 py-2 border focus:ring-blue-500 focus:border-blue-500"
                                                    value={newCustomerForm.invoice_delivery_method}
                                                    onChange={e => setNewCustomerForm(prev => ({ ...prev, invoice_delivery_method: e.target.value }))}
                                                >
                                                    <option value="e-post">E-post</option>
                                                    <option value="e-faktura">E-faktura</option>
                                                    <option value="post">Post</option>
                                                </select>
                                                {newCustomerForm.invoice_delivery_method === 'e-faktura' && (
                                                    <input type="text" placeholder="E-fakturaadress (GLN/PEPPOL)"
                                                        className="block w-full rounded-md border-gray-300 shadow-sm text-sm px-3 py-2 border focus:ring-blue-500 focus:border-blue-500"
                                                        value={newCustomerForm.e_invoice_address}
                                                        onChange={e => setNewCustomerForm(prev => ({ ...prev, e_invoice_address: e.target.value }))}
                                                    />
                                                )}
                                            </div>
                                            <p className="text-xs text-blue-700">Kunden skapas automatiskt när du skapar fakturan.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <select
                                                required={!isNewCustomer}
                                                value={formData.customer_id}
                                                onChange={e => { setFormData(prev => ({ ...prev, customer_id: e.target.value })); setIsEditingExistingCustomer(false); }}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            >
                                                <option value="">Välj kund...</option>
                                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>

                                            {formData.customer_id && (() => {
                                                const sel = customers.find(c => c.id === formData.customer_id);
                                                if (!sel) return null;
                                                return (
                                                    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2">
                                                        {!isEditingExistingCustomer ? (
                                                            <>
                                                                <div className="flex items-center justify-between">
                                                                    <div>
                                                                        <p className="text-sm font-medium text-gray-900">{sel.name}</p>
                                                                        <p className="text-xs text-gray-500">{(sel as any).customer_type === 'company' ? 'Företag' : 'Privatperson'}</p>
                                                                    </div>
                                                                    <button type="button"
                                                                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                                                        onClick={() => {
                                                                            setExistingCustomerEditForm({ name: sel.name || '', email: (sel as any).email || '', phone_number: (sel as any).phone_number || '', org_number: (sel as any).org_number || '', address: (sel as any).address || '', postal_code: (sel as any).postal_code || '', city: (sel as any).city || '', sales_area: (sel as any).sales_area || '', vat_handling: (sel as any).vat_handling || '25%', invoice_delivery_method: (sel as any).invoice_delivery_method || 'e-post', e_invoice_address: (sel as any).e_invoice_address || '' });
                                                                            setIsEditingExistingCustomer(true);
                                                                        }}>
                                                                        <Edit2 className="w-3 h-3" /> Redigera
                                                                    </button>
                                                                </div>
                                                                {(sel as any).email && <p className="text-xs text-gray-500">{(sel as any).email}</p>}
                                                                {(sel as any).phone_number && <p className="text-xs text-gray-500">{(sel as any).phone_number}</p>}
                                                                {(sel as any).org_number && <p className="text-xs text-gray-500">{(sel as any).customer_type === 'company' ? 'Org.nummer' : 'Personnummer'}: {(sel as any).org_number}</p>}
                                                                {[(sel as any).address, (sel as any).postal_code, (sel as any).city].filter(Boolean).length > 0 && (
                                                                    <p className="text-xs text-gray-500">{[(sel as any).address, (sel as any).postal_code, (sel as any).city].filter(Boolean).join(', ')}</p>
                                                                )}
                                                                {(sel as any).vat_handling && <p className="text-xs text-gray-500">Moms: {(sel as any).vat_handling}</p>}
                                                            </>
                                                        ) : (
                                                            <div className="space-y-1.5">
                                                                <div className="grid grid-cols-2 gap-1.5">
                                                                    <input className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="Namn *" value={existingCustomerEditForm.name} onChange={e => setExistingCustomerEditForm(p => ({ ...p, name: e.target.value }))} />
                                                                    <input className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="E-post" value={existingCustomerEditForm.email} onChange={e => setExistingCustomerEditForm(p => ({ ...p, email: e.target.value }))} />
                                                                    <input className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="Telefon" value={existingCustomerEditForm.phone_number} onChange={e => setExistingCustomerEditForm(p => ({ ...p, phone_number: e.target.value }))} />
                                                                    <input className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder={(sel as any).customer_type === 'company' ? 'Org.nummer' : 'Personnummer'} value={existingCustomerEditForm.org_number} onChange={e => setExistingCustomerEditForm(p => ({ ...p, org_number: e.target.value }))} />
                                                                </div>
                                                                <input className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="Adress" value={existingCustomerEditForm.address} onChange={e => setExistingCustomerEditForm(p => ({ ...p, address: e.target.value }))} />
                                                                <div className="flex gap-1.5">
                                                                    <input className="w-20 text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="Postnr" value={existingCustomerEditForm.postal_code} onChange={e => setExistingCustomerEditForm(p => ({ ...p, postal_code: e.target.value }))} />
                                                                    <input className="flex-1 text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="Stad" value={existingCustomerEditForm.city} onChange={e => setExistingCustomerEditForm(p => ({ ...p, city: e.target.value }))} />
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-1.5">
                                                                    <input className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="Försäljningsområde" value={existingCustomerEditForm.sales_area} onChange={e => setExistingCustomerEditForm(p => ({ ...p, sales_area: e.target.value }))} />
                                                                    <select className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400" value={existingCustomerEditForm.vat_handling} onChange={e => setExistingCustomerEditForm(p => ({ ...p, vat_handling: e.target.value }))}>
                                                                        <option value="25%">25% moms</option>
                                                                        <option value="12%">12% moms</option>
                                                                        <option value="6%">6% moms</option>
                                                                        <option value="0%">Momsfri (0%)</option>
                                                                    </select>
                                                                    <select className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400" value={existingCustomerEditForm.invoice_delivery_method} onChange={e => setExistingCustomerEditForm(p => ({ ...p, invoice_delivery_method: e.target.value }))}>
                                                                        <option value="e-post">E-post</option>
                                                                        <option value="e-faktura">E-faktura</option>
                                                                        <option value="post">Post</option>
                                                                    </select>
                                                                    {existingCustomerEditForm.invoice_delivery_method === 'e-faktura' && (
                                                                        <input className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400" placeholder="E-fakturaadress" value={existingCustomerEditForm.e_invoice_address} onChange={e => setExistingCustomerEditForm(p => ({ ...p, e_invoice_address: e.target.value }))} />
                                                                    )}
                                                                </div>
                                                                <div className="flex gap-2 justify-end">
                                                                    <button type="button" className="text-xs text-gray-500 px-2 py-1" onClick={() => setIsEditingExistingCustomer(false)}>Avbryt</button>
                                                                    <button type="button" disabled={savingExistingCustomer}
                                                                        className="text-xs font-medium bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50"
                                                                        onClick={handleUpdateExistingCustomer}>
                                                                        {savingExistingCustomer ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Spara
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
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
                                            <span className="text-gray-600">
                                                {getActiveVatHandling() === 'omvänd byggmoms'
                                                    ? 'Moms (Omvänd byggmoms, 0%)'
                                                    : `Moms (${getActiveVatHandling()})`}
                                            </span>
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
