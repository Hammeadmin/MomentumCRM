import React, { useState, useEffect } from 'react';
import {
    X,
    Plus,
    Minus,
    AlertCircle,
    Package,
    Loader2
} from 'lucide-react';
import {
    createQuote,
    updateQuote,
    createCustomer,
    formatCurrency
} from '../lib/database';
import { useToast } from '../hooks/useToast';
import QuoteTemplateSelector from './QuoteTemplateSelector';
import ROTFields from '../components/ROTFields';
import RUTFields from '../components/RUTFields';
import ProductLibraryModal from './ProductLibraryModal';
import type { QuoteTemplate, ProductLibraryItem } from '../lib/quoteTemplates';
import type { Quote, Customer, Lead, QuoteStatus, QuoteLineItem } from '../types/database';

interface QuoteWithRelations extends Quote {
    customer?: Customer;
    lead?: Lead;
    line_items?: QuoteLineItem[];
}

interface QuoteFormData {
    customer_id: string;
    lead_id: string;
    title: string;
    description: string;
    valid_until: string;
    line_items: {
        description: string;
        quantity: number;
        unit_price: number;
        name?: string;
        unit?: string;
        category?: string;
    }[];
    include_rot: boolean;
    rot_personnummer: string | null;
    rot_organisationsnummer: string | null;
    rot_fastighetsbeteckning: string | null;
    rot_amount: number;
    include_rut: boolean;
    rut_personnummer: string | null;
    rut_amount: number;
}

interface QuoteEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    quote?: QuoteWithRelations | null;
    customers: Customer[];
    leads: Lead[];
    templates: QuoteTemplate[];
    companyInfo: any;
    organisationId: string;
    onSave: () => Promise<void>;
}

