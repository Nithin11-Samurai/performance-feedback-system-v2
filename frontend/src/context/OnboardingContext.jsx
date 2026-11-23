import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { useFeatureFlags } from './FeatureFlagsContext';
import * as onboardingService from '../services/onboardingService';

const OnboardingContext = createContext(null);

/**
 * Where the signed-in person is in the first-login setup.
 *
 * Which steps apply depends on Settings > Feature Visibility: Skills and
 * Certifications steps only appear if those sections are on for this person,
 * and the whole setup prompt can be switched off per audience ("First-login
 * setup"). If the status can't be loaded, nobody is blocked or nagged.
 */
export function OnboardingProvider({ children }) {
  const { user } = useAuth();
  const { isVisible, loaded: flagsLoaded } = useFeatureFlags();
  const [status, setStatus] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const next = await onboardingService.getStatus();
      setStatus(next);
      return next;
    } catch {
      setStatus(null);
      return null;
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      refresh();
    } else {
      setStatus(null);
      setLoaded(false);
    }
  }, [user?.id, refresh]);

  const value = useMemo(() => {
    const enabled = flagsLoaded && isVisible('onboarding');
    const steps = ['personal'];
    if (isVisible('skills')) steps.push('skills');
    if (isVisible('certifications')) steps.push('certifications');
    const done = status
      ? { personal: status.personalDone, skills: status.skillsDone, certifications: status.certificationsDone }
      : {};
    const pending = status ? steps.filter((s) => !done[s]) : [];
    return { status, loaded, enabled, steps, done, pending, complete: !status || pending.length === 0, refresh };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, loaded, flagsLoaded, isVisible, refresh]);

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within an OnboardingProvider');
  return ctx;
}
