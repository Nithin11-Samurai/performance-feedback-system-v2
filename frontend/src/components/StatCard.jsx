const VARIANT_CLASS = {
  primary: 'card-reviews',
  skills: 'card-skills',
  certs: 'card-certs',
  notes: 'card-notes',
};

/**
 * Backward compatible: existing callers passing {icon, label, value, sublabel,
 * variant} see no behavior change. New optional `loading` prop renders a
 * skeleton placeholder instead (used by the redesigned admin dashboard while
 * KPI data is being fetched).
 */
export default function StatCard({ icon: Icon, label, value, sublabel, variant = 'primary', loading = false }) {
  if (loading) {
    return (
      <div className={`card ${VARIANT_CLASS[variant] || VARIANT_CLASS.primary} flex items-center gap-4`}>
        <div className="skeleton h-11 w-11 flex-shrink-0 rounded-md" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-6 w-16" />
          <div className="skeleton h-3 w-24" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`card ${VARIANT_CLASS[variant] || VARIANT_CLASS.primary} flex items-center gap-4 transition-transform duration-200 hover:-translate-y-0.5`}
    >
      {Icon && (
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-700 dark:bg-primary-900/50 dark:text-primary-200">
          <Icon size={20} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="break-words font-mono text-xl font-semibold leading-tight sm:text-2xl">{value}</p>
        <p className="text-sm text-ink-light/60 dark:text-ink-dark/60">{label}</p>
        {sublabel && <p className="text-xs text-ink-light/40 dark:text-ink-dark/40">{sublabel}</p>}
      </div>
    </div>
  );
}
