import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Sparkles,
  Award,
  ClipboardList,
  ShieldCheck,
  Settings,
  X,
  Bell,
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
  ShieldAlert,
  Users2,
  Cog,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLES, ADMIN_TIER_ROLES } from '../utils/roles';
import logo from '../assets/logo-samurai.png';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: null },
  { to: '/skills', label: 'My Skills', icon: Sparkles, roles: ADMIN_TIER_ROLES },
  { to: '/certifications', label: 'Certifications', icon: Award, roles: ADMIN_TIER_ROLES },
  { to: '/reviews', label: 'Reviews', icon: ClipboardList, roles: ADMIN_TIER_ROLES },
  { to: '/peer-insights', label: '360° Feedback', icon: Users2, roles: null },
  { to: '/team', label: 'My Team', icon: Users, roles: [ROLES.MANAGER, ...ADMIN_TIER_ROLES] },
  { to: '/admin/employees', label: 'Employees', icon: ShieldCheck, roles: ADMIN_TIER_ROLES },
  { to: '/admin/cycles', label: 'Review Cycles', icon: Settings, roles: ADMIN_TIER_ROLES },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, roles: ADMIN_TIER_ROLES },
  { to: '/skills-certs-overview', label: 'Skills and Certifications', icon: Award, roles: [ROLES.MANAGER, ...ADMIN_TIER_ROLES] },
  { to: '/activity-log', label: 'Activity Log', icon: ShieldAlert, roles: ADMIN_TIER_ROLES },
  { to: '/notifications', label: 'Notifications', icon: Bell, roles: null },
  { to: '/permissions', label: 'Permissions', icon: ShieldCheck, roles: ADMIN_TIER_ROLES },
  { to: '/settings', label: 'Settings', icon: Cog, roles: ADMIN_TIER_ROLES },
];

function getStoredCollapsed() {
  return localStorage.getItem('sidebarCollapsed') === 'true';
}

/**
 * Renders as a static column on desktop (md+, collapsible to icon-only) and
 * as a slide-in drawer with a backdrop on mobile, controlled by
 * `mobileOpen`/`onClose`.
 */
export default function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(getStoredCollapsed);

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user?.role));

  function toggleCollapsed() {
    setCollapsed((prev) => {
      localStorage.setItem('sidebarCollapsed', String(!prev));
      return !prev;
    });
  }

  function navLinks(onItemClick, showLabels) {
    return visibleItems.map(({ to, label, icon: Icon }) => (
      <NavLink
        key={to}
        to={to}
        onClick={onItemClick}
        title={showLabels ? undefined : label}
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            !showLabels ? 'justify-center' : ''
          } ${
            isActive
              ? 'bg-primary-700 text-white'
              : 'text-ink-light/70 hover:bg-primary-50 dark:text-ink-dark/70 dark:hover:bg-primary-900/40'
          }`
        }
      >
        <Icon size={17} />
        {showLabels && label}
      </NavLink>
    ));
  }

  return (
    <>
      {/* Desktop: static column, collapsible */}
      <aside
        className={`hidden flex-shrink-0 flex-col border-r border-primary-100 bg-surface-light transition-all duration-200 dark:border-primary-900 dark:bg-surface-dark md:flex ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-primary-100 px-5 dark:border-primary-900">
          {!collapsed && <img src={logo} alt="PinkSamurais" className="h-8 w-auto object-contain" />}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">{navLinks(undefined, !collapsed)}</nav>

        <button
          onClick={toggleCollapsed}
          className="flex items-center justify-center gap-2 border-t border-primary-100 py-3 text-xs text-ink-light/50 hover:bg-primary-50 dark:border-primary-900 dark:text-ink-dark/50 dark:hover:bg-primary-900/40"
        >
          {collapsed ? (
            <ChevronsRight size={16} />
          ) : (
            <>
              <ChevronsLeft size={16} /> Collapse
            </>
          )}
        </button>
      </aside>

      {/* Mobile: backdrop + slide-in drawer (always full width with labels) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
          <aside className="relative flex h-full w-64 flex-col bg-surface-light shadow-card dark:bg-surface-dark">
            <div className="flex h-16 items-center justify-between gap-2 border-b border-primary-100 px-5 dark:border-primary-900">
              <img src={logo} alt="PinkSamurais" className="h-8 w-auto object-contain" />
              <button
                onClick={onClose}
                aria-label="Close menu"
                className="rounded-md p-1.5 text-ink-light/50 hover:bg-primary-50 dark:text-ink-dark/50 dark:hover:bg-primary-900/40"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">{navLinks(onClose, true)}</nav>
          </aside>
        </div>
      )}
    </>
  );
}
