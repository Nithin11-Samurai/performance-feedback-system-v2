import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import * as featureFlagService from '../services/featureFlagService';
import { useToast } from '../context/ToastContext';
import { useFeatureFlags } from '../context/FeatureFlagsContext';

// Company-wide views: the Employees toggle can't open these (an employee
// only gets one through a per-person grant on the Permissions page).
const MANAGEMENT_ONLY_KEYS = ['skills_certs_overview'];

/**
 * Settings > Feature Visibility. One row per feature, one toggle per
 * audience: Admin-tier roles, Managers, and Employees. Per-person
 * exceptions (grant or block one employee) live on the Permissions page and
 * override these toggles.
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
        visibleToManagers: next.visible_to_managers,
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

  function ToggleCell({ flag, field, label, disabled = false, disabledHint }) {
    const on = !!flag[field];
    if (disabled) {
      return (
        <span
          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-ink-light/30 dark:text-ink-dark/30"
          title={disabledHint}
        >
          <EyeOff size={13} />
          n/a
        </span>
      );
    }
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
        Turn each section on or off for three audiences: Admin-tier roles (Admin, Global Admin, System Admin, HR
        Manager), Managers, and Employees. To give one person an exception, or take a section away from one person,
        use the Permissions page; that overrides these toggles.
      </p>

      {flags === null ? (
        <div className="skeleton h-40 w-full" />
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-1 text-xs font-medium text-ink-light/50 dark:text-ink-dark/50">
            <span>Feature</span>
            <span className="w-[88px]">Admin-tier</span>
            <span className="w-[88px]">Managers</span>
            <span className="w-[88px]">Employees</span>
          </div>
          {flags.map((flag) => (
            <div
              key={flag.key}
              className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-lg border border-primary-50 px-3 py-2.5 dark:border-primary-900/50"
            >
              <span className="text-sm font-medium">{flag.label}</span>
              <div className="w-[88px]">
                <ToggleCell flag={flag} field="visible_to_admin_tier" label="Self" />
              </div>
              <div className="w-[88px]">
                <ToggleCell flag={flag} field="visible_to_managers" label="Managers" />
              </div>
              <div className="w-[88px]">
                <ToggleCell
                  flag={flag}
                  field="visible_to_employees"
                  label="Employees"
                  disabled={MANAGEMENT_ONLY_KEYS.includes(flag.key)}
                  disabledHint="This is a company-wide view, so employees can't open it. Grant it to one person on the Permissions page if needed."
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
