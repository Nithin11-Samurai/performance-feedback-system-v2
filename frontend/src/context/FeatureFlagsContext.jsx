import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { listFeatureFlags } from '../services/featureFlagService';
import { listMyOverrides } from '../services/permissionService';
import { ADMIN_TIER_ROLES, ROLES } from '../utils/roles';
import { useAuth } from './AuthContext';

const FeatureFlagsContext = createContext(null);

// Company-wide views that the "Employees" toggle can never open: an
// employee only gets one through a per-person grant on the Permissions
// page. Mirrors backend/src/services/featureAccessService.js.
const MANAGEMENT_ONLY_KEYS = ['skills_certs_overview'];

export function FeatureFlagsProvider({ children }) {
  const { user } = useAuth();
  const [flags, setFlags] = useState(null);
  const [overrides, setOverrides] = useState({});
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    // Fail open on both: if either can't be loaded (network blip, not yet
    // migrated, etc.), don't silently hide features that used to be
    // visible. The API still enforces access on its own.
    const [flagList, myOverrides] = await Promise.all([
      listFeatureFlags().catch(() => null),
      listMyOverrides().catch(() => ({})),
    ]);
    if (flagList) {
      const byKey = {};
      flagList.forEach((f) => {
        byKey[f.key] = f;
      });
      setFlags(byKey);
    } else {
      setFlags({});
    }
    setOverrides(myOverrides);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  // Same rules as the API: a per-person override (granted or blocked) wins;
  // otherwise the Settings toggle for the person's audience decides.
  function isVisible(key) {
    if (Object.prototype.hasOwnProperty.call(overrides, key)) return overrides[key];

    const isAdminTier = !!user && ADMIN_TIER_ROLES.includes(user.role);
    const isManager = !!user && user.role === ROLES.MANAGER;

    if (!isAdminTier && !isManager && MANAGEMENT_ONLY_KEYS.includes(key)) return false;

    // No data yet, or this key was never migrated in: default to visible
    // rather than hiding something unexpectedly.
    if (!flags || !flags[key]) return true;

    const flag = flags[key];
    if (isAdminTier) return flag.visible_to_admin_tier;
    if (isManager) return flag.visible_to_managers ?? flag.visible_to_employees;
    return flag.visible_to_employees;
  }

  return (
    <FeatureFlagsContext.Provider value={{ isVisible, loaded, refresh }}>{children}</FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags() {
  const ctx = useContext(FeatureFlagsContext);
  if (!ctx) throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider');
  return ctx;
}
