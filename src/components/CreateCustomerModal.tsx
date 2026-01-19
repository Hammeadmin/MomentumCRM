/**
 * Global Create Customer Modal
 * Can be opened from anywhere in the app via GlobalActionContext
 */

import React, { useState } from 'react';
import { X, Loader2, User, Building } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { createCustomer } from '../lib/database';

interface CreateCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCustomerCreated?: () => void;
}

const CreateCustomerModal: React.FC<CreateCustomerModalProps> = ({
    isOpen,
    onClose,
    onCustomerCreated
}) => {
    const { organisationId } = useAuth();
    const { success, error: showError } = useToast();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone_number: '',
        address: '',
        postal_code: '',
        city: '',
        customer_type: 'private' as 'private' | 'company',
        org_number: '',
    });

    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!organisationId) {
            showError('Fel', 'Organisation saknas');
            return;
        }

        if (!formData.name.trim()) {
            showError('Fel', 'Namn är obligatoriskt');
            return;
        }

        setLoading(true);

        const { error } = await createCustomer({
            organisation_id: organisationId,
            name: formData.name.trim(),
            email: formData.email.trim() || null,
            phone_number: formData.phone_number.trim() || null,
            address: formData.address.trim() || null,
            postal_code: formData.postal_code.trim() || null,
            city: formData.city.trim() || null,
            customer_type: formData.customer_type,
            org_number: formData.org_number.trim() || null,
        });

        if (error) {
            showError('Fel', `Kunde inte skapa kund: ${error.message}`);
        } else {
            success('Kund skapad', `${formData.name} har lagts till`);
            onCustomerCreated?.();
            onClose();
            // Reset form
            setFormData({
                name: '', email: '', phone_number: '', address: '',
                postal_code: '', city: '', customer_type: 'private', org_number: ''
            });
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Skapa Ny Kund</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Customer Type Toggle */}
                    <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, customer_type: 'private' })}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${formData.customer_type === 'private'
                                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400'
                                }`}
                        >
                            <User className="w-4 h-4" />
                            Privatperson
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, customer_type: 'company' })}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${formData.customer_type === 'company'
                                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400'
                                }`}
                        >
                            <Building className="w-4 h-4" />
                            Företag
                        </button>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {formData.customer_type === 'company' ? 'Företagsnamn' : 'Namn'} *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder={formData.customer_type === 'company' ? 'AB Företaget' : 'Anna Andersson'}
                        />
                    </div>

                    {/* Org Number (company only) */}
                    {formData.customer_type === 'company' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Organisationsnummer
                            </label>
                            <input
                                type="text"
                                value={formData.org_number}
                                onChange={(e) => setFormData({ ...formData, org_number: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                placeholder="556677-8899"
                            />
                        </div>
                    )}

                    {/* Email & Phone */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                E-post
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                placeholder="namn@epost.se"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Telefon
                            </label>
                            <input
                                type="tel"
                                value={formData.phone_number}
                                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                placeholder="070-123 45 67"
                            />
                        </div>
                    </div>

                    {/* Address */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Adress
                        </label>
                        <input
                            type="text"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Storgatan 1"
                        />
                    </div>

                    {/* Postal Code & City */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Postnummer
                            </label>
                            <input
                                type="text"
                                value={formData.postal_code}
                                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                placeholder="123 45"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Ort
                            </label>
                            <input
                                type="text"
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                placeholder="Stockholm"
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
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Skapa Kund
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateCustomerModal;
