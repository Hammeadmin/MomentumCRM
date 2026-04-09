/**
 * Global Create Customer Modal
 * Comprehensive customer creation with all fields from CustomerManagement
 * Can be opened from anywhere in the app via GlobalActionContext
 * Extracted from CustomerManagement.tsx with full parity
 */

import React, { useState, useEffect } from 'react';
import { X, Loader2, Building, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { createCustomer, checkDuplicateCustomer } from '../lib/database';
import type { Customer } from '../types/database';

interface CustomerFormData {
    name: string;
    email: string;
    phone_number: string;
    address: string;
    postal_code: string;
    city: string;
    customer_type: 'private' | 'company';
    org_number: string;
    sales_area: string;
    vat_handling: '25%' | 'omvänd byggmoms';
    e_invoice_address: string;
    invoice_delivery_method: 'e-post' | 'brev' | 'e-faktura';
    include_rot: boolean;
    rot_personnummer: string;
    rot_fastighetsbeteckning: string;
    include_rut: boolean;
    rut_personnummer: string;
}

const getInitialFormData = (): CustomerFormData => ({
    name: '',
    email: '',
    phone_number: '',
    address: '',
    postal_code: '',
    city: '',
    customer_type: 'company',
    org_number: '',
    sales_area: '',
    vat_handling: '25%',
    e_invoice_address: '',
    invoice_delivery_method: 'e-post',
    include_rot: false,
    rot_personnummer: '',
    rot_fastighetsbeteckning: '',
    include_rut: false,
    rut_personnummer: '',
});

const formatPersonnummer = (value: string): string => {
    const digits = value.replace(/[^0-9]/g, '');
    if (digits.length === 0) return '';
    if (digits.startsWith('19') || digits.startsWith('20')) {
        if (digits.length <= 8) return digits;
        return digits.slice(0, 8) + '-' + digits.slice(8, 12);
    }
    if (digits.length === 10) {
        const yy = parseInt(digits.slice(0, 2), 10);
        const currentYearShort = new Date().getFullYear() % 100;
        const century = yy > currentYearShort ? '19' : '20';
        const fullDigits = century + digits;
        return fullDigits.slice(0, 8) + '-' + fullDigits.slice(8, 12);
    }
    if (digits.length <= 8) return digits;
    return digits.slice(0, 8) + '-' + digits.slice(8, 10);
};


interface CreateCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCustomerCreated: () => void;
}

