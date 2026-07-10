import { useEffect, useState } from 'react';
import { ShieldCheck, Search } from 'lucide-react';
import { usePageTitle } from '../context/PageTitleContext';
import { useToast } from '../context/ToastContext';
import { roleLabel, ADMIN_TIER_ROLES } from '../utils/roles';
import * as permissionService from '../services/permissionService';
import EmployeePicker from '../components/EmployeePicker';
import Badge from '../components/Badge';
import Skeleton from '../components/Skeleton';

/**
 * Global Permissions page (Item 7). Admin searches for ANY employee and
 * grants/revokes access to specific sections (Analytics, 360 Feedback
 * management, etc) independent of their role default. This is the
 * "manage anyone from one place" view; the same overrides are also
 * visible/editable from that individual employee's own Permissions tab
 * on their Employee Detail page - both read and write the same data.
 */
export default function Permissions() {
  usePageTitle('Permissions');
  const { showToast } = useToast();
  const [selected, setSelected] = useState(null);
  const [sections, setSections] = useState(null);
  const [overrides, setOverrides] = useState(null);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    permissionService.listSections().then(setSections);
  }, []);

  async function loadOverrides(employee) {
    const list = await permissionService.listForUser(employee.id);
    setOverrides(list);
  }

  function handleSelect(employee) {
    setSelected(employee);
    setOverrides(null);
    loadOverrides(employee);
  }

  function overrideFor(sectionKey) {
    return overrides?.find((o) => o.section_key === sectionKey) || null;
  }

  async function handleToggle(sectionKey, allowed) {
    setSaving(sectionKey);
    try {
      await permissionService.setOverride(selected.id, sectionKey, allowed);
      showToast(`${allowed ? 'Granted' : 'Blocked'} for ${selected.first_name}`);
      loadOverrides(selected);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update permission.', 'error');
    } finally {
      setSaving(null);
    }
  }

  async function handleClear(sectionKey) {
    setSaving(sectionKey);
    try {
      await permissionService.removeOverride(selected.id, sectionKey);
      showToast('Reverted to role default');
      loadOverrides(selected);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to clear override.', 'error');
    } finally {
      setSaving(null);
    }
  }

  const isAdminTierEmployee = selected && ADMIN_TIER_ROLES.includes(selected.role);

  return (
    <div className="space-y-4">
      <div className="card card-reviews flex items-start gap-3">
        <ShieldCheck size={18} className="mt-0.5 flex-shrink-0 text-primary-600" />
        <p className="text-sm text-ink-light/60 dark:text-ink-dark/60">
          Search for any employee and grant or revoke access to a specific section — useful right now for
          rolling out 360° Feedback to select people before opening it up more broadly. These same overrides
          are also visible from that employee's own Permissions tab.
        </p>
      </div>

      <div className="card card-reviews">
        <label className="label">Search employee</label>
        <div className="relative max-w-md">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-light/40" />
          <EmployeePicker onSelect={handleSelect} placeholder="Search by name or employee ID…" />
        </div>
        {selected && (
          <p className="mt-2 text-sm text-primary-700 dark:text-primary-300">
            {selected.first_name} {selected.last_name} — {roleLabel(selected.role)}
          </p>
        )}
      </div>

      {selected && (
        <div className="card card-reviews">
          <h4 className="mb-1 font-display text-sm font-semibold">
            Section access for {selected.first_name} {selected.last_name}
          </h4>
          <p className="mb-4 text-xs text-ink-light/50 dark:text-ink-dark/50">
            {isAdminTierEmployee
              ? `${selected.first_name} already has full access as ${roleLabel(selected.role)} — overrides below would only matter if their role changes later.`
              : `Grant access to specific sections beyond what their role (${roleLabel(selected.role)}) normally allows.`}
          </p>

          {sections === null || overrides === null ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <ul className="divide-y divide-primary-50 dark:divide-primary-900/50">
              {sections.map((s) => {
                const override = overrideFor(s.key);
                const isBusy = saving === s.key;
                return (
                  <li key={s.key} className="flex items-center justify-between py-3">
                    <span className="text-sm">{s.label}</span>
                    <div className="flex items-center gap-2">
                      {override ? (
                        <>
                          <Badge tone={override.allowed ? 'success' : 'danger'}>{override.allowed ? 'Granted' : 'Blocked'}</Badge>
                          <button disabled={isBusy} onClick={() => handleClear(s.key)} className="text-xs text-ink-light/40 hover:underline dark:text-ink-dark/40">
                            Reset to default
                          </button>
                        </>
                      ) : (
                        <button
                          disabled={isBusy || isAdminTierEmployee}
                          onClick={() => handleToggle(s.key, true)}
                          className="btn-secondary text-xs disabled:opacity-40"
                        >
                          Grant access
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
