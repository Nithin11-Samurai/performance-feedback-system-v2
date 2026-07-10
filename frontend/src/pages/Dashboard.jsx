import { usePageTitle } from '../context/PageTitleContext';
import { useAuth } from '../context/AuthContext';
import { ROLES, isAdminTier } from '../utils/roles';
import AdminDashboardView from '../components/AdminDashboardView';
import ManagerDashboardView from '../components/ManagerDashboardView';
import EmployeeDashboardView from '../components/EmployeeDashboardView';

/**
 * Thin role dispatcher. Each role's dashboard is now a self-contained,
 * self-fetching component (AdminDashboardView / ManagerDashboardView /
 * EmployeeDashboardView) — this page just picks the right one.
 */
export default function Dashboard() {
  usePageTitle('Dashboard');
  const { user } = useAuth();

  if (isAdminTier(user.role)) return <AdminDashboardView />;
  if (user.role === ROLES.MANAGER) return <ManagerDashboardView />;
  return <EmployeeDashboardView />;
}
