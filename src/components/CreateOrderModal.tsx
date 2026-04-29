/**
 * Global Create Order Modal
 * Comprehensive order creation with inline customer creation
 * Can be opened from anywhere in the app via GlobalActionContext
 * Extracted from OrderKanban.tsx with parity to the full page-level form
 */

import React, { useState, useEffect } from 'react';
import {
    X, Loader2, UserPlus, Edit2, Save
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { createOrder } from '../lib/orders';
import { getCustomers, getTeamMembers, createCustomer, updateCustomer } from '../lib/database';
import { supabase } from '../lib/supabase';
import ROTFields from './ROTFields';
import RUTFields from './RUTFields';
import type { Customer, UserProfile } from '../types/database';
import {
    JOB_TYPE_LABELS,
    TEAM_SPECIALTY_LABELS,
    type OrderStatus,
    type JobType,
    type AssignmentType,
} from '../types/database';

// Team type (minimal, from supabase)
interface Team {
    id: string;
    name: string;
    specialty: string;
}

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
        job_description: '',
        job_type: 'allmänt' as JobType,
        customer_id: '',
        value: '',
        estimated_hours: '',
        complexity_level: '3',
        assignment_type: 'individual' as AssignmentType,
        assigned_to_user_id: '',
        assigned_to_team_id: '',
        source: '',
        include_rot: false,
        rot_personnummer: null as string | null,
        rot_organisationsnummer: null as string | null,
        rot_fastighetsbeteckning: null as string | null,
        rot_amount: 0,
        include_rut: false,
        rut_personnummer: null as string | null,
        rut_amount: 0,
        region: '',
    });

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(false);

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
            setDataLoading(true);
            Promise.all([
                getCustomers(organisationId),
                getTeamMembers(organisationId),
                supabase.from('teams').select('id, name, specialty').eq('organisation_id', organisationId)
            ]).then(([customersResult, teamMembersResult, teamsResult]) => {
                if (customersResult.data) setCustomers(customersResult.data);
                if (teamMembersResult.data) setTeamMembers(teamMembersResult.data);
                if (teamsResult.data) setTeams(teamsResult.data as Team[]);
                setDataLoading(false);
            });
        }
    }, [isOpen, organisationId]);

    const resetForm = () => {
        setFormData({
            title: '', description: '', job_description: '',
            job_type: 'allmänt', customer_id: '', value: '',
            estimated_hours: '', complexity_level: '3',
            assignment_type: 'individual', assigned_to_user_id: '',
            assigned_to_team_id: '', source: '',
            include_rot: false, rot_personnummer: null,
            rot_organisationsnummer: null, rot_fastighetsbeteckning: null,
            rot_amount: 0,
            include_rut: false, rut_personnummer: null, rut_amount: 0,
            region: '',
        });
        setIsNewCustomer(false);
        setNewCustomerForm({
            name: '', customer_type: 'company', org_number: '',
            email: '', phone_number: '', address: '', postal_code: '', city: '',
        });
    };

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

        if (!formData.job_description.trim()) {
            showError('Fel', 'Arbetsbeskrivning är obligatoriskt');
            return;
        }

        // Validate assignment
        if (formData.assignment_type === 'individual' && !formData.assigned_to_user_id) {
            showError('Fel', 'Välj en person att tilldela till');
            return;
        }
        if (formData.assignment_type === 'team' && !formData.assigned_to_team_id) {
            showError('Fel', 'Välj ett team att tilldela till');
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

            if (!customerId) {
                showError('Fel', 'Kund är obligatoriskt');
                setLoading(false);
                return;
            }

            const orderData = {
                organisation_id: organisationId,
                title: formData.title.trim(),
                description: formData.description.trim() || null,
                job_description: formData.job_description.trim(),
                job_type: formData.job_type,
                customer_id: customerId,
                value: formData.value ? parseFloat(formData.value) : null,
                estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
                complexity_level: parseInt(formData.complexity_level),
                assignment_type: formData.assignment_type,
                assigned_to_user_id: formData.assignment_type === 'individual' ? formData.assigned_to_user_id : null,
                assigned_to_team_id: formData.assignment_type === 'team' ? formData.assigned_to_team_id : null,
                source: formData.source.trim() || null,
                status: 'öppen_order' as OrderStatus,
                include_rot: formData.include_rot,
                rot_personnummer: formData.rot_personnummer,
                rot_organisationsnummer: formData.rot_organisationsnummer,
                rot_fastighetsbeteckning: formData.rot_fastighetsbeteckning,
                rot_amount: formData.rot_amount,
                include_rut: formData.include_rut,
                rut_personnummer: formData.rut_personnummer,
                rut_amount: formData.rut_amount,
                region: formData.region.trim() || null,
            };

            const result = await createOrder(orderData);

            if (result.error) {
                showError('Fel', result.error.message);
                return;
            }

            success('Order skapad', `${formData.title} har skapats`);
            onOrderCreated?.();
            onClose();
            resetForm();
        } catch (err) {
            console.error('Error creating order:', err);
            showError('Fel', 'Kunde inte skapa order');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-900">Skapa Ny Order</h3>
                    <button
                        onClick={() => { onClose(); resetForm(); }}
                        className="text-gray-400 hover:text-gray-600"
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
                                <label className="block text-sm font-medium text-gray-700 mb-2">Titel *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="T.ex. Takrengöring villa..."
                                />
                            </div>

                            {/* Customer Selection / New Customer Toggle */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium text-gray-700">Kund *</label>
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
                                    <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                        {/* Name */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Kundnamn *</label>
                                            <input
                                                type="text"
                                                value={newCustomerForm.name}
                                                onChange={e => setNewCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
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
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
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
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder={newCustomerForm.customer_type === 'company' ? '556xxx-xxxx' : 'YYYYMMDD-XXXX'}
                                                />
                                            </div>
                                        </div>
                                        {/* Email + Phone */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">E-post</label>
                                                <input
                                                    type="email"
                                                    value={newCustomerForm.email}
                                                    onChange={e => setNewCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="kund@exempel.se"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Telefon</label>
                                                <input
                                                    type="tel"
                                                    value={newCustomerForm.phone_number}
                                                    onChange={e => setNewCustomerForm(prev => ({ ...prev, phone_number: e.target.value }))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
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
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
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
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="123 45"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">Ort</label>
                                                <input
                                                    type="text"
                                                    value={newCustomerForm.city}
                                                    onChange={e => setNewCustomerForm(prev => ({ ...prev, city: e.target.value }))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="Stockholm"
                                                />
                                            </div>
                                        </div>
                                        <p className="text-xs text-blue-700">Kunden skapas automatiskt när du skapar ordern.</p>
                                    </div>
                                ) : (
                                    <>
                                        <select
                                            required={!isNewCustomer}
                                            value={formData.customer_id}
                                            onChange={(e) => setFormData(prev => ({ ...prev, customer_id: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                                        >
                                            <option value="">Välj kund...</option>
                                            {customers.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                        {formData.customer_id && (() => {
                                            const sel = customers.find(c => c.id === formData.customer_id);
                                            if (!sel) return null;
                                            return (
                                                <div className="mt-2 border border-gray-200 rounded-lg p-3 bg-gray-50 text-sm space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium text-gray-900">{sel.name}</span>
                                                        <span className="text-xs text-gray-400">{(sel as any).customer_type === 'company' ? 'Företag' : 'Privatperson'}</span>
                                                    </div>
                                                    {(sel as any).email && <p className="text-gray-500">{(sel as any).email}</p>}
                                                    {(sel as any).phone_number && <p className="text-gray-500">{(sel as any).phone_number}</p>}
                                                    {[(sel as any).address, (sel as any).postal_code, (sel as any).city].filter(Boolean).length > 0 && (
                                                        <p className="text-gray-500">{[(sel as any).address, (sel as any).postal_code, (sel as any).city].filter(Boolean).join(', ')}</p>
                                                    )}
                                                    {(sel as any).org_number && (
                                                        <p className="text-gray-500">{(sel as any).customer_type === 'company' ? 'Org.nummer' : 'Personnummer'}: {(sel as any).org_number}</p>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </>
                                )}
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Allmän beskrivning</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="Övergripande beskrivning..."
                                />
                            </div>

                            {/* Job Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Arbetsbeskrivning *</label>
                                <textarea
                                    required
                                    value={formData.job_description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, job_description: e.target.value }))}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="Detaljerad beskrivning av arbetet..."
                                />
                            </div>

                            {/* ROT + RUT Fields */}
                            <div className="border-t border-gray-200 pt-4 space-y-3">
                                <ROTFields
                                    data={{
                                        include_rot: formData.include_rot,
                                        rot_personnummer: formData.rot_personnummer,
                                        rot_organisationsnummer: formData.rot_organisationsnummer,
                                        rot_fastighetsbeteckning: formData.rot_fastighetsbeteckning,
                                        rot_amount: formData.rot_amount,
                                    }}
                                    onChange={(rotData) => {
                                        const reset = rotData.include_rot ? { include_rut: false, rut_personnummer: null, rut_amount: 0 } : {};
                                        setFormData(prev => ({ ...prev, ...rotData, ...reset }));
                                    }}
                                    totalAmount={parseFloat(formData.value) || 0}
                                />
                                <RUTFields
                                    data={{
                                        include_rut: formData.include_rut,
                                        rut_personnummer: formData.rut_personnummer,
                                        rut_amount: formData.rut_amount,
                                    }}
                                    onChange={(rutData) => {
                                        const reset = rutData.include_rut ? { include_rot: false, rot_personnummer: null, rot_organisationsnummer: null, rot_fastighetsbeteckning: null, rot_amount: 0 } : {};
                                        setFormData(prev => ({ ...prev, ...rutData, ...reset }));
                                    }}
                                    totalAmount={parseFloat(formData.value) || 0}
                                />
                            </div>

                            {/* Job Type, Estimated Hours, Complexity */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Jobbtyp *</label>
                                    <select
                                        required
                                        value={formData.job_type}
                                        onChange={(e) => setFormData(prev => ({ ...prev, job_type: e.target.value as JobType }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                                    >
                                        {Object.entries(JOB_TYPE_LABELS).map(([jobType, label]) => (
                                            <option key={jobType} value={jobType}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Uppskattade timmar</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        value={formData.estimated_hours}
                                        onChange={(e) => setFormData(prev => ({ ...prev, estimated_hours: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                                        placeholder="8.0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Komplexitet</label>
                                    <select
                                        value={formData.complexity_level}
                                        onChange={(e) => setFormData(prev => ({ ...prev, complexity_level: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                                    >
                                        <option value="1">1 - Mycket enkelt</option>
                                        <option value="2">2 - Enkelt</option>
                                        <option value="3">3 - Medel</option>
                                        <option value="4">4 - Svårt</option>
                                        <option value="5">5 - Mycket svårt</option>
                                    </select>
                                </div>
                            </div>

                            {/* Value & Source */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Värde (SEK)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formData.value}
                                        onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Källa</label>
                                    <input
                                        type="text"
                                        value={formData.source}
                                        onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                                        placeholder="T.ex. Hemsida, telefon, rekommendation..."
                                    />
                                </div>
                            </div>

                            {/* Region / Säljområde */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Säljområde / Region</label>
                                <input
                                    type="text"
                                    value={formData.region}
                                    onChange={(e) => setFormData(prev => ({ ...prev, region: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="T.ex. Stockholm, Göteborg..."
                                />
                            </div>

                            {/* Assignment Section */}
                            <div className="border-t border-gray-200 pt-4">
                                <h4 className="font-medium text-gray-900 mb-4">Tilldelning</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Tilldelningstyp *</label>
                                        <div className="flex space-x-4">
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    name="create_order_assignment_type"
                                                    value="individual"
                                                    checked={formData.assignment_type === 'individual'}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        assignment_type: e.target.value as AssignmentType,
                                                        assigned_to_team_id: '',
                                                        assigned_to_user_id: ''
                                                    }))}
                                                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                                                />
                                                <span className="ml-2 text-sm text-gray-700">Individ</span>
                                            </label>
                                            <label className="flex items-center">
                                                <input
                                                    type="radio"
                                                    name="create_order_assignment_type"
                                                    value="team"
                                                    checked={formData.assignment_type === 'team'}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        assignment_type: e.target.value as AssignmentType,
                                                        assigned_to_team_id: '',
                                                        assigned_to_user_id: ''
                                                    }))}
                                                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                                                />
                                                <span className="ml-2 text-sm text-gray-700">Team</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            {formData.assignment_type === 'individual' ? 'Tilldela till person' : 'Tilldela till team'}
                                        </label>
                                        {formData.assignment_type === 'individual' ? (
                                            <select
                                                value={formData.assigned_to_user_id}
                                                onChange={(e) => setFormData(prev => ({ ...prev, assigned_to_user_id: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                                            >
                                                <option value="">Välj person...</option>
                                                {teamMembers.map(member => (
                                                    <option key={member.id} value={member.id}>{member.full_name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <select
                                                value={formData.assigned_to_team_id}
                                                onChange={(e) => setFormData(prev => ({ ...prev, assigned_to_team_id: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                                            >
                                                <option value="">Välj team...</option>
                                                {teams
                                                    .filter(team => team.specialty === formData.job_type || team.specialty === 'allmänt')
                                                    .map(team => (
                                                        <option key={team.id} value={team.id}>
                                                            {team.name} ({TEAM_SPECIALTY_LABELS[team.specialty as keyof typeof TEAM_SPECIALTY_LABELS] ?? team.specialty})
                                                        </option>
                                                    ))}
                                            </select>
                                        )}

                                        {formData.assignment_type === 'team' && formData.job_type !== 'allmänt' && (
                                            <p className="text-xs text-blue-600 mt-1">
                                                Visar team som matchar jobbtypen "{JOB_TYPE_LABELS[formData.job_type]}"
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => { onClose(); resetForm(); }}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    Avbryt
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <div className="flex items-center">
                                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                                            <span className="ml-2">Skapar...</span>
                                        </div>
                                    ) : (
                                        isNewCustomer ? 'Skapa kund & order' : 'Skapa Order'
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

export default CreateOrderModal;
