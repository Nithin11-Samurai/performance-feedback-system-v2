import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Wraps a set of nested <Route> elements. Redirects to /login if not
 * authenticated. If `allowedRoles` is given, users whose role isn't in the
 * list are redirected to /dashboard instead of seeing a 403 page — since
 * for most of this app, "you don't have this role" just means "this isn't
 * a page for you," not an error state.
 */
export default function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // The branded LoadingOverlay (shown via AuthBootstrapLoader in App.jsx)
  // already covers this exact moment — first load / hard refresh while we
  // check auth — so this component renders nothing rather than a second,
  // competing spinner.
  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
