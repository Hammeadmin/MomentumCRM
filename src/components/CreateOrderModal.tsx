/**
 * Global Create Order Modal
 * Can be opened from anywhere in the app via GlobalActionContext
 */

import React, { useState, useEffect } from 'react';
import {
    X, Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { createJob, getCustomers, getTeamMembers } from '../lib/database';
import type { Customer, UserProfile, JobStatus, JobPriority } from '../types/database';

interface CreateOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOrderCreated?: () => void;
}

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
    isOpen,
    onClose,
    onOrderCreated
}) => {
    const { organisationId } = useAuth();
    const { success, error: showError } = useToast();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        customer_id: '',
        assigned_to_user_id: '',
        status: 'scheduled' as JobStatus,
        priority: 'medium' as JobPriority,
        scheduled_date: '',
        estimated_value: '',
    });

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(false);

    useEffect(() => {
        if (isOpen && organisationId) {
            setDataLoading(true);
            Promise.all([
                getCustomers(organisationId),
                getTeamMembers(organisationId)
            ]).then(([customersResult, teamMembersResult]) => {
                if (customersResult.data) setCustomers(customersResult.data);
                if (teamMembersResult.data) setTeamMembers(teamMembersResult.data);
                setDataLoading(false);
            });
        }
    }, [isOpen, organisationId]);

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

        setLoading(true);

        const { error } = await createJob({
            organisation_id: organisationId,
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            customer_id: formData.customer_id || null,
            assigned_to_user_id: formData.assigned_to_user_id || null,
            status: formData.status,
            priority: formData.priority,
            scheduled_date: formData.scheduled_date || null,
            estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
            quote_id: null,
        });

        if (error) {
            showError('Fel', `Kunde inte skapa order: ${error.message}`);
        } else {
            success('Order skapad', `${formData.title} har skapats`);
            onOrderCreated?.();
            onClose();
            // Reset form
            setFormData({
                title: '', description: '', customer_id: '', assigned_to_user_id: '',
                status: 'scheduled', priority: 'medium', scheduled_date: '', estimated_value: ''
            });
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Skapa Ny Order</h3>
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
                                    placeholder="T.ex. Takrengöring villa..."
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Beskrivning
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    placeholder="Detaljer om ordern..."
                                />
                            </div>

                            {/* Customer */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Kund
                                </label>
                                <select
                                    value={formData.customer_id}
                                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                >
                                    <option value="">Välj kund...</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            {/* Assigned To & Priority */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Tilldela till
                                    </label>
                                    <select
                                        value={formData.assigned_to_user_id}
                                        onChange={(e) => setFormData({ ...formData, assigned_to_user_id: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    >
                                        <option value="">Välj person...</option>
                                        {teamMembers.map(tm => <option key={tm.id} value={tm.id}>{tm.full_name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Prioritet
                                    </label>
                                    <select
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as JobPriority })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    >
                                        <option value="low">Låg</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">Hög</option>
                                        <option value="urgent">Brådskande</option>
                                    </select>
                                </div>
                            </div>

                            {/* Scheduled Date & Estimated Value */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Planerat datum
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.scheduled_date}
                                        onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Uppskattat värde (SEK)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.estimated_value}
                                        onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        placeholder="25000"
                                    />
                                </div>
                            </div>

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
                                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Skapa Order
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
};

export default CreateOrderModal;
