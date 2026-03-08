import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { GlobalActionProvider } from './contexts/GlobalActionContext';
import ProtectedRoute from './components/ProtectedRoute';
import OfflineIndicator from './components/OfflineIndicator';
import RealtimeManager from './components/RealtimeManager';
import QuoteAcceptance from './pages/QuoteAcceptance';
import PublicLeadForm from './components/PublicLeadForm';
import AppRoutes from './components/AppRoutes';
import LoginPage from './pages/LoginPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Public Website
import PublicLayout from './layouts/public/PublicLayout';
import LandingPage from './pages/public/LandingPage';
import FeaturesPage from './pages/public/FeaturesPage';
import PricingPage from './pages/public/PricingPage';
import AboutPage from './pages/public/AboutPage';
import ContactPage from './pages/public/ContactPage';
import CaseStudiesPage from './pages/public/CaseStudiesPage';
import Integritetspolicy from './pages/public/Integritetspolicy';
import Anvandarvillkor from './pages/public/Anvandarvillkor';
import SignupPage from './pages/public/SignupPage';
import CompleteSignupPage from './pages/public/CompleteSignupPage';
import VerifyEmailPage from './pages/public/VerifyEmailPage';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <OfflineIndicator />
        <Router>
          <GlobalActionProvider>
            {/* Real-time subscriptions for collaborative updates */}
            <RealtimeManager />

            <Routes>
              {/* ===========================
                  PUBLIC WEBSITE ROUTES
                  =========================== */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/funktioner" element={<FeaturesPage />} />
                <Route path="/pris" element={<PricingPage />} />
                <Route path="/om-oss" element={<AboutPage />} />
                <Route path="/kontakt" element={<ContactPage />} />
                <Route path="/kundcase" element={<CaseStudiesPage />} />
                <Route path="/integritetspolicy" element={<Integritetspolicy />} />
                <Route path="/anvandarvillkor" element={<Anvandarvillkor />} />
              </Route>

              {/* ===========================
                  AUTH ROUTES (Public)
                  =========================== */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<SignupPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/complete-signup" element={<CompleteSignupPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* Public standalone routes */}
              <Route path="/quote-accept/:token" element={<QuoteAcceptance />} />
              <Route path="/forms/:formId" element={<PublicLeadForm />} />

              {/* ===========================
                  PROTECTED APP ROUTES
                  =========================== */}
              <Route
                path="/app/*"
                element={
                  <ProtectedRoute>
                    <AppRoutes />
                  </ProtectedRoute>
                }
              />

              {/* Legacy routes for existing bookmarks */}
              <Route
                path="/dashboard/*"
                element={
                  <ProtectedRoute>
                    <AppRoutes />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </GlobalActionProvider>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;