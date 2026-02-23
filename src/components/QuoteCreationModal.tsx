/**
 * QuoteCreationModal Component
 * Modal for creating a quote from a lead with line items
 * Shows pre-filled lead info and allows editing line items before creating the quote
 */

import { useState, useEffect } from 'react';
import { X, FileText, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { createQuote, updateLead, createCustomer } from '../lib/database';
import LineItemsEditor, { type LineItem } from './LineItemsEditor';
import type { LeadWithRelations } from '../lib/leads';

// ============================================================================
// Types
// ============================================================================

interface QuoteCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onQuoteCreated?: () => void;
    lead: LeadWithRelations;
}

// ============================================================================
// Component
// ============================================================================

export function QuoteCreationModal({
    isOpen,
    onClose,
    onQuoteCreated,
    lead
}: QuoteCreationModalProps) {
    const { organisationId } = useAuth();
    const { success, error: showError } = useToast();

    const [loading, setLoading] = useState(false);
    const [lineItems, setLineItems] = useState<LineItem[]>([]);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        valid_days: 30
    });

    const [manualCustomerForm, setManualCustomerForm] = useState({
        name: '',
        email: '',
        org_number: '',
        customer_type: 'company' as 'company' | 'private',
        address: '',
        postal_code: '',
        city: ''
    });

    // Initialize form with lead data
    useEffect(() => {
        if (isOpen && lead) {
            setFormData({
                title: `Offert - ${lead.title}`,
                description: lead.description || '',
                valid_days: 30
            });

            // Initialize with one line item if lead has estimated value
            if (lead.estimated_value && lead.estimated_value > 0) {
                setLineItems([{
                    description: lead.title,
                    quantity: 1,
                    unit_price: lead.estimated_value,
                    total: lead.estimated_value
                }]);
            } else {
                setLineItems([]);
            }
        }
    }, [isOpen, lead]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!lead.customer_id && !manualCustomerForm.name) {
            showError('Fel', 'Du måste ange ett kundnamn eller ha en kopplad kund för att skapa offert.');
            return;
        }

        if (lineItems.length === 0) {
            showError('Fel', 'Lägg till minst en produkt/tjänst för offerten.');
            return;
        }

        setLoading(true);

        try {
            let customerId = lead.customer_id;

            if (!customerId) {
                const { data: newCustomer, error: customerError } = await createCustomer({
                    organisation_id: organisationId!,
                    ...manualCustomerForm
                } as any);

                if (customerError || !newCustomer) {
                    throw new Error(`Kunde inte skapa kund: ${customerError?.message || 'Okänt fel'}`);
                }

                customerId = newCustomer.id;
                await updateLead(lead.id, { customer_id: customerId });
            }

            // Calculate valid until date
            const validUntil = new Date();
            validUntil.setDate(validUntil.getDate() + formData.valid_days);

            // Map line items to quote format
            const quoteLineItems = lineItems.map((item, index) => ({
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total: item.quantity * item.unit_price,
                sort_order: index
            }));

            // Create the quote
            const { error } = await createQuote(
                {
                    organisation_id: organisationId!,
                    customer_id: customerId,
                    lead_id: lead.id,
                    title: formData.title,
                    description: formData.description || null,
                    status: 'draft' as const,
                    valid_until: validUntil.toISOString().split('T')[0],
                    total_amount: 0, // Will be calculated by createQuote
                },
                quoteLineItems
            );

            if (error) throw error;

            // Update lead status to qualified
            await updateLead(lead.id, { status: 'qualified' });

            success('Offert skapad!', `${formData.title} har skapats med ${lineItems.length} rader.`);
            onQuoteCreated?.();
            onClose();
        } catch (err: any) {
            showError('Fel', `Kunde inte skapa offert: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Calculate total
    const totalAmount = lineItems.reduce((sum, item) => sum + (item.total || 0), 0);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mr-3">
                            <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Skapa Offert från Lead
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {lead.customer?.name || 'Okänd kund'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Warning if no customer */}
                    {!lead.customer_id && (
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <div className="flex items-start gap-3 mb-4">
                                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                                <div>
                                    <p className="font-medium text-amber-800 dark:text-amber-300">
                                        Ingen kund kopplad
                                    </p>
                                    <p className="text-sm text-amber-700 dark:text-amber-400">
                                        Skapa en ny kund för detta lead nedan för att kunna skapa offerten.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3 bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700">
                                <input
                                    type="text"
                                    required
                                    value={manualCustomerForm.name}
                                    onChange={e => setManualCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Kundnamn *"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <select
                                        value={manualCustomerForm.customer_type}
                                        onChange={e => setManualCustomerForm(prev => ({ ...prev, customer_type: e.target.value as 'company' | 'private' }))}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="company">Företag</option>
                                        <option value="private">Privatperson</option>
                                    </select>
                                    <input
                                        type="text"
                                        value={manualCustomerForm.org_number}
                                        onChange={e => setManualCustomerForm(prev => ({ ...prev, org_number: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder={manualCustomerForm.customer_type === 'company' ? 'Org.nummer' : 'Personnummer'}
                                    />
                                </div>
                                <input
                                    type="email"
                                    value={manualCustomerForm.email}
                                    onChange={e => setManualCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="E-post"
                                />
                            </div>
                        </div>
                    )}

                    {/* Title & Validity */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Offertens titel
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Giltig (dagar)
                            </label>
                            <select
                                value={formData.valid_days}
                                onChange={(e) => setFormData({ ...formData, valid_days: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                            >
                                <option value={7}>7 dagar</option>
                                <option value={14}>14 dagar</option>
                                <option value={30}>30 dagar</option>
                                <option value={60}>60 dagar</option>
                                <option value={90}>90 dagar</option>
                            </select>
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <LineItemsEditor
                            lineItems={lineItems}
                            onChange={setLineItems}
                            showLibrary={true}
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Anteckningar (visas på offerten)
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                            placeholder="Ytterligare information..."
                        />
                    </div>

                    {/* Summary */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                {lineItems.length} produkt{lineItems.length !== 1 ? 'er' : ''}
                            </span>
                            <div className="text-right">
                                <p className="text-sm text-gray-500 dark:text-gray-400">Totalt belopp</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {totalAmount.toLocaleString('sv-SE')} kr
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            Avbryt
                        </button>
                        <button
                            type="submit"
                            disabled={loading || (!lead.customer_id && !manualCustomerForm.name) || lineItems.length === 0}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Skapar...
                                </>
                            ) : (
                                'Skapa Offert'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default QuoteCreationModal;
