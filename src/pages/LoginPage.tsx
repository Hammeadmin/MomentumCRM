import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TrendingUp, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, CheckCircle, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const { signIn, signInWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[Login] Starting login for:', email);
    setLoading(true);
    setError(null);

    try {
      console.log('[Login] Calling signIn...');
      const { error } = await signIn(email, password);
      console.log('[Login] signIn returned, error:', error?.message);
      if (error) {
        setError(getSwedishErrorMessage(error.message));
      } else {
        // Successful login - redirect to app
        console.log('[Login] Success, navigating to /app');
        navigate('/app');
      }
    } catch (err) {
      console.error('[Login] Exception:', err);
      setError('Ett oväntat fel inträffade. Försök igen.');
    } finally {
      console.log('[Login] Finally block, setting loading to false');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);

    const { error } = await signInWithGoogle('/app');

    if (error) {
      setError(getSwedishErrorMessage(error.message));
      setGoogleLoading(false);
    }
    // If successful, user will be redirected to Google
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError(null);

    try {
      const { error } = await resetPassword(resetEmail);
      if (error) {
        setResetError(getSwedishErrorMessage(error.message));
      } else {
        setResetSuccess(true);
      }
    } catch (err) {
      setResetError('Ett oväntat fel inträffade. Försök igen.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleCloseForgotPasswordModal = () => {
    setShowForgotPassword(false);
    setResetEmail('');
    setResetSuccess(false);
    setResetError(null);
  };

  const getSwedishErrorMessage = (error: string): string => {
    if (error.includes('Invalid login credentials')) {
      return 'Felaktiga inloggningsuppgifter. Kontrollera e-post och lösenord.';
    }
    if (error.includes('Email not confirmed')) {
      return 'E-postadressen är inte verifierad. Kontrollera din inkorg.';
    }
    if (error.includes('Password should be at least')) {
      return 'Lösenordet måste vara minst 6 tecken långt.';
    }
    if (error.includes('Unable to validate email address')) {
      return 'Ogiltig e-postadress. Kontrollera formatet.';
    }
    if (error.includes('User already registered')) {
      return 'En användare med denna e-postadress finns redan.';
    }
    return 'Ett fel inträffade. Försök igen senare.';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Header */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Momentum</h1>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">Logga in</h2>
          <p className="mt-2 text-gray-600">
            Välkommen tillbaka till ditt CRM-system
          </p>
        </div>

        {/* Form */}
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                E-postadress
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="din@email.se"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Lösenord
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Ditt lösenord"
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

            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Glömt lösenordet?
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <div className="flex items-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loggar in...
                </div>
              ) : (
                'Logga in'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">Eller</span>
            </div>
          </div>

          {/* Google Login Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
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

          {/* Register Link */}
          <div className="mt-6 text-center">
            <span className="text-sm text-gray-600">Har du inget konto? </span>
            <Link
              to="/register"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Registrera dig här
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>© 2026 Momentum CRM. Alla rättigheter förbehållna.</p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Återställ lösenord</h3>
              <button
                onClick={handleCloseForgotPasswordModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetSuccess ? (
              <div className="text-center py-4">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  E-post skickad!
                </h4>
                <p className="text-gray-600 mb-6">
                  Vi har skickat instruktioner för att återställa ditt lösenord till <strong>{resetEmail}</strong>.
                  Kontrollera din inkorg och följ länken i e-postmeddelandet.
                </p>
                <button
                  onClick={handleCloseForgotPasswordModal}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all"
                >
                  Stäng
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword}>
                <p className="text-gray-600 mb-4">
                  Ange din e-postadress så skickar vi instruktioner för att återställa ditt lösenord.
                </p>

                <div className="mb-4">
                  <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-2">
                    E-postadress
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="reset-email"
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="din@email.se"
                    />
                  </div>
                </div>

                {resetError && (
                  <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg mb-4">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm">{resetError}</span>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleCloseForgotPasswordModal}
                    className="flex-1 py-3 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Avbryt
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {resetLoading ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Skickar...
                      </div>
                    ) : (
                      'Skicka'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginPage;