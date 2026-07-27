import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import * as featureFlagService from '../services/featureFlagService';
import { useToast } from '../context/ToastContext';
import { useFeatureFlags } from '../context/FeatureFlagsContext';

/**
 * Drop this into Settings.jsx as its own section:
 *
 *   import FeatureVisibilitySettings from '../components/FeatureVisibilitySettings';
 *   ...
 *   <FeatureVisibilitySettings />
 *
 * Replaces the hardcoded Admin-tier-only restriction on My Skills,
 * Certifications, Reviews, Review Cycles, Analytics, and Skills &
 * Certifications Overview with an admin-configurable toggle per feature,
 * per audience.
 */
export default function FeatureVisibilitySettings() {
  const { showToast } = useToast();
  const { refresh: refreshGlobalFlags } = useFeatureFlags();
  const [flags, setFlags] = useState(null);
  const [savingKey, setSavingKey] = useState(null);

  useEffect(() => {
    featureFlagService.listFeatureFlags().then(setFlags);
  }, []);

  async function toggle(flag, field) {
    const next = { ...flag, [field]: !flag[field] };
    setSavingKey(flag.key);
    try {
      const updated = await featureFlagService.updateFeatureFlag(flag.key, {
        visibleToAdminTier: next.visible_to_admin_tier,
        visibleToEmployees: next.visible_to_employees,
      });
      setFlags((prev) => prev.map((f) => (f.key === updated.key ? updated : f)));
      await refreshGlobalFlags();
      showToast(`${updated.label} updated`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update visibility.', 'error');
    } finally {
      setSavingKey(null);
    }
  }

  function ToggleCell({ flag, field, label }) {
    const on = flag[field];
    return (
      <button
        onClick={() => toggle(flag, field)}
        disabled={savingKey === flag.key}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
          on
            ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/60 dark:text-primary-100'
            : 'bg-primary-50/50 text-ink-light/50 dark:bg-primary-900/20 dark:text-ink-dark/50'
        }`}
        title={`${on ? 'Visible' : 'Hidden'} — click to toggle`}
      >
        {on ? <Eye size={13} /> : <EyeOff size={13} />}
        {label}
      </button>
    );
  }

  return (
    <div className="card card-reviews">
      <h3 className="mb-1 font-display text-base font-semibold">Feature Visibility</h3>
      <p className="mb-4 text-sm text-ink-light/55 dark:text-ink-dark/55">
        Turn these sections on or off for two audiences at once: Admin-tier roles (Admin, Global Admin, System
        Admin, HR Manager) viewing them for themselves, and everyone else (Employee, Manager).
      </p>

      {flags === null ? (
        <div className="skeleton h-40 w-full" />
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-1 text-xs font-medium text-ink-light/50 dark:text-ink-dark/50">
            <span>Feature</span>
            <span>Admin-tier</span>
            <span>Employees</span>
          </div>
          {flags.map((flag) => (
            <div
              key={flag.key}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg border border-primary-50 px-3 py-2.5 dark:border-primary-900/50"
            >
              <span className="text-sm font-medium">{flag.label}</span>
              <ToggleCell flag={flag} field="visible_to_admin_tier" label="Self" />
              <ToggleCell flag={flag} field="visible_to_employees" label="Employees" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