export default function QuoteEditModal({
    isOpen,
    onClose,
    quote,
    customers,
    leads,
    templates,
    companyInfo,
    organisationId,
    onSave
}: QuoteEditModalProps) {
    const { error: showToastError, success } = useToast();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showProductLibrary, setShowProductLibrary] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<QuoteTemplate | null>(null);

    const [isManualCustomer, setIsManualCustomer] = useState(false);
    const [manualCustomerForm, setManualCustomerForm] = useState({
        name: '',
        email: '',
        org_number: '',
        customer_type: 'company' as 'company' | 'private',
        address: '',
        postal_code: '',
        city: ''
    });

    const [quoteForm, setQuoteForm] = useState<QuoteFormData>({
        customer_id: '',
        lead_id: '',
        title: '',
        description: '',
        valid_until: '',
        line_items: [{ description: '', quantity: 1, unit_price: 0 }],
        include_rot: false,
        rot_personnummer: null,
        rot_organisationsnummer: null,
        rot_fastighetsbeteckning: null,
        rot_amount: 0,
        include_rut: false,
        rut_personnummer: null,
        rut_amount: 0
    });

    useEffect(() => {
        if (quote) {
            setQuoteForm({
                customer_id: quote.customer_id || '',
                lead_id: quote.lead_id || '',
                title: quote.title,
                description: quote.description || '',
                valid_until: quote.valid_until || '',
                line_items: quote.line_items && quote.line_items.length > 0
                    ? quote.line_items.map(item => ({
                        description: item.description,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        // Assuming these might exist on line items or needed for processing
                    }))
                    : [{ description: '', quantity: 1, unit_price: 0 }],
                include_rot: quote.include_rot || false,
                rot_personnummer: quote.rot_personnummer || null,
                rot_organisationsnummer: quote.rot_organisationsnummer || null,
                rot_fastighetsbeteckning: quote.rot_fastighetsbeteckning || null,
                rot_amount: quote.rot_amount || 0,
                include_rut: (quote as any).include_rut || false,
                rut_personnummer: (quote as any).rut_personnummer || null,
                rut_amount: (quote as any).rut_amount || 0
            });
        } else {
            // Reset form for create mode
            setQuoteForm({
                customer_id: '',
                lead_id: '',
                title: '',
                description: '',
                valid_until: '',
                line_items: [{ description: '', quantity: 1, unit_price: 0 }],
                include_rot: false,
                rot_personnummer: null,
                rot_organisationsnummer: null,
                rot_fastighetsbeteckning: null,
                rot_amount: 0,
                include_rut: false,
                rut_personnummer: null,
                rut_amount: 0
            });
            setSelectedTemplate(null);
        }
        setError(null);
    }, [quote, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if ((!isManualCustomer && !quoteForm.customer_id) || (isManualCustomer && !manualCustomerForm.name) || !quoteForm.title) {
            setError('Kund och titel är obligatoriska fält.');
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);

            let finalCustomerId = quoteForm.customer_id;

            if (isManualCustomer) {
                const { data: newCustomer, error: customerError } = await createCustomer({
                    organisation_id: organisationId,
                    ...manualCustomerForm
                } as Omit<Customer, 'id' | 'created_at'>);

                if (customerError) {
                    setError(`Kunde inte skapa kund: ${customerError.message}`);
                    setIsSubmitting(false);
                    return;
                }
                if (newCustomer) {
                    finalCustomerId = newCustomer.id;
                }
            }

            const commonData = {
                customer_id: finalCustomerId,
                lead_id: quoteForm.lead_id || null,
                title: quoteForm.title,
                description: quoteForm.description || null,
                valid_until: quoteForm.valid_until || null,
                include_rot: quoteForm.include_rot,
                rot_personnummer: quoteForm.rot_personnummer,
                rot_organisationsnummer: quoteForm.rot_organisationsnummer,
                rot_fastighetsbeteckning: quoteForm.rot_fastighetsbeteckning,
                rot_amount: quoteForm.rot_amount,
                include_rut: quoteForm.include_rut,
                rut_personnummer: quoteForm.rut_personnummer,
                rut_amount: quoteForm.rut_amount
            };

            const lineItems = quoteForm.line_items
                .filter(item => item.description.trim() && item.quantity > 0 && item.unit_price >= 0)
                .map((item, index) => ({
                    ...item,
                    total: item.quantity * item.unit_price,
                    sort_order: index
                }));

            let result;
            if (quote) {
                // Update
                result = await updateQuote(quote.id, commonData, lineItems);
            } else {
                // Create
                result = await createQuote({
                    ...commonData,
                    organisation_id: organisationId,
                    status: 'draft',
                    total_amount: 0 // Calc by DB
                }, lineItems);
            }

            if (result.error) {
                setError(result.error.message);
                return;
            }

            success(quote ? 'Offert uppdaterad' : 'Offert skapad', `"${quoteForm.title}" har sparats.`);
            onClose();
            await onSave();
        } catch (err: any) {
            console.error('Error saving quote:', err);
            setError('Kunde inte spara offert.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const calculateSubtotal = () => {
        return quoteForm.line_items.reduce((sum, item) =>
            sum + (item.quantity * item.unit_price), 0
        );
    };

    const calculateVAT = () => {
        return calculateSubtotal() * 0.25;
    };

    const calculateTotal = () => {
        return calculateSubtotal() + calculateVAT();
    };

    const addLineItem = () => {
        setQuoteForm(prev => ({
            ...prev,
            line_items: [...prev.line_items, { description: '', quantity: 1, unit_price: 0 }]
        }));
    };

    const removeLineItem = (index: number) => {
        if (quoteForm.line_items.length > 1) {
            setQuoteForm(prev => ({
                ...prev,
                line_items: prev.line_items.filter((_, i) => i !== index)
            }));
        }
    };

    const updateLineItem = (index: number, field: string, value: any) => {
        setQuoteForm(prev => ({
            ...prev,
            line_items: prev.line_items.map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            )
        }));
    };

    const handleTemplateSelect = (template: QuoteTemplate) => {
        setSelectedTemplate(template);

        // Convert template line items to quote line items
        const defaultItems = template.default_line_items || [];
        const templateLineItems = defaultItems.map((item, index) => ({
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            name: item.name,
            unit: item.unit,
            category: item.category
        }));

        // Calculate totals
        const subtotal = templateLineItems.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);
        const vatRate = (template.settings.default_vat_rate || 25) / 100;
        const vatAmount = subtotal * vatRate;
        const total = subtotal + vatAmount;

        // Update form data with template values
        setQuoteForm(prev => ({
            ...prev,
            title: template.name,
            description: template.description || '',
            line_items: templateLineItems,
            // Set valid until date based on template or default 30 days
            valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }));
    };

    const handleSelectTemplate = (template: QuoteTemplate) => {
        // Compatibility wrapper for selector
        handleTemplateSelect(template);
    };

    const handleAddFromLibrary = (products: Array<ProductLibraryItem & { quantity: number }>) => {
        const newLineItems = products.map(product => ({
            description: product.description,
            quantity: product.quantity,
            unit_price: product.unit_price,
            name: product.name,
            unit: product.unit,
            category: product.category
        }));

        setQuoteForm(prev => ({
            ...prev,
            line_items: [...(prev.line_items || []), ...newLineItems]
        }));

        setShowProductLibrary(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {quote ? 'Redigera Offert' : 'Skapa Offert'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Template Selector - Only show when creating new quote */}
                    {!quote && templates.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <QuoteTemplateSelector
                                organisationId={organisationId}
                                onSelectTemplate={handleTemplateSelect}
                                onSelectPartial={(template, selectedItems) => {
                                    // Simplified partial select handling for now
                                    const selectedLineItems = selectedItems.map(index => {
                                        const item = template.default_line_items[index];
                                        return {
                                            description: item.description,
                                            quantity: item.quantity,
                                            unit_price: item.unit_price,
                                        };
                                    });
                                    setQuoteForm(prev => ({
                                        ...prev,
                                        line_items: [...prev.line_items, ...selectedLineItems]
                                    }));
                                }}
                                companyInfo={companyInfo}
                            />
                        </div>
                    )}

                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-gray-700">Kund *</label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsManualCustomer(!isManualCustomer);
                                        if (!isManualCustomer) {
                                            setQuoteForm(prev => ({ ...prev, customer_id: '' }));
                                        }
                                    }}
                                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                                >
                                    {isManualCustomer ? 'Välj befintlig kund' : 'Ny kund (Manuell)'}
                                </button>
                            </div>
                            {isManualCustomer ? (
                                <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <input
                                        type="text"
                                        required
                                        value={manualCustomerForm.name}
                                        onChange={e => setManualCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        placeholder="Kundnamn *"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <select
                                            value={manualCustomerForm.customer_type}
                                            onChange={e => setManualCustomerForm(prev => ({ ...prev, customer_type: e.target.value as 'company' | 'private' }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        >
                                            <option value="company">Företag</option>
                                            <option value="private">Privatperson</option>
                                        </select>
                                        <input
                                            type="text"
                                            value={manualCustomerForm.org_number}
                                            onChange={e => setManualCustomerForm(prev => ({ ...prev, org_number: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                            placeholder={manualCustomerForm.customer_type === 'company' ? 'Org.nummer' : 'Personnummer'}
                                        />
                                    </div>
                                    <input
                                        type="email"
                                        value={manualCustomerForm.email}
                                        onChange={e => setManualCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        placeholder="E-post"
                                    />
                                </div>
                            ) : (
                                <select
                                    required={!isManualCustomer}
                                    value={quoteForm.customer_id}
                                    onChange={(e) => setQuoteForm(prev => ({ ...prev, customer_id: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Välj kund</option>
                                    {customers.map((customer) => (
                                        <option key={customer.id} value={customer.id}>
                                            {customer.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Relaterad Lead (valfritt)
                            </label>
                            <select
                                value={quoteForm.lead_id}
                                onChange={(e) => setQuoteForm(prev => ({ ...prev, lead_id: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Ingen lead</option>
                                {leads.filter(lead => !quoteForm.customer_id || lead.customer_id === quoteForm.customer_id).map((lead) => (
                                    <option key={lead.id} value={lead.id}>
                                        {lead.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Titel *
                            </label>
                            <input
                                type="text"
                                required
                                value={quoteForm.title}
                                onChange={(e) => setQuoteForm(prev => ({ ...prev, title: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Offertens titel"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Giltig till
                            </label>
                            <input
                                type="date"
                                value={quoteForm.valid_until}
                                onChange={(e) => setQuoteForm(prev => ({ ...prev, valid_until: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Beskrivning
                        </label>
                        <textarea
                            value={quoteForm.description}
                            onChange={(e) => setQuoteForm(prev => ({ ...prev, description: e.target.value }))}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Beskrivning av offerten..."
                        />
                    </div>

                    {/* Line Items */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-medium text-gray-900">Radposter</h4>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => setShowProductLibrary(true)}
                                    type="button"
                                    className="inline-flex items-center px-3 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
                                >
                                    <Package className="w-4 h-4 mr-2" />
                                    Lägg till från bibliotek
                                </button>
                                <button
                                    onClick={addLineItem}
                                    type="button"
                                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Lägg till artikel
                                </button>
                            </div>
                        </div>

                        {/* ROT/RUT DEDUCTION SECTION */}
                        <div className="border-t border-gray-200 pt-6 space-y-4">
                            <ROTFields
                                data={{
                                    include_rot: quoteForm.include_rot,
                                    rot_personnummer: quoteForm.rot_personnummer,
                                    rot_organisationsnummer: quoteForm.rot_organisationsnummer,
                                    rot_fastighetsbeteckning: quoteForm.rot_fastighetsbeteckning,
                                    rot_amount: quoteForm.rot_amount,
                                }}
                                onChange={(rotData) =>
                                    setQuoteForm(prev => ({
                                        ...prev,
                                        ...rotData,
                                        rot_amount: rotData.rot_amount || 0,
                                        // Mutual exclusion: disable RUT when ROT is enabled
                                        ...(rotData.include_rot ? { include_rut: false, rut_personnummer: null, rut_amount: 0 } : {})
                                    }))
                                }
                                totalAmount={calculateTotal()}
                            />
                            <RUTFields
                                data={{
                                    include_rut: quoteForm.include_rut,
                                    rut_personnummer: quoteForm.rut_personnummer,
                                    rut_amount: quoteForm.rut_amount,
                                }}
                                onChange={(rutData) =>
                                    setQuoteForm(prev => ({
                                        ...prev,
                                        ...rutData,
                                        rut_amount: rutData.rut_amount || 0,
                                        // Mutual exclusion: disable ROT when RUT is enabled
                                        ...(rutData.include_rut ? { include_rot: false, rot_personnummer: null, rot_organisationsnummer: null, rot_fastighetsbeteckning: null, rot_amount: 0 } : {})
                                    }))
                                }
                                totalAmount={calculateTotal()}
                            />
                        </div>

                        <div className="space-y-3">
                            {quoteForm.line_items.map((item, index) => (
                                <div key={index} className="grid grid-cols-12 gap-3 items-end">
                                    <div className="col-span-5">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Beskrivning
                                        </label>
                                        <input
                                            type="text"
                                            value={item.description}
                                            onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                                            placeholder="Beskrivning av tjänst/produkt"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Antal
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={item.quantity}
                                            onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Enhetspris
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={item.unit_price}
                                            onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Totalt
                                        </label>
                                        <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-900">
                                            {formatCurrency(item.quantity * item.unit_price)}
                                        </div>
                                    </div>
                                    <div className="col-span-1">
                                        <button
                                            type="button"
                                            onClick={() => removeLineItem(index)}
                                            disabled={quoteForm.line_items.length === 1}
                                            className="p-2 text-red-600 hover:text-red-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Totals */}
                        <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Subtotal:</span>
                                    <span>{formatCurrency(calculateSubtotal())}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Moms (25%):</span>
                                    <span>{formatCurrency(calculateVAT())}</span>
                                </div>
                                <div className="flex justify-between text-lg font-semibold border-t pt-2">
                                    <span>Totalt:</span>
                                    <span>{formatCurrency(calculateTotal())}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                            <AlertCircle className="h-5 w-5 flex-shrink-0" />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                            Avbryt
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <div className="flex items-center">
                                    <Loader2 className="animate-spin h-4 w-4 border-b-2 border-white mr-2" />
                                    {quote ? 'Uppdaterar...' : 'Skapar...'}
                                </div>
                            ) : (
                                quote ? 'Uppdatera Offert' : 'Skapa Offert'
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Product Library Modal */}
            {showProductLibrary && organisationId && (
                <ProductLibraryModal
                    isOpen={showProductLibrary}
                    onClose={() => setShowProductLibrary(false)}
                    onSelectProducts={handleAddFromLibrary}
                    organisationId={organisationId}
                    multiSelect={true}
                />
            )}
        </div>
    );
}
