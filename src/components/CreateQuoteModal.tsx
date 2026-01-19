/**
 * Global Create Quote Modal
 * Can be opened from anywhere in the app via GlobalActionContext
 * Creates a basic quote - user can add line items on the quotes page
 */

import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { createQuote, getCustomers, getLeads } from '../lib/database';
import type { Customer, Lead } from '../types/database';

interface CreateQuoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onQuoteCreated?: () => void;
    lead?: Lead | null; // Pre-populate from this lead
}

const CreateQuoteModal: React.FC<CreateQuoteModalProps> = ({
    isOpen,
    onClose,
    onQuoteCreated,
    lead
}) => {
    const { organisationId } = useAuth();
    const { success, error: showError } = useToast();

    const [formData, setFormData] = useState({
        title: '',
        customer_id: '',
        lead_id: '',
        valid_until: '',
        notes: '',
    });

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(false);

    useEffect(() => {
        if (isOpen && organisationId) {
            setDataLoading(true);
            Promise.all([
                getCustomers(organisationId),
                getLeads(organisationId)
            ]).then(([customersResult, leadsResult]) => {
                if (customersResult.data) setCustomers(customersResult.data);
                if (leadsResult.data) setLeads(leadsResult.data);
                setDataLoading(false);
            });

            // Pre-populate form if a lead is provided
            if (lead) {
                setFormData({
                    title: lead.title || '',
                    customer_id: lead.customer_id || '',
                    lead_id: lead.id,
                    valid_until: '',
                    notes: lead.description || '',
                });
            } else {
                // Reset form when no lead provided
                setFormData({
                    title: '', customer_id: '', lead_id: '', valid_until: '', notes: ''
                });
            }
        }
    }, [isOpen, organisationId, lead]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!organisationId) {
            showError('Fel', 'Organisation saknas');
            return;
        }

        if (!formData.title.trim()) {
            showError('Fel', 'Titel är obligatoriskt');
            return;
        }

        if (!formData.customer_id) {
            showError('Fel', 'Kund är obligatoriskt');
            return;
        }

        setLoading(true);

        // Create quote with a default line item
        const { error } = await createQuote(
            {
                organisation_id: organisationId,
                title: formData.title.trim(),
                customer_id: formData.customer_id,
                lead_id: formData.lead_id || null,
                valid_until: formData.valid_until || null,
                notes: formData.notes.trim() || null,
                status: 'draft',
            },
            // Add a placeholder line item
            [{
                description: formData.title.trim(),
                quantity: 1,
                unit_price: 0,
            }]
        );

        if (error) {
            showError('Fel', `Kunde inte skapa offert: ${error.message}`);
        } else {
            success('Offert skapad', `${formData.title} har skapats`);
            onQuoteCreated?.();
            onClose();
            // Reset form
            setFormData({
                title: '', customer_id: '', lead_id: '', valid_until: '', notes: ''
            });
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    // Set default valid_until to 30 days from now
    const defaultValidUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Skapa Ny Offert</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {dataLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                        </div>
                    ) : (
                        <>
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Titel *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    placeholder="T.ex. Offert för takarbete..."
                                />
                            </div>

                            {/* Customer */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Kund *
                                </label>
                                <select
                                    required
                                    value={formData.customer_id}
                                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                >
                                    <option value="">Välj kund...</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            {/* Lead (optional) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Kopplat Lead (valfritt)
                                </label>
                                <select
                                    value={formData.lead_id}
                                    onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                >
                                    <option value="">Inget lead...</option>
                                    {leads.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                                </select>
                            </div>

                            {/* Valid Until */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Giltig till
                                </label>
                                <input
                                    type="date"
                                    value={formData.valid_until || defaultValidUntil}
                                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Anteckningar
                                </label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    placeholder="Ytterligare information..."
                                />
                            </div>

                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Du kan lägga till produkter och rader efter att offerten skapats.
                            </p>

                            {/* Actions */}
                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Avbryt
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Skapa Offert
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
};

export default CreateQuoteModal;
