import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { TrendingUp, Mail, CheckCircle, AlertTriangle, ArrowRight, Inbox } from 'lucide-react';

function VerifyEmailPage() {
  const location = useLocation();
  const email = location.state?.email || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mr-4 shadow-lg">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Momentum</h1>
          </div>
        </div>

        <div className="bg-white py-10 px-8 shadow-xl rounded-2xl border border-gray-100">
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-10 h-10 text-blue-600" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Bekräfta din e-postadress
            </h2>

            <p className="text-gray-600 mb-6">
              Vi har skickat ett bekräftelsemail till{' '}
              {email ? (
                <strong className="text-gray-900">{email}</strong>
              ) : (
                'din e-postadress'
              )}
              . Klicka på länken i mailet för att aktivera ditt konto.
            </p>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-5 mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-3 text-left">
                  <h3 className="text-sm font-semibold text-blue-900">Vad händer nu?</h3>
                  <ul className="mt-2 text-sm text-blue-700 space-y-1">
                    <li className="flex items-center">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                      Öppna din e-post
                    </li>
                    <li className="flex items-center">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                      Hitta mailet från Momentum
                    </li>
                    <li className="flex items-center">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                      Klicka på bekräftelselänken
                    </li>
                    <li className="flex items-center">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                      Du blir automatiskt inloggad
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-8">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div className="ml-3 text-left">
                  <h3 className="text-sm font-semibold text-amber-900">Hittar du inte mailet?</h3>
                  <p className="mt-1 text-sm text-amber-700">
                    <strong>Kontrollera din skräppost/junk-mapp!</strong> Ibland hamnar
                    bekräftelsemailet där. Om du fortfarande inte hittar det efter
                    några minuter, prova att registrera dig igen.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center text-sm text-gray-500 mb-6">
              <Inbox className="w-4 h-4 mr-2" />
              <span>Mailet kan ta upp till 5 minuter att anlända</span>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <p className="text-sm text-gray-600 mb-4">
                Har du redan bekräftat din e-post?
              </p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
              >
                Gå till inloggning
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>
        </div>

        <div className="text-center space-y-2">
          <p className="text-sm text-gray-500">
            Behöver du hjälp?{' '}
            <Link to="/kontakt" className="text-blue-600 hover:text-blue-700 font-medium">
              Kontakta support
            </Link>
          </p>
          <p className="text-sm text-gray-400">
            &copy; 2026 Momentum CRM. Alla rättigheter förbehållna.
          </p>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmailPage;
