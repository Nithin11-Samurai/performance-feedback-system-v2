import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { PageTitleProvider } from './context/PageTitleContext';
import { ToastProvider } from './context/ToastContext';
import { LoadingProvider, useLoading } from './context/LoadingContext';
import { useRouteChangeLoader } from './hooks/useRouteChangeLoader';
import LoadingOverlay from './components/LoadingOverlay';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Skills from './pages/Skills';
import Certifications from './pages/Certifications';
import Reviews from './pages/Reviews';
import Team from './pages/Team';
import AdminEmployees from './pages/AdminEmployees';
import AdminCycles from './pages/AdminCycles';
import Analytics from './pages/Analytics';
import NotificationsCenter from './pages/NotificationsCenter';
import ActivityLog from './pages/ActivityLog';
import PeerInsights from './pages/PeerInsights';
import Settings from './pages/Settings';
import Permissions from './pages/Permissions';
import SkillsCertsOverview from './pages/SkillsCertsOverview';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';
import { ROLES, ADMIN_TIER_ROLES } from './utils/roles';

/**
 * Bridges AuthContext's `loading` (true while the initial "am I logged
 * in?" check is in flight — covers first load and hard refresh) into the
 * global branded loader, so that case uses the same premium animation
 * instead of a separate inline spinner.
 */
function AuthBootstrapLoader() {
  const { loading } = useAuth();
  const { showLoader, hideLoader } = useLoading();
  const hasShown = useRef(false);

  useEffect(() => {
    if (loading && !hasShown.current) {
      hasShown.current = true;
      showLoader();
    } else if (!loading && hasShown.current) {
      hasShown.current = false;
      hideLoader();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  return null;
}

/**
 * Lives inside BrowserRouter (needs useLocation for route-change
 * detection) and inside every provider the loader/auth bridges need.
 */
function AppShell() {
  useRouteChangeLoader();

  return (
    <>
      <LoadingOverlay />
      <AuthBootstrapLoader />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Everyone authenticated */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/notifications" element={<NotificationsCenter />} />
            <Route path="/peer-insights" element={<PeerInsights />} />
            <Route path="/profile" element={<Profile />} />

            {/* Manager + Admin only */}
            <Route element={<ProtectedRoute allowedRoles={[ROLES.MANAGER, ...ADMIN_TIER_ROLES]} />}>
              <Route path="/team" element={<Team />} />
              <Route path="/skills-certs-overview" element={<SkillsCertsOverview />} />
            </Route>

            {/* Admin only */}
            <Route element={<ProtectedRoute allowedRoles={ADMIN_TIER_ROLES} />}>
              {/* Temporarily restricted to Admin-tier while Skills, Certifications,
                  and Reviews get reworked — hidden from Employee/Manager for now.
                  To revert: move these 3 lines back up above this block, and change
                  their three matching Sidebar.jsx entries back to `roles: null`. */}
              <Route path="/skills" element={<Skills />} />
              <Route path="/certifications" element={<Certifications />} />
              <Route path="/reviews" element={<Reviews />} />

              <Route path="/notes" element={<Navigate to="/admin/employees" replace />} />
              <Route path="/admin/employees" element={<AdminEmployees />} />
              <Route path="/admin/cycles" element={<AdminCycles />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/activity-log" element={<ActivityLog />} />
              <Route path="/permissions" element={<Permissions />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <LoadingProvider>
          <AuthProvider>
            <PageTitleProvider>
              <BrowserRouter>
                <AppShell />
              </BrowserRouter>
            </PageTitleProvider>
          </AuthProvider>
        </LoadingProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
