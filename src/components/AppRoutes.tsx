// src/components/AppRoutes.tsx
import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { UserRole } from '../types/database';
import LoadingSpinner from './LoadingSpinner';
import { RouteErrorBoundary } from './ErrorBoundary';

// Import main Layout (always needed)
import Layout from './Layout';

// Lazy-load role-specific layouts to prevent crash if files missing
const WorkerLayout = React.lazy(() => import('./WorkerLayout'));
const SalesLayout = React.lazy(() => import('./SalesLayout'));

// Lazy-loaded heavy pages for code splitting
const Dashboard = React.lazy(() => import('../pages/Dashboard'));
const Invoices = React.lazy(() => import('../pages/Invoices'));
const Settings = React.lazy(() => import('../pages/Settings'));
const Documents = React.lazy(() => import('../pages/Documents'));
const Reports = React.lazy(() => import('../pages/Reports'));

// Lazy-load worker/sales pages to prevent crash if missing
const WorkerDashboard = React.lazy(() => import('../pages/WorkerDashboard'));
const SalesDashboard = React.lazy(() => import('../pages/SalesDashboard'));
const WorkerSchedule = React.lazy(() => import('../pages/WorkerSchedule'));
const WorkerTimesheet = React.lazy(() => import('../pages/WorkerTimesheet'));
const WorkerProfile = React.lazy(() => import('../pages/WorkerProfile'));

// Detail pages
const OrderDetailPage = React.lazy(() => import('../pages/OrderDetailPage'));
const QuoteDetailPage = React.lazy(() => import('../pages/QuoteDetailPage'));
const FortnoxCallback = React.lazy(() => import('./FortnoxCallback'));

// Regular imports for core pages
import Customers from '../pages/Customers';
import Quotes from '../pages/Quotes';
import Orders from '../pages/Orders';
import Calendar from '../pages/Calendar';
import Team from '../pages/Team';
import Analytics from '../pages/Analytics';
import Communications from '../pages/Communications';
import Payroll from '../pages/Payroll';
import Intranet from '../pages/Intranet';
import Leads from '../pages/Leads';
import Ordrar from '../pages/Ordrar';
import Payments from '../pages/Payments';

export default function AppRoutes() {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    };

    const fetchUserRole = async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error("Error fetching user role:", error);
      } else {
        setRole(data.role as UserRole);
      }
      setLoading(false);
    };

    fetchUserRole();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  // Worker Routes
  if (role === 'worker') {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <WorkerLayout>
          <Routes>
            <Route path="/worker-dashboard" element={<WorkerDashboard />} />
            <Route path="/worker-schedule" element={<WorkerSchedule />} />
            <Route path="/worker-timesheet" element={<WorkerTimesheet />} />
            <Route path="/worker-profile" element={<WorkerProfile />} />
            <Route path="*" element={<Navigate to="/worker-dashboard" replace />} />
          </Routes>
        </WorkerLayout>
      </Suspense>
    );
  }

  // Sales Routes
  if (role === 'sales') {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <SalesLayout>
          <Routes>
            <Route path="/sales-dashboard" element={<SalesDashboard />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/Säljtunnel" element={<Orders />} />
            <Route path="/kommunikation" element={<Communications />} />
            <Route path="/kunder" element={<Customers />} />
            <Route path="/offerter" element={<Quotes />} />
            <Route path="/Orderhantering" element={<Ordrar />} />
            <Route path="/kalender" element={<Calendar />} />
            <Route path="/order/:id" element={<OrderDetailPage />} />
            <Route path="/offert/:id" element={<QuoteDetailPage />} />
            <Route path="*" element={<Navigate to="/sales-dashboard" replace />} />
          </Routes>
        </SalesLayout>
      </Suspense>
    );
  }

  // Admin and other roles (default)
  return (
    <Layout>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<RouteErrorBoundary><Dashboard /></RouteErrorBoundary>} />
          <Route path="/Säljtunnel" element={<RouteErrorBoundary><Orders /></RouteErrorBoundary>} />
          <Route path="/Orderhantering" element={<RouteErrorBoundary><Ordrar /></RouteErrorBoundary>} />
          <Route path="/kunder" element={<RouteErrorBoundary><Customers /></RouteErrorBoundary>} />
          <Route path="/leads" element={<RouteErrorBoundary><Leads /></RouteErrorBoundary>} />
          <Route path="/offerter" element={<RouteErrorBoundary><Quotes /></RouteErrorBoundary>} />
          <Route path="/kalender" element={<RouteErrorBoundary><Calendar /></RouteErrorBoundary>} />
          <Route path="/fakturor" element={<RouteErrorBoundary><Invoices /></RouteErrorBoundary>} />
          <Route path="/betalningar" element={<RouteErrorBoundary><Payments /></RouteErrorBoundary>} />
          <Route path="/team" element={<RouteErrorBoundary><Team /></RouteErrorBoundary>} />
          <Route path="/installningar" element={<RouteErrorBoundary><Settings /></RouteErrorBoundary>} />
          <Route path="/analys" element={<RouteErrorBoundary><Analytics /></RouteErrorBoundary>} />
          <Route path="/kommunikation" element={<RouteErrorBoundary><Communications /></RouteErrorBoundary>} />
          <Route path="/lonehantering" element={<RouteErrorBoundary><Payroll /></RouteErrorBoundary>} />
          <Route path="/dokument" element={<RouteErrorBoundary><Documents /></RouteErrorBoundary>} />
          <Route path="/rapporter" element={<RouteErrorBoundary><Reports /></RouteErrorBoundary>} />
          <Route path="/intranat" element={<RouteErrorBoundary><Intranet /></RouteErrorBoundary>} />

          {/* Detail Pages */}
          <Route path="/order/:id" element={<RouteErrorBoundary><OrderDetailPage /></RouteErrorBoundary>} />
          <Route path="/offert/:id" element={<RouteErrorBoundary><QuoteDetailPage /></RouteErrorBoundary>} />

          {/* OAuth Callbacks */}
          <Route path="/fortnox/callback" element={<RouteErrorBoundary><FortnoxCallback /></RouteErrorBoundary>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}