const CreateCustomerModal: React.FC<CreateCustomerModalProps> = ({ isOpen, onClose, onCustomerCreated }) => {
    const { organisationId } = useAuth();
    const { success, error: showError } = useToast();

    const [customerForm, setCustomerForm] = useState<CustomerFormData>(getInitialFormData());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [duplicateError, setDuplicateError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setCustomerForm(getInitialFormData());
            setDuplicateError(null);
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organisationId) {
            showError('Fel', 'Organisation saknas');
            return;
        }

        if (!customerForm.name.trim()) {
            showError('Fel', 'Kundnamn är obligatoriskt');
            return;
        }

        setIsSubmitting(true);
        setDuplicateError(null);

        try {
            // Check for duplicates
            const duplicateCheck = await checkDuplicateCustomer(
                organisationId,
                customerForm.email,
                customerForm.name,
                undefined
            );
            if (duplicateCheck.error) throw new Error(duplicateCheck.error.message);
            if (duplicateCheck.isDuplicate) {
                const field = duplicateCheck.duplicateField === 'email' ? 'e-postadress' : 'namn';
                setDuplicateError(`En kund med samma ${field} finns redan.`);
                setIsSubmitting(false);
                return;
            }

            const customerData = {
                ...customerForm,
                organisation_id: organisationId,
                email: customerForm.email || null,
                phone_number: customerForm.phone_number || null,
                address: customerForm.address || null,
                postal_code: customerForm.postal_code || null,
                city: customerForm.city || null,
                org_number: customerForm.customer_type === 'company' ? customerForm.org_number || null : null,
                sales_area: customerForm.sales_area || null,
                e_invoice_address: customerForm.e_invoice_address || null,
                include_rot: customerForm.include_rot,
                rot_personnummer: customerForm.rot_personnummer || null,
                rot_fastighetsbeteckning: customerForm.rot_fastighetsbeteckning || null,
                include_rut: customerForm.include_rut,
                rut_personnummer: customerForm.rut_personnummer || null,
            };

            const result = await createCustomer(customerData as any);

            if (result.error) throw new Error(result.error.message);

            success('Kund skapad', `${customerForm.name} har lagts till som kund.`);
            onCustomerCreated();
            onClose();
        } catch (err: any) {
            showError('Fel', err.message || 'Kunde inte skapa kund.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b">
                    <h3 className="text-xl font-bold text-gray-800">Skapa Ny Kund</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form
                    id="create-customer-form"
                    onSubmit={handleSubmit}
                    className="flex-1 overflow-y-auto p-6 space-y-6"
                >
                    {duplicateError && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm flex items-center">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            {duplicateError}
                        </div>
                    )}

                    {/* Customer Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Kundtyp</label>
                        <div className="flex items-center space-x-4 p-1 bg-gray-100 rounded-lg">
                            <button
                                type="button"
                                onClick={() => setCustomerForm(prev => ({ ...prev, customer_type: 'company' }))}
                                className={`flex-1 py-2 rounded-md text-sm flex items-center justify-center gap-2 ${customerForm.customer_type === 'company' ? 'bg-white shadow font-medium' : ''}`}
                            >
                                <Building className="w-4 h-4" />
                                Företag
                            </button>
                            <button
                                type="button"
                                onClick={() => setCustomerForm(prev => ({ ...prev, customer_type: 'private' }))}
                                className={`flex-1 py-2 rounded-md text-sm flex items-center justify-center gap-2 ${customerForm.customer_type === 'private' ? 'bg-white shadow font-medium' : ''}`}
                            >
                                <User className="w-4 h-4" />
                                Privatperson
                            </button>
                        </div>
                    </div>

                    {/* Name + Org Number */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {customerForm.customer_type === 'company' ? 'Företagsnamn' : 'Namn'} *
                            </label>
                            <input
                                type="text"
                                required
                                value={customerForm.name}
                                onChange={(e) => setCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-md"
                            />
                        </div>
                        {customerForm.customer_type === 'company' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Organisationsnummer</label>
                                <input
                                    type="text"
                                    value={customerForm.org_number}
                                    onChange={(e) => setCustomerForm(prev => ({ ...prev, org_number: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded-md"
                                />
                            </div>
                        )}
                    </div>

                    {/* Email + Phone */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">E-post</label>
                            <input
                                type="email"
                                value={customerForm.email}
                                onChange={(e) => setCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                            <input
                                type="tel"
                                value={customerForm.phone_number}
                                onChange={(e) => setCustomerForm(prev => ({ ...prev, phone_number: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-md"
                            />
                        </div>
                    </div>

                    {/* Address */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Adress</label>
                        <input
                            type="text"
                            value={customerForm.address}
                            onChange={(e) => setCustomerForm(prev => ({ ...prev, address: e.target.value }))}
                            className="w-full px-3 py-2 border rounded-md"
                        />
                    </div>

                    {/* Postal + City */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Postnummer</label>
                            <input
                                type="text"
                                value={customerForm.postal_code}
                                onChange={(e) => setCustomerForm(prev => ({ ...prev, postal_code: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-md"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ort</label>
                            <input
                                type="text"
                                value={customerForm.city}
                                onChange={(e) => setCustomerForm(prev => ({ ...prev, city: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-md"
                            />
                        </div>
                    </div>

                    {/* Sales Area */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Säljområde</label>
                        <input
                            type="text"
                            value={customerForm.sales_area}
                            onChange={(e) => setCustomerForm(prev => ({ ...prev, sales_area: e.target.value }))}
                            className="w-full px-3 py-2 border rounded-md"
                            placeholder="T.ex. Stockholm, Göteborg..."
                        />
                    </div>

                    {/* Invoice Settings */}
                    <div className="border-t pt-6">
                        <h4 className="text-md font-semibold text-gray-800 mb-4">Faktureringsinställningar</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Momshantering</label>
                                <select
                                    value={customerForm.vat_handling}
                                    onChange={(e) => setCustomerForm(prev => ({ ...prev, vat_handling: e.target.value as any }))}
                                    className="w-full px-3 py-2 border rounded-md bg-white"
                                >
                                    <option value="25%">25% (Standard)</option>
                                    <option value="omvänd byggmoms">Omvänd byggmoms</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Leveranssätt för faktura</label>
                                <select
                                    value={customerForm.invoice_delivery_method}
                                    onChange={(e) => setCustomerForm(prev => ({ ...prev, invoice_delivery_method: e.target.value as any }))}
                                    className="w-full px-3 py-2 border rounded-md bg-white"
                                >
                                    <option value="e-post">E-post</option>
                                    <option value="brev">Brev</option>
                                    <option value="e-faktura">E-faktura</option>
                                </select>
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">E-fakturaadress (valfritt)</label>
                            <input
                                type="text"
                                value={customerForm.e_invoice_address}
                                onChange={(e) => setCustomerForm(prev => ({ ...prev, e_invoice_address: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-md"
                                placeholder="GLN-nummer eller Peppol-ID"
                            />
                        </div>
                    </div>

                    {/* ROT / RUT Section - private customers only */}
                    {customerForm.customer_type === 'private' && (
                        <div className="border-t pt-6">
                            <h4 className="text-md font-semibold text-gray-800 mb-4">ROT / RUT-uppgifter</h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Personnummer (ROT)</label>
                                    <input
                                        type="text"
                                        value={customerForm.rot_personnummer}
                                        onChange={(e) => setCustomerForm(prev => ({ ...prev, rot_personnummer: formatPersonnummer(e.target.value) }))}
                                        placeholder="YYYYMMDD-XXXX"
                                        maxLength={13}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fastighetsbeteckning</label>
                                    <input
                                        type="text"
                                        value={customerForm.rot_fastighetsbeteckning}
                                        onChange={(e) => setCustomerForm(prev => ({ ...prev, rot_fastighetsbeteckning: e.target.value }))}
                                        placeholder="t.ex. Stockholm Södermalm 1:23"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Personnummer (RUT)</label>
                                    <input
                                        type="text"
                                        value={customerForm.rut_personnummer}
                                        onChange={(e) => setCustomerForm(prev => ({ ...prev, rut_personnummer: formatPersonnummer(e.target.value) }))}
                                        placeholder="YYYYMMDD-XXXX"
                                        maxLength={13}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={customerForm.include_rot}
                                        onChange={(e) => setCustomerForm(prev => ({ ...prev, include_rot: e.target.checked, include_rut: e.target.checked ? false : prev.include_rut }))}
                                        className="rounded border-gray-300"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Inkludera ROT-avdrag</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={customerForm.include_rut}
                                        onChange={(e) => setCustomerForm(prev => ({ ...prev, include_rut: e.target.checked, include_rot: e.target.checked ? false : prev.include_rot }))}
                                        className="rounded border-gray-300"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Inkludera RUT-avdrag</span>
                                </label>
                            </div>
                        </div>
                    )}
                </form>

                <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        Avbryt
                    </button>
                    <button
                        type="submit"
                        form="create-customer-form"
                        disabled={isSubmitting}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Sparar...
                            </>
                        ) : (
                            'Skapa Kund'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateCustomerModal;
