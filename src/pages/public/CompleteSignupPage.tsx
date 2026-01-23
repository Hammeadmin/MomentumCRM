import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    TrendingUp,
    User,
    Phone,
    Building2,
    FileText,
    Check,
    Loader2,
    AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

// Form data interface
interface CompleteSignupFormData {
    fullName: string;
    phoneNumber: string;
    companyName: string;
    orgNumber: string;
}

function CompleteSignupPage() {
    const navigate = useNavigate();
    const { user, userProfile, refreshProfile, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<CompleteSignupFormData>({
        fullName: '',
        phoneNumber: '',
        companyName: '',
        orgNumber: '',
    });

    // Pre-fill name from Google account if available
    useEffect(() => {
        if (user?.user_metadata?.full_name) {
            setFormData(prev => ({
                ...prev,
                fullName: user.user_metadata.full_name
            }));
        }
    }, [user]);

    // Redirect if user already has a profile
    useEffect(() => {
        if (!authLoading && userProfile) {
            navigate('/app');
        }
    }, [authLoading, userProfile, navigate]);

    // Show loading while checking auth state
    if (authLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
                    <p className="mt-4 text-gray-600">Laddar...</p>
                </div>
            </div>
        );
    }

    // If no user, redirect to login
    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white py-8 px-6 shadow-xl rounded-2xl border border-gray-100 text-center">
                    <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Ingen inloggning hittades</h2>
                    <p className="text-gray-600 mb-6">
                        Du måste logga in för att slutföra registreringen.
                    </p>
                    <Link
                        to="/login"
                        className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Gå till inloggning
                    </Link>
                </div>
            </div>
        );
    }

    // Update form data
    const updateFormData = (field: keyof CompleteSignupFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
    };

    // Validate form
    const validateForm = (): boolean => {
        if (!formData.fullName.trim()) {
            setError('Fullständigt namn krävs.');
            return false;
        }
        if (!formData.companyName.trim()) {
            setError('Företagsnamn krävs.');
            return false;
        }
        return true;
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setLoading(true);
        setError(null);

        try {
            // Call the RPC to complete organization signup
            const { error: rpcError } = await supabase.rpc('complete_organization_signup', {
                org_name: formData.companyName,
                org_number: formData.orgNumber || null,
                user_full_name: formData.fullName,
                user_phone_number: formData.phoneNumber || null,
            });

            if (rpcError) {
                console.error('Organization creation failed:', rpcError);
                throw new Error(
                    'Företagsregistreringen misslyckades. Försök igen eller kontakta support.'
                );
            }

            // Refresh the auth context with the new profile
            await refreshProfile();

            // Success! Redirect to dashboard
            navigate('/app');

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ett oväntat fel inträffade.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
            <div className="max-w-lg w-full space-y-8">
                {/* Logo and Header */}
                <div className="text-center">
                    <div className="flex items-center justify-center mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
                            <TrendingUp className="w-7 h-7 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">Momentum</h1>
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900">Slutför registrering</h2>
                    <p className="mt-2 text-gray-600">
                        Fyll i dina uppgifter för att komma igång
                    </p>
                </div>

                {/* Welcome message for Google users */}
                {user.email && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-center">
                        <p className="text-sm text-blue-700">
                            Välkommen <strong>{user.email}</strong>! Slutför din registrering nedan.
                        </p>
                    </div>
                )}

                {/* Form Card */}
                <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-gray-100">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Full Name */}
                        <div>
                            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                                Fullständigt namn <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="fullName"
                                    type="text"
                                    autoComplete="name"
                                    value={formData.fullName}
                                    onChange={(e) => updateFormData('fullName', e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    placeholder="Ditt fullständiga namn"
                                />
                            </div>
                        </div>

                        {/* Phone Number */}
                        <div>
                            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                                Telefonnummer
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Phone className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="phoneNumber"
                                    type="tel"
                                    autoComplete="tel"
                                    value={formData.phoneNumber}
                                    onChange={(e) => updateFormData('phoneNumber', e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    placeholder="070 123 4567"
                                />
                            </div>
                        </div>

                        {/* Company Name */}
                        <div>
                            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                                Företagsnamn <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Building2 className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="companyName"
                                    type="text"
                                    autoComplete="organization"
                                    value={formData.companyName}
                                    onChange={(e) => updateFormData('companyName', e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    placeholder="Ditt företagsnamn"
                                />
                            </div>
                        </div>

                        {/* Organization Number */}
                        <div>
                            <label htmlFor="orgNumber" className="block text-sm font-medium text-gray-700 mb-2">
                                Organisationsnummer
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FileText className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="orgNumber"
                                    type="text"
                                    value={formData.orgNumber}
                                    onChange={(e) => updateFormData('orgNumber', e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    placeholder="XXXXXX-XXXX"
                                />
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                                Valfritt - du kan lägga till detta senare i inställningar
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-start space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Skapar företag...
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4 mr-2" />
                                    Slutför registrering
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <div className="text-center text-sm text-gray-500">
                    <p>© 2026 Momentum CRM. Alla rättigheter förbehållna.</p>
                </div>
            </div>
        </div>
    );
}

export default CompleteSignupPage;
