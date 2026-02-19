import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { exchangeFortnoxCode } from '../lib/fortnox';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * FortnoxCallback — handles the OAuth redirect from Fortnox.
 *
 * Route: /app/fortnox/callback?code=xxx&state=orgId
 *
 * After exchanging the code for tokens it navigates the user
 * back to /app/installningar?tab=integrations.
 */
export default function FortnoxCallback() {
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        const handleOAuthCallback = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const authCode = urlParams.get('code');
            const state = urlParams.get('state'); // organisation_id

            if (!authCode || !state) {
                setStatus('error');
                setErrorMessage('Saknar auktoriseringskod eller state-parameter från Fortnox.');
                return;
            }

            try {
                // The redirect_uri sent to the token exchange must match the one
                // used when initiating the OAuth flow.
                const redirectUri = `${window.location.origin}/app/fortnox/callback`;

                const result = await exchangeFortnoxCode(state, authCode, redirectUri);

                if (result.success) {
                    setStatus('success');
                    // Short delay so the user sees the success state
                    setTimeout(() => {
                        navigate('/app/installningar?tab=integrations', { replace: true });
                    }, 1200);
                } else {
                    setStatus('error');
                    setErrorMessage(result.error || 'Kunde inte ansluta till Fortnox.');
                }
            } catch (err) {
                setStatus('error');
                setErrorMessage((err as Error).message || 'Ett oväntat fel inträffade.');
            }
        };

        handleOAuthCallback();
    }, [navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
                {status === 'loading' && (
                    <>
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Ansluter till Fortnox...</h2>
                        <p className="text-gray-500">Vänta medan vi slutför anslutningen.</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Fortnox ansluten!</h2>
                        <p className="text-gray-500">Du skickas tillbaka till inställningarna...</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Anslutningen misslyckades</h2>
                        <p className="text-red-600 mb-4">{errorMessage}</p>
                        <button
                            onClick={() => navigate('/app/installningar?tab=integrations', { replace: true })}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Tillbaka till inställningar
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
