import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    TrendingUp,
    Mail,
    Lock,
    Eye,
    EyeOff,
    AlertCircle,
    User,
    Phone,
    Building2,
    FileText,
    ArrowRight,
    ArrowLeft,
    Check,
    Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

// Form data interface
interface SignupFormData {
    // Step 1: Credentials
    email: string;
    password: string;
    confirmPassword: string;
    // Step 2: User Details
    fullName: string;
    phoneNumber: string;
    // Step 3: Company Details
    companyName: string;
    orgNumber: string;
}

// Step configuration
const STEPS = [
    { id: 1, title: 'Inloggningsuppgifter', icon: Mail },
    { id: 2, title: 'Personliga uppgifter', icon: User },
    { id: 3, title: 'Företagsuppgifter', icon: Building2 },
];

function SignupPage() {
    const navigate = useNavigate();
    const { refreshProfile, signInWithGoogle } = useAuth();
    const [currentStep, setCurrentStep] = useState(1);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState<SignupFormData>({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        phoneNumber: '',
        companyName: '',
        orgNumber: '',
    });

    // Update form data
    const updateFormData = (field: keyof SignupFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
    };

    // Validate current step
    const validateStep = (): boolean => {
        switch (currentStep) {
            case 1:
                if (!formData.email) {
                    setError('E-postadress krävs.');
                    return false;
                }
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
                    setError('Ogiltig e-postadress.');
                    return false;
                }
                if (!formData.password) {
                    setError('Lösenord krävs.');
                    return false;
                }
                if (formData.password.length < 6) {
                    setError('Lösenordet måste vara minst 6 tecken.');
                    return false;
                }
                if (formData.password !== formData.confirmPassword) {
                    setError('Lösenorden matchar inte.');
                    return false;
                }
                return true;
            case 2:
                if (!formData.fullName.trim()) {
                    setError('Fullständigt namn krävs.');
                    return false;
                }
                return true;
            case 3:
                if (!formData.companyName.trim()) {
                    setError('Företagsnamn krävs.');
                    return false;
                }
                return true;
            default:
                return true;
        }
    };

    // Navigate to next step
    const nextStep = () => {
        if (validateStep()) {
            setCurrentStep(prev => Math.min(prev + 1, 3));
        }
    };

    // Navigate to previous step
    const prevStep = () => {
        setError(null);
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    // Handle final submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateStep()) return;

        setLoading(true);
        setError(null);

        try {
            // Step 1: Create the auth user with organization data in metadata
            // This metadata will be used to complete signup after email verification
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        // Store signup data in user metadata for later use
                        pending_org_name: formData.companyName,
                        pending_org_number: formData.orgNumber || null,
                        pending_full_name: formData.fullName,
                        pending_phone_number: formData.phoneNumber || null,
                    }
                }
            });

            if (authError) {
                console.error('[Signup] Auth error:', authError);
                throw new Error(getSwedishErrorMessage(authError.message));
            }

            console.log('[Signup] Auth response:', {
                user: authData.user?.id,
                session: authData.session ? 'present' : 'null',
                userEmail: authData.user?.email,
            });

            if (!authData.user) {
                throw new Error('Kunde inte skapa användarkonto.');
            }

            // Check if email verification is required
            if (!authData.session) {
                console.log('[Signup] No session - email verification required');
                // Email verification required - redirect to verification page
                // The RPC will be called when user verifies email and logs in
                // (handled by AuthContext when they click the confirmation link)
                navigate('/verify-email', { state: { email: formData.email } });
                return;
            }

            // Step 2: No email verification required - call RPC immediately
            console.log('[Signup] Session available, user ID:', authData.user.id);

            // Give AuthContext a moment to potentially complete the signup first
            // (it listens to onAuthStateChange and may have already done this)
            await new Promise(resolve => setTimeout(resolve, 500));

            // Check if profile already exists (AuthContext may have created it)
            const { data: existingProfile } = await supabase
                .from('user_profiles')
                .select('id')
                .eq('id', authData.user.id)
                .single();

            if (existingProfile) {
                console.log('[Signup] Profile already exists (created by AuthContext), redirecting...');
                await refreshProfile();
                navigate('/app');
                return;
            }

            console.log('[Signup] No existing profile, calling RPC...');
            const rpcParams = {
                org_name: formData.companyName.trim(),
                org_number: formData.orgNumber?.trim() || null,
                user_full_name: formData.fullName.trim(),
                user_phone_number: formData.phoneNumber?.trim() || null,
            };

            console.log('[Signup] Calling supabase.rpc with:', rpcParams);
            const { data: rpcData, error: rpcError } = await supabase.rpc('complete_organization_signup', rpcParams);
            console.log('[Signup] RPC response - data:', rpcData, 'error:', rpcError);

            if (rpcError) {
                // Check if error is "already has profile" - this means AuthContext did it
                if (rpcError.message?.includes('already has a profile')) {
                    console.log('[Signup] Profile was created by AuthContext, redirecting...');
                    await refreshProfile();
                    navigate('/app');
                    return;
                }

                // Auth succeeded but org creation failed - this is a partial failure
                console.error('Organization creation failed:', rpcError);
                throw new Error(
                    'Kontot skapades men företagsregistreringen misslyckades. ' +
                    'Vänligen kontakta support med din e-postadress: ' + formData.email
                );
            }

            // Step 3: Refresh the session to get a new JWT with the org_id metadata
            const { error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
                console.warn('Session refresh warning:', refreshError.message);
            }

            // Step 4: Refresh the auth context with the new profile
            await refreshProfile();

            // Success! Redirect to dashboard
            navigate('/app');

        } catch (err) {
            console.error('[Signup] Error:', err);
            setError(err instanceof Error ? err.message : 'Ett oväntat fel inträffade.');
        } finally {
            setLoading(false);
        }
    };

    // Handle Google signup
    const handleGoogleSignup = async () => {
        setGoogleLoading(true);
        setError(null);

        const { error } = await signInWithGoogle('/complete-signup');

        if (error) {
            setError(getSwedishErrorMessage(error.message));
            setGoogleLoading(false);
        }
        // Note: If successful, user will be redirected to Google, then back to /complete-signup
    };

    // Convert Supabase errors to Swedish
    const getSwedishErrorMessage = (error: string): string => {
        if (error.includes('User already registered')) {
            return 'En användare med denna e-postadress finns redan.';
        }
        if (error.includes('Password should be at least')) {
            return 'Lösenordet måste vara minst 6 tecken långt.';
        }
        if (error.includes('Unable to validate email address')) {
            return 'Ogiltig e-postadress.';
        }
        if (error.includes('Signup disabled')) {
            return 'Registrering är för närvarande inaktiverad.';
        }
        return 'Ett fel inträffade. Försök igen senare.';
    };

    // Render step content
    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-4 animate-fade-in" key="step1">
                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                E-postadress <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    value={formData.email}
                                    onChange={(e) => updateFormData('email', e.target.value)}
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    placeholder="din@email.se"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                Lösenord <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    value={formData.password}
                                    onChange={(e) => updateFormData('password', e.target.value)}
                                    className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    placeholder="Minst 6 tecken"
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                    ) : (
                                        <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                                Bekräfta lösenord <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    value={formData.confirmPassword}
                                    onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                                    className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    placeholder="Upprepa lösenord"
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                    ) : (
                                        <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-4 animate-fade-in" key="step2">
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
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-4 animate-fade-in" key="step3">
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
                    </div>
                );

            default:
                return null;
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
                    <h2 className="text-2xl font-semibold text-gray-900">Skapa företagskonto</h2>
                    <p className="mt-2 text-gray-600">
                        Kom igång med Momentum CRM för ditt företag
                    </p>
                </div>

                {/* Progress Steps */}
                        <div className="flex items-center justify-center">
                            {STEPS.map((step, index) => (
                                <React.Fragment key={step.id}>
                                    <div className="flex flex-col items-center">
                                        <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${currentStep > step.id
                                                ? 'bg-green-500 text-white'
                                                : currentStep === step.id
                                                    ? 'bg-blue-600 text-white shadow-lg ring-4 ring-blue-100'
                                                    : 'bg-gray-200 text-gray-500'
                                                }`}
                                        >
                                            {currentStep > step.id ? (
                                                <Check className="w-5 h-5" />
                                            ) : (
                                                <step.icon className="w-5 h-5" />
                                            )}
                                        </div>
                                        <span
                                            className={`mt-2 text-xs font-medium ${currentStep >= step.id ? 'text-gray-900' : 'text-gray-400'
                                                }`}
                                        >
                                            {step.title}
                                        </span>
                                    </div>
                                    {index < STEPS.length - 1 && (
                                        <div
                                            className={`w-16 h-1 mx-2 rounded-full transition-colors duration-300 ${currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                                                }`}
                                        />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>

                        {/* Form Card */}
                        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-gray-100">
                            <form onSubmit={currentStep === 3 ? handleSubmit : (e) => { e.preventDefault(); nextStep(); }}>
                                {/* Step Content */}
                                {renderStepContent()}

                                {/* Error Message */}
                                {error && (
                                    <div className="mt-4 flex items-start space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                                        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                        <span className="text-sm">{error}</span>
                                    </div>
                                )}

                                {/* Navigation Buttons */}
                                <div className="mt-6 flex gap-3">
                                    {currentStep > 1 && (
                                        <button
                                            type="button"
                                            onClick={prevStep}
                                            disabled={loading}
                                            className="flex-1 flex items-center justify-center py-3 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                                        >
                                            <ArrowLeft className="w-4 h-4 mr-2" />
                                            Tillbaka
                                        </button>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Skapar konto...
                                            </>
                                        ) : currentStep === 3 ? (
                                            <>
                                                <Check className="w-4 h-4 mr-2" />
                                                Slutför registrering
                                            </>
                                        ) : (
                                            <>
                                                Fortsätt
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>

                            {/* Login Link */}
                            <div className="mt-6 text-center">
                                <span className="text-sm text-gray-600">Har du redan ett konto? </span>
                                <Link
                                    to="/login"
                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                >
                                    Logga in här
                                </Link>
                            </div>

                            {/* Divider */}
                            <div className="mt-6 relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-white text-gray-500">Eller</span>
                                </div>
                            </div>

                            {/* Google Signup Button */}
                            <button
                                type="button"
                                onClick={handleGoogleSignup}
                                disabled={googleLoading || loading}
                                className="mt-4 w-full flex items-center justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {googleLoading ? (
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                ) : (
                                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                        <path
                                            fill="#4285F4"
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        />
                                        <path
                                            fill="#34A853"
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        />
                                        <path
                                            fill="#FBBC05"
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        />
                                        <path
                                            fill="#EA4335"
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        />
                                    </svg>
                                )}
                                Fortsätt med Google
                            </button>
                        </div>

                {/* Footer */}
                <div className="text-center text-sm text-gray-500">
                    <p>© 2026 Momentum CRM. Alla rättigheter förbehållna.</p>
                </div>
            </div>
        </div>
    );
}

export default SignupPage;
