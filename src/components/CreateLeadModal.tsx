/**
 * Global Create Lead Modal
 * Comprehensive lead creation with inline customer creation
 * Can be opened from anywhere in the app via GlobalActionContext
 * Extracted from LeadManagement.tsx LeadFormModal with full parity
 */

import React, { useState, useEffect } from 'react';
import { X, Loader2, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { createLead } from '../lib/leads';
import { getCustomers, getTeamMembers, createCustomer } from '../lib/database';
import type { Customer, UserProfile, LeadStatus } from '../types/database';

interface CreateLeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLeadCreated: () => void;
}

const CreateLeadModal: React.FC<CreateLeadModalProps> = ({ isOpen, onClose, onLeadCreated }) => {
    const { user, organisationId } = useAuth();
    const { success, error: showError } = useToast();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        source: '',
        status: 'new' as LeadStatus,
        estimated_value: '',
        customer_id: '',
        assigned_to_user_id: '',
    });

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Inline customer creation state
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
    });

    useEffect(() => {
        if (isOpen && organisationId) {
            setErrors({});
            setFormData({
                title: '',
                description: '',
                source: '',
                status: 'new',
                estimated_value: '',
                customer_id: '',
                assigned_to_user_id: user?.id || '',
            });
            setIsNewCustomer(false);
            setNewCustomerForm({
                name: '', customer_type: 'company', org_number: '',
                email: '', phone_number: '', address: '', postal_code: '', city: '',
            });

            const loadModalData = async () => {
                const [customersResult, teamMembersResult] = await Promise.all([
                    getCustomers(organisationId),
                    getTeamMembers(organisationId),
                ]);
                if (customersResult.data) setCustomers(customersResult.data);
                if (teamMembersResult.data) setTeamMembers(teamMembersResult.data);
            };
            loadModalData();
        }
    }, [isOpen, organisationId, user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            showError('Fel', 'Du måste vara inloggad för att skapa ett lead.');
            return;
        }

        if (!formData.title.trim()) {
            setErrors({ title: 'Titel är obligatoriskt' });
            return;
        }

        setLoading(true);
        setErrors({});

        try {
            // Handle inline customer creation
            let customerId = formData.customer_id;
            if (isNewCustomer && !customerId) {
                if (!newCustomerForm.name.trim()) {
                    showError('Fel', 'Kundnamn är obligatoriskt');
                    setLoading(false);
                    return;
                }

                const { data: createdCustomer, error: customerError } = await createCustomer({
                    organisation_id: organisationId!,
                    name: newCustomerForm.name.trim(),
                    customer_type: newCustomerForm.customer_type,
                    org_number: newCustomerForm.org_number.trim() || null,
                    email: newCustomerForm.email.trim() || null,
                    phone_number: newCustomerForm.phone_number.trim() || null,
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
                success('Kund skapad', `${createdCustomer.name} har lagts till`);
            }

            const leadData = {
                organisation_id: organisationId!,
                title: formData.title.trim(),
                description: formData.description.trim() || null,
                source: formData.source.trim() || null,
                status: formData.status,
                estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
                customer_id: customerId || null,
                assigned_to_user_id: formData.assigned_to_user_id || null,
            };

            const { error } = await createLead(leadData as any);

            if (error) {
                showError('Fel', `Kunde inte skapa lead: ${error.message}`);
            } else {
                success('Framgång', 'Nytt lead har skapats!');
                onLeadCreated();
                onClose();
            }
        } catch (err) {
            console.error('Error creating lead:', err);
            showError('Fel', 'Kunde inte skapa lead');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 transition-opacity" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h3 className="text-2xl font-bold text-gray-800">Skapa Ny Förfrågan (Lead)</h3>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="space-y-4">
                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-primary-500 focus:border-primary-500 ${errors.title ? 'border-red-500' : 'border-gray-300'}`}
                                placeholder="T.ex. Takrengöring villa..."
                            />
                            {errors.title && <p className="text-red-600 text-xs mt-1">{errors.title}</p>}
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivning</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                placeholder="Ange så mycket detaljer som möjligt..."
                            />
                        </div>

                        {/* Source + Estimated Value */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Källa</label>
                                <input
                                    type="text"
                                    value={formData.source}
                                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="T.ex. Hemsidan, Rekommendation..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Uppskattat Värde (SEK)</label>
                                <input
                                    type="number"
                                    value={formData.estimated_value}
                                    onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="25000"
                                />
                            </div>
                        </div>

                        {/* Customer Selection / New Customer Toggle */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700">Kund</label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsNewCustomer(!isNewCustomer);
                                        if (!isNewCustomer) {
                                            setFormData(prev => ({ ...prev, customer_id: '' }));
                                        }
                                    }}
                                    className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                >
                                    <UserPlus className="w-3 h-3" />
                                    {isNewCustomer ? 'Välj befintlig kund' : 'Skapa ny kund'}
                                </button>
                            </div>

                            {isNewCustomer ? (
                                <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    {/* Name */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Kundnamn *</label>
                                        <input
                                            type="text"
                                            value={newCustomerForm.name}
                                            onChange={e => setNewCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                            placeholder="Företagsnamn eller personnamn"
                                        />
                                    </div>
                                    {/* Type + Org number */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Kundtyp</label>
                                            <select
                                                value={newCustomerForm.customer_type}
                                                onChange={e => setNewCustomerForm(prev => ({ ...prev, customer_type: e.target.value as 'company' | 'private', org_number: '' }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                            >
                                                <option value="company">Företag</option>
                                                <option value="private">Privatperson</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                                {newCustomerForm.customer_type === 'company' ? 'Org.nummer' : 'Personnummer'}
                                            </label>
                                            <input
                                                type="text"
                                                value={newCustomerForm.org_number}
                                                onChange={e => setNewCustomerForm(prev => ({ ...prev, org_number: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                                placeholder={newCustomerForm.customer_type === 'company' ? '556xxx-xxxx' : 'YYYYMMDD-XXXX'}
                                            />
                                        </div>
                                    </div>
                                    {/* Email + Phone */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">E-post</label>
                                            <input
                                                type="email"
                                                value={newCustomerForm.email}
                                                onChange={e => setNewCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                                placeholder="kund@foretag.se"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Telefon</label>
                                            <input
                                                type="tel"
                                                value={newCustomerForm.phone_number}
                                                onChange={e => setNewCustomerForm(prev => ({ ...prev, phone_number: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                                placeholder="070-123 45 67"
                                            />
                                        </div>
                                    </div>
                                    {/* Address */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Adress</label>
                                        <input
                                            type="text"
                                            value={newCustomerForm.address}
                                            onChange={e => setNewCustomerForm(prev => ({ ...prev, address: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                            placeholder="Gatuadress"
                                        />
                                    </div>
                                    {/* Postal + City */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Postnummer</label>
                                            <input
                                                type="text"
                                                value={newCustomerForm.postal_code}
                                                onChange={e => setNewCustomerForm(prev => ({ ...prev, postal_code: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                                placeholder="123 45"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Ort</label>
                                            <input
                                                type="text"
                                                value={newCustomerForm.city}
                                                onChange={e => setNewCustomerForm(prev => ({ ...prev, city: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                                placeholder="Stockholm"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-blue-700">Kunden skapas automatiskt när du sparar leaden.</p>
                                </div>
                            ) : (
                                <select
                                    value={formData.customer_id}
                                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                                >
                                    <option value="">Välj kund (om befintlig)...</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            )}
                        </div>

                        {/* Salesperson Assignment */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tilldela till Säljare</label>
                            <select
                                value={formData.assigned_to_user_id}
                                onChange={(e) => setFormData({ ...formData, assigned_to_user_id: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                            >
                                <option value="">Välj säljare...</option>
                                {teamMembers.filter(tm => tm.role === 'sales' || tm.role === 'admin').map(tm => (
                                    <option key={tm.id} value={tm.id}>{tm.full_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end space-x-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-all"
                        >
                            Avbryt
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center px-5 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition-all"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : (isNewCustomer ? 'Skapa kund & lead' : 'Skapa Lead')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateLeadModal;