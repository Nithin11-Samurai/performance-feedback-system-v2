import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { listFeatureFlags } from '../services/featureFlagService';
import { ADMIN_TIER_ROLES } from '../utils/roles';
import { useAuth } from './AuthContext';

const FeatureFlagsContext = createContext(null);

export function FeatureFlagsProvider({ children }) {
  const { user } = useAuth();
  const [flags, setFlags] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const list = await listFeatureFlags();
      const byKey = {};
      list.forEach((f) => {
        byKey[f.key] = f;
      });
      setFlags(byKey);
    } catch {
      // Fail open: if flags can't be loaded (network blip, not yet
      // migrated, etc.), don't silently hide features that used to be
      // visible — just proceed as if no flags exist, and isVisible()
      // below defaults to "true" when it has no data to check against.
      setFlags({});
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  function isVisible(key) {
    // No data yet, or this key was never migrated in — default to
    // visible rather than hiding something unexpectedly.
    if (!flags || !flags[key]) return true;

    const flag = flags[key];
    const isAdminTier = user && ADMIN_TIER_ROLES.includes(user.role);
    return isAdminTier ? flag.visible_to_admin_tier : flag.visible_to_employees;
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
