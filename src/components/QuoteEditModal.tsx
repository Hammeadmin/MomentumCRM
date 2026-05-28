import React, { useState, useEffect, useRef } from 'react';
import {
    X,
    Plus,
    Minus,
    AlertCircle,
    Package,
    Loader2,
    Mail,
    Phone,
    MapPin,
    Building2,
    Edit2,
    Save,
    Paperclip,
    Upload,
    Download,
    Trash2,
} from 'lucide-react';
import {
    createQuote,
    updateQuote,
    createCustomer,
    updateCustomer,
    formatCurrency
} from '../lib/database';
import {
    getAttachmentsForQuote,
    addAttachmentToQuote,
    deleteQuoteAttachment,
    getQuoteAttachmentPublicUrl,
    type QuoteAttachment,
} from '../lib/quotes';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../contexts/AuthContext';
import QuoteTemplateSelector from './QuoteTemplateSelector';
import ROTFields from '../components/ROTFields';
import RUTFields from '../components/RUTFields';
import ProductLibraryModal from './ProductLibraryModal';
import type { QuoteTemplate, ProductLibraryItem } from '../lib/quoteTemplates';
import type { Quote, Customer, Lead, QuoteStatus, QuoteLineItem, UserProfile, Team, AssignmentType } from '../types/database';
import CityAutocomplete from './CityAutocomplete';

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
    // Assignment
    assignment_type: '' | 'individual' | 'team';
    assigned_to_user_id: string;
    assigned_to_team_id: string;
    city: string;
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
    /** Pre-fill data when creating from a lead */
    initialData?: {
        customer_id?: string;
        lead_id?: string;
        title?: string;
        description?: string;
    } | null;
    teamMembers?: UserProfile[];
    teams?: Team[];
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
    onSave,
    initialData,
    teamMembers = [],
    teams = [],
}: QuoteEditModalProps) {
    const { error: showToastError, success } = useToast();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showProductLibrary, setShowProductLibrary] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<QuoteTemplate | null>(null);

    // Attachments (edit mode only — requires saved quote id)
    const [attachments, setAttachments] = useState<QuoteAttachment[]>([]);
    const [uploadingAttachment, setUploadingAttachment] = useState(false);
    const attachmentInputRef = useRef<HTMLInputElement>(null);

    const [isEditingExistingCustomer, setIsEditingExistingCustomer] = useState(false);
    const [isSavingCustomer, setIsSavingCustomer] = useState(false);
    const [existingCustomerForm, setExistingCustomerForm] = useState<Partial<Customer>>({});

    const [isManualCustomer, setIsManualCustomer] = useState(false);
    const [manualCustomerForm, setManualCustomerForm] = useState({
        name: '',
        email: '',
        phone_number: '',
        org_number: '',
        customer_type: 'company' as 'company' | 'private',
        address: '',
        postal_code: '',
        city: '',
        sales_area: '',
        vat_handling: '25%',
        e_invoice_address: '',
        invoice_delivery_method: 'e-post',
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
        rut_amount: 0,
        assignment_type: '',
        assigned_to_user_id: '',
        assigned_to_team_id: '',
        city: '',
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
                    }))
                    : [{ description: '', quantity: 1, unit_price: 0 }],
                include_rot: quote.include_rot || false,
                rot_personnummer: quote.rot_personnummer || null,
                rot_organisationsnummer: quote.rot_organisationsnummer || null,
                rot_fastighetsbeteckning: quote.rot_fastighetsbeteckning || null,
                rot_amount: quote.rot_amount || 0,
                include_rut: (quote as any).include_rut || false,
                rut_personnummer: (quote as any).rut_personnummer || null,
                rut_amount: (quote as any).rut_amount || 0,
                assignment_type: (quote.assignment_type as '' | 'individual' | 'team') || '',
                assigned_to_user_id: quote.assigned_to_user_id || '',
                assigned_to_team_id: quote.assigned_to_team_id || '',
                city: quote.city || '',
            });
        } else if (initialData) {
            // Pre-fill from lead data
            setQuoteForm({
                customer_id: initialData.customer_id || '',
                lead_id: initialData.lead_id || '',
                title: initialData.title || '',
                description: initialData.description || '',
                valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                line_items: [{ description: '', quantity: 1, unit_price: 0 }],
                include_rot: false,
                rot_personnummer: null,
                rot_organisationsnummer: null,
                rot_fastighetsbeteckning: null,
                rot_amount: 0,
                include_rut: false,
                rut_personnummer: null,
                rut_amount: 0,
                assignment_type: '',
                assigned_to_user_id: '',
                assigned_to_team_id: '',
                city: '',
            });
            setSelectedTemplate(null);
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
                rut_amount: 0,
                assignment_type: '',
                assigned_to_user_id: '',
                assigned_to_team_id: '',
                city: '',
            });
            setSelectedTemplate(null);
        }
        setError(null);
        setIsManualCustomer(false);
        setIsEditingExistingCustomer(false);
        setExistingCustomerForm({});
        setManualCustomerForm({
            name: '', email: '', phone_number: '', org_number: '',
            customer_type: 'company', address: '', postal_code: '', city: '',
            sales_area: '', vat_handling: '25%', e_invoice_address: '', invoice_delivery_method: 'e-post',
        });
    }, [quote, isOpen, initialData]);

    // Populate the inline customer form whenever the selected customer changes
    useEffect(() => {
        if (!quoteForm.customer_id) {
            setIsEditingExistingCustomer(false);
            setExistingCustomerForm({});
            return;
        }
        const found = customers.find(c => c.id === quoteForm.customer_id);
        if (found) setExistingCustomerForm({ ...found });
    }, [quoteForm.customer_id, customers]);

    // Load attachments whenever editing an existing quote
    useEffect(() => {
        if (quote?.id) {
            getAttachmentsForQuote(quote.id).then(({ data }) => {
                if (data) setAttachments(data);
            });
        } else {
            setAttachments([]);
        }
    }, [quote?.id, isOpen]);

    const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!quote?.id || !user) return;
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingAttachment(true);
        try {
            const { error } = await addAttachmentToQuote(quote.id, organisationId, user.id, file);
            if (error) { showToastError('Fel', 'Kunde inte ladda upp bilaga.'); return; }
            const { data } = await getAttachmentsForQuote(quote.id);
            if (data) setAttachments(data);
            success('Klart', 'Bilaga uppladdad.');
        } catch {
            showToastError('Fel', 'Kunde inte ladda upp bilaga.');
        } finally {
            setUploadingAttachment(false);
            e.target.value = '';
        }
    };

    const handleDeleteAttachment = async (attachment: QuoteAttachment) => {
        if (!quote?.id) return;
        if (!confirm(`Ta bort bilagan "${attachment.file_name}"?`)) return;
        try {
            const { error } = await deleteQuoteAttachment(attachment);
            if (error) { showToastError('Fel', 'Kunde inte ta bort bilaga.'); return; }
            const { data } = await getAttachmentsForQuote(quote.id);
            if (data) setAttachments(data);
        } catch {
            showToastError('Fel', 'Kunde inte ta bort bilaga.');
        }
    };

    const handleUpdateExistingCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quoteForm.customer_id) return;
        setIsSavingCustomer(true);
        try {
            const { error: updateError } = await updateCustomer(quoteForm.customer_id, existingCustomerForm);
            if (updateError) {
                setError(`Kunde inte uppdatera kund: ${updateError.message}`);
            } else {
                success('Kund uppdaterad', `${existingCustomerForm.name} har sparats.`);
                setIsEditingExistingCustomer(false);
            }
        } catch (err: any) {
            setError('Kunde inte uppdatera kund.');
        } finally {
            setIsSavingCustomer(false);
        }
    };

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
                rut_amount: quoteForm.rut_amount,
                assignment_type: quoteForm.assignment_type || null,
                assigned_to_user_id: quoteForm.assignment_type === 'individual' ? quoteForm.assigned_to_user_id || null : null,
                assigned_to_team_id: quoteForm.assignment_type === 'team' ? quoteForm.assigned_to_team_id || null : null,
                city: quoteForm.city || null,
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
                    total_amount: 0, // Calc by DB
                    created_by_user_id: user?.id ?? null,
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]" onClick={onClose}>
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
                                <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    {/* Row 1: Name (required) */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Kundnamn *</label>
                                        <input
                                            type="text"
                                            required
                                            value={manualCustomerForm.name}
                                            onChange={e => setManualCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Företagsnamn eller för- och efternamn"
                                        />
                                    </div>

                                    {/* Row 2: Type + Org/Person nummer */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Kundtyp</label>
                                            <select
                                                value={manualCustomerForm.customer_type}
                                                onChange={e => setManualCustomerForm(prev => ({ ...prev, customer_type: e.target.value as 'company' | 'private', org_number: '' }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                            >
                                                <option value="company">Företag</option>
                                                <option value="private">Privatperson</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                                {manualCustomerForm.customer_type === 'company' ? 'Org.nummer' : 'Personnummer'}
                                            </label>
                                            <input
                                                type="text"
                                                value={manualCustomerForm.org_number}
                                                onChange={e => setManualCustomerForm(prev => ({ ...prev, org_number: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                                placeholder={manualCustomerForm.customer_type === 'company' ? '556xxx-xxxx' : 'YYYYMMDD-XXXX'}
                                            />
                                        </div>
                                    </div>

                                    {/* Row 3: Email + Phone */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">E-post</label>
                                            <input
                                                type="email"
                                                value={manualCustomerForm.email}
                                                onChange={e => setManualCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="kund@exempel.se"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Telefonnummer</label>
                                            <input
                                                type="tel"
                                                value={manualCustomerForm.phone_number}
                                                onChange={e => setManualCustomerForm(prev => ({ ...prev, phone_number: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="070-123 45 67"
                                            />
                                        </div>
                                    </div>

                                    {/* Row 4: Address */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Adress</label>
                                        <input
                                            type="text"
                                            value={manualCustomerForm.address}
                                            onChange={e => setManualCustomerForm(prev => ({ ...prev, address: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Gatuadress"
                                        />
                                    </div>

                                    {/* Row 5: Postal code + City */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Postnummer</label>
                                            <input
                                                type="text"
                                                value={manualCustomerForm.postal_code}
                                                onChange={e => setManualCustomerForm(prev => ({ ...prev, postal_code: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="123 45"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Stad</label>
                                            <CityAutocomplete value={manualCustomerForm.city} onChange={v => setManualCustomerForm(prev => ({ ...prev, city: v }))} placeholder="Stockholm" className="w-full" inputClassName="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500" />
                                        </div>
                                    </div>

                                    {/* Row 6: Sales area + VAT handling */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Försäljningsområde</label>
                                            <input
                                                type="text"
                                                value={manualCustomerForm.sales_area}
                                                onChange={e => setManualCustomerForm(prev => ({ ...prev, sales_area: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="t.ex. Stockholm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Momshantering</label>
                                            <select
                                                value={manualCustomerForm.vat_handling}
                                                onChange={e => setManualCustomerForm(prev => ({ ...prev, vat_handling: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                            >
                                                <option value="25%">25% moms</option>
                                                <option value="12%">12% moms</option>
                                                <option value="6%">6% moms</option>
                                                <option value="0%">Momsfri (0%)</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Row 7: Invoice delivery + E-invoice address */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Fakturaleverans</label>
                                            <select
                                                value={manualCustomerForm.invoice_delivery_method}
                                                onChange={e => setManualCustomerForm(prev => ({ ...prev, invoice_delivery_method: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                            >
                                                <option value="e-post">E-post</option>
                                                <option value="e-faktura">E-faktura</option>
                                                <option value="post">Post</option>
                                            </select>
                                        </div>
                                        {manualCustomerForm.invoice_delivery_method === 'e-faktura' && (
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">E-fakturaadress</label>
                                                <input
                                                    type="text"
                                                    value={manualCustomerForm.e_invoice_address}
                                                    onChange={e => setManualCustomerForm(prev => ({ ...prev, e_invoice_address: e.target.value }))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="GLN / PEPPOL-ID"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <select
                                        required={!isManualCustomer}
                                        value={quoteForm.customer_id}
                                        onChange={(e) => {
                                            setQuoteForm(prev => ({ ...prev, customer_id: e.target.value }));
                                            setIsEditingExistingCustomer(false);
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Välj kund</option>
                                        {customers.map((customer) => (
                                            <option key={customer.id} value={customer.id}>
                                                {customer.name}
                                            </option>
                                        ))}
                                    </select>

                                    {/* Customer info panel */}
                                    {quoteForm.customer_id && (
                                        <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                                            {!isEditingExistingCustomer ? (
                                                /* ── Read-only view ── */
                                                <div className="p-4">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                            Kundinformation
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsEditingExistingCustomer(true)}
                                                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-100 hover:border-slate-300 transition-colors"
                                                        >
                                                            <Edit2 className="w-3 h-3" />
                                                            Redigera
                                                        </button>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        {existingCustomerForm.org_number && (
                                                            <div className="flex items-center gap-2 text-sm text-slate-700">
                                                                <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                                                <span className="text-slate-500 text-xs">
                                                                    {existingCustomerForm.customer_type === 'company' ? 'Org.nummer:' : 'Personnummer:'}
                                                                </span>
                                                                <span>{existingCustomerForm.org_number}</span>
                                                            </div>
                                                        )}
                                                        {existingCustomerForm.email && (
                                                            <div className="flex items-center gap-2 text-sm text-slate-700">
                                                                <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                                                <a href={`mailto:${existingCustomerForm.email}`} className="hover:text-blue-600 transition-colors truncate">
                                                                    {existingCustomerForm.email}
                                                                </a>
                                                            </div>
                                                        )}
                                                        {existingCustomerForm.phone_number && (
                                                            <div className="flex items-center gap-2 text-sm text-slate-700">
                                                                <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                                                <a href={`tel:${existingCustomerForm.phone_number}`} className="hover:text-blue-600 transition-colors">
                                                                    {existingCustomerForm.phone_number}
                                                                </a>
                                                            </div>
                                                        )}
                                                        {(existingCustomerForm.address || existingCustomerForm.city) && (
                                                            <div className="flex items-start gap-2 text-sm text-slate-700">
                                                                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                                                                <span>
                                                                    {existingCustomerForm.address}
                                                                    {existingCustomerForm.address && existingCustomerForm.city && ', '}
                                                                    {existingCustomerForm.postal_code && `${existingCustomerForm.postal_code} `}
                                                                    {existingCustomerForm.city}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {!existingCustomerForm.org_number && !existingCustomerForm.email && !existingCustomerForm.phone_number && !existingCustomerForm.address && (
                                                            <p className="text-xs text-slate-400 italic">Ingen ytterligare information registrerad.</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                /* ── Edit view ── */
                                                <form onSubmit={handleUpdateExistingCustomer}>
                                                    <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-200">
                                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                            Redigera kund
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const original = customers.find(c => c.id === quoteForm.customer_id);
                                                                if (original) setExistingCustomerForm({ ...original });
                                                                setIsEditingExistingCustomer(false);
                                                            }}
                                                            className="text-slate-400 hover:text-slate-600 transition-colors"
                                                            title="Avbryt"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <div className="p-4 space-y-3">
                                                        {/* Name */}
                                                        <div>
                                                            <label className="block text-xs font-medium text-slate-600 mb-1">Kundnamn</label>
                                                            <input
                                                                type="text"
                                                                value={existingCustomerForm.name || ''}
                                                                onChange={e => setExistingCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                                                                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                                            />
                                                        </div>
                                                        {/* Org number */}
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="block text-xs font-medium text-slate-600 mb-1">
                                                                    {existingCustomerForm.customer_type === 'company' ? 'Org.nummer' : 'Personnummer'}
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={existingCustomerForm.org_number || ''}
                                                                    onChange={e => setExistingCustomerForm(prev => ({ ...prev, org_number: e.target.value }))}
                                                                    placeholder={existingCustomerForm.customer_type === 'company' ? '556xxx-xxxx' : 'ÅÅMMDD-XXXX'}
                                                                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-medium text-slate-600 mb-1">Telefon</label>
                                                                <input
                                                                    type="tel"
                                                                    value={existingCustomerForm.phone_number || ''}
                                                                    onChange={e => setExistingCustomerForm(prev => ({ ...prev, phone_number: e.target.value }))}
                                                                    placeholder="070-123 45 67"
                                                                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                                                />
                                                            </div>
                                                        </div>
                                                        {/* Email */}
                                                        <div>
                                                            <label className="block text-xs font-medium text-slate-600 mb-1">E-post</label>
                                                            <input
                                                                type="email"
                                                                value={existingCustomerForm.email || ''}
                                                                onChange={e => setExistingCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                                                                placeholder="kund@exempel.se"
                                                                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                                            />
                                                        </div>
                                                        {/* Address */}
                                                        <div>
                                                            <label className="block text-xs font-medium text-slate-600 mb-1">Adress</label>
                                                            <input
                                                                type="text"
                                                                value={existingCustomerForm.address || ''}
                                                                onChange={e => setExistingCustomerForm(prev => ({ ...prev, address: e.target.value }))}
                                                                placeholder="Gatuadress"
                                                                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                                            />
                                                        </div>
                                                        {/* Postal + City */}
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="block text-xs font-medium text-slate-600 mb-1">Postnummer</label>
                                                                <input
                                                                    type="text"
                                                                    value={existingCustomerForm.postal_code || ''}
                                                                    onChange={e => setExistingCustomerForm(prev => ({ ...prev, postal_code: e.target.value }))}
                                                                    placeholder="123 45"
                                                                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-medium text-slate-600 mb-1">Stad</label>
                                                                <CityAutocomplete value={existingCustomerForm.city || ''} onChange={v => setExistingCustomerForm(prev => ({ ...prev, city: v }))} placeholder="Stockholm" className="w-full" inputClassName="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                                                            </div>
                                                        </div>
                                                        {/* Footer buttons */}
                                                        <div className="flex justify-end gap-2 pt-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const original = customers.find(c => c.id === quoteForm.customer_id);
                                                                    if (original) setExistingCustomerForm({ ...original });
                                                                    setIsEditingExistingCustomer(false);
                                                                }}
                                                                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                                                            >
                                                                Avbryt
                                                            </button>
                                                            <button
                                                                type="submit"
                                                                disabled={isSavingCustomer}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                                            >
                                                                {isSavingCustomer
                                                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                                                    : <Save className="w-3 h-3" />}
                                                                Spara
                                                            </button>
                                                        </div>
                                                    </div>
                                                </form>
                                            )}
                                        </div>
                                    )}
                                </>
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

                    {/* Assignment + City — only shown when teamMembers/teams are available */}
                    {(teamMembers.length > 0 || teams.length > 0) && (
                        <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                            <h4 className="text-sm font-semibold text-gray-700">Tilldelning</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {/* Assignment type toggle */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Typ</label>
                                    <div className="flex rounded-md border border-gray-300 overflow-hidden">
                                        {(['', 'individual', 'team'] as const).map((t) => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => setQuoteForm(prev => ({
                                                    ...prev,
                                                    assignment_type: t,
                                                    assigned_to_user_id: '',
                                                    assigned_to_team_id: '',
                                                }))}
                                                className={`flex-1 py-1.5 text-xs font-medium transition-colors ${quoteForm.assignment_type === t
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-white text-gray-600 hover:bg-gray-50'
                                                }`}
                                            >
                                                {t === '' ? 'Ingen' : t === 'individual' ? 'Person' : 'Team'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Person or team dropdown */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                        {quoteForm.assignment_type === 'team' ? 'Team' : 'Säljare'}
                                    </label>
                                    {quoteForm.assignment_type === 'team' ? (
                                        <select
                                            value={quoteForm.assigned_to_team_id}
                                            onChange={e => setQuoteForm(prev => ({ ...prev, assigned_to_team_id: e.target.value }))}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="">-- Välj team --</option>
                                            {teams.map(team => (
                                                <option key={team.id} value={team.id}>{team.name}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <select
                                            value={quoteForm.assigned_to_user_id}
                                            onChange={e => setQuoteForm(prev => ({ ...prev, assigned_to_user_id: e.target.value }))}
                                            disabled={quoteForm.assignment_type === ''}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                                        >
                                            <option value="">-- Välj säljare --</option>
                                            {teamMembers.map(m => (
                                                <option key={m.id} value={m.id}>{m.full_name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* City */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Stad / Område</label>
                                    <CityAutocomplete value={quoteForm.city} onChange={v => setQuoteForm(prev => ({ ...prev, city: v }))} placeholder="t.ex. Stockholm" className="w-full" inputClassName="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                                </div>
                            </div>
                        </div>
                    )}

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

                    {/* Bilagor — only available when editing an existing quote */}
                    {quote?.id && (
                        <div className="border-t border-gray-200 pt-6">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                    <Paperclip className="w-4 h-4 text-gray-400" />
                                    Bilagor
                                    {attachments.length > 0 && (
                                        <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-100 rounded-full">
                                            {attachments.length}
                                        </span>
                                    )}
                                </h4>
                                <button
                                    type="button"
                                    onClick={() => attachmentInputRef.current?.click()}
                                    disabled={uploadingAttachment}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                                >
                                    {uploadingAttachment
                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        : <Upload className="w-3.5 h-3.5" />
                                    }
                                    Ladda upp
                                </button>
                                <input
                                    ref={attachmentInputRef}
                                    type="file"
                                    className="hidden"
                                    onChange={handleAttachmentUpload}
                                />
                            </div>
                            {attachments.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">Inga bilagor uppladdade.</p>
                            ) : (
                                <div className="space-y-2">
                                    {attachments.map(att => (
                                        <div key={att.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Paperclip className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                <span className="text-sm text-gray-700 truncate">{att.file_name}</span>
                                            </div>
                                            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                                                <a
                                                    href={getQuoteAttachmentPublicUrl(att.file_path)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1 text-gray-400 hover:text-blue-600 rounded"
                                                    title="Ladda ned"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                </a>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteAttachment(att)}
                                                    className="p-1 text-gray-400 hover:text-red-600 rounded"
                                                    title="Ta bort"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

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
