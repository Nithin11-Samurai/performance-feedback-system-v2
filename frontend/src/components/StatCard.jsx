const VARIANT_STYLES = {
  primary: {
    bg: 'bg-primary-50 dark:bg-primary-900/30',
    iconBg: 'bg-white dark:bg-primary-950',
    iconColor: 'text-primary-600 dark:text-primary-300',
    text: 'text-primary-900 dark:text-primary-50',
    label: 'text-primary-700/70 dark:text-primary-200/70',
  },
  skills: {
    bg: 'bg-primary-50 dark:bg-primary-900/30',
    iconBg: 'bg-white dark:bg-primary-950',
    iconColor: 'text-primary-600 dark:text-primary-300',
    text: 'text-primary-900 dark:text-primary-50',
    label: 'text-primary-700/70 dark:text-primary-200/70',
  },
  certs: {
    bg: 'bg-accent-50 dark:bg-accent-900/20',
    iconBg: 'bg-white dark:bg-accent-950',
    iconColor: 'text-accent-500 dark:text-accent-300',
    text: 'text-accent-900 dark:text-accent-50',
    label: 'text-accent-700/70 dark:text-accent-200/70',
  },
  notes: {
    bg: 'bg-slate-100 dark:bg-slate-800/40',
    iconBg: 'bg-white dark:bg-slate-900',
    iconColor: 'text-slate-500 dark:text-slate-300',
    text: 'text-slate-800 dark:text-slate-50',
    label: 'text-slate-600/70 dark:text-slate-300/70',
  },
  reviews: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    iconBg: 'bg-white dark:bg-emerald-950',
    iconColor: 'text-emerald-600 dark:text-emerald-300',
    text: 'text-emerald-900 dark:text-emerald-50',
    label: 'text-emerald-700/70 dark:text-emerald-200/70',
  },
};

/**
 * Backward compatible: existing callers passing {icon, label, value, sublabel,
 * variant} see no behavior change in props. Visually this is a deliberate
 * departure from the old "white card + thin colored border" look — each
 * variant now carries its own tinted background, so the card's resting
 * state itself communicates meaning instead of relying on a 3px accent
 * strip that's easy to miss at a glance.
 */
export default function StatCard({ icon: Icon, label, value, sublabel, variant = 'primary', loading = false }) {
  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.primary;

  if (loading) {
    return (
      <div className={`rounded-2xl ${styles.bg} p-5 flex items-center gap-4`}>
        <div className="skeleton h-12 w-12 flex-shrink-0 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-7 w-16" />
          <div className="skeleton h-3 w-24" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`animate-fade-in-up rounded-2xl ${styles.bg} p-5 flex items-center gap-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg`}
    >
      {Icon && (
        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${styles.iconBg} ${styles.iconColor} shadow-sm`}>
          <Icon size={22} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className={`break-words font-mono text-2xl font-bold leading-tight ${styles.text}`}>{value}</p>
        <p className={`text-sm font-medium ${styles.label}`}>{label}</p>
        {sublabel && <p className={`text-xs ${styles.label}`}>{sublabel}</p>}
      </div>
    </div>
  );
}
