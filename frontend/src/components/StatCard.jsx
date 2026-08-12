const ICON_STYLES = {
  primary: 'bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300',
  notes: 'bg-amber-50 text-amber-500 dark:bg-amber-900/30 dark:text-amber-300',
  certs: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
  rating: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300',
  skills: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
  reviews: 'bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300',
};

/**
 * Deliberately restrained per design brief: white card, hairline border,
 * subtle shadow, a small colored icon chip (color varies by variant so
 * different KPIs read as visually distinct at a glance), a large number,
 * a plain label underneath. Same props as before so every existing
 * caller (Admin/Manager/Employee dashboards) needs zero changes.
 */
export default function StatCard({ icon: Icon, label, value, sublabel, variant = 'primary', loading = false }) {
  const iconStyle = ICON_STYLES[variant] || ICON_STYLES.primary;

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-primary-900/50 dark:bg-surface-dark">
        <div className="flex items-center gap-4">
          <div className="skeleton h-11 w-11 flex-shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-7 w-16" />
            <div className="skeleton h-3 w-24" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md dark:border-primary-900/50 dark:bg-surface-dark">
      <div className="flex items-center gap-4">
        {Icon && (
          <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${iconStyle}`}>
            <Icon size={20} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="break-words font-mono text-2xl font-semibold leading-tight text-gray-900 dark:text-ink-dark">
            {value}
          </p>
          <p className="text-sm text-gray-500 dark:text-ink-dark/60">{label}</p>
          {sublabel && <p className="text-xs text-gray-400 dark:text-ink-dark/40">{sublabel}</p>}
        </div>
      </div>
    </div>
  );
}
