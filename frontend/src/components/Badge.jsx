const TONE_CLASSES = {
  primary: 'bg-primary-50 text-primary-800 dark:bg-primary-900/50 dark:text-primary-100',
  accent: 'bg-accent-50 text-accent-800 dark:bg-accent-900/40 dark:text-accent-100',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

export default function Badge({ children, tone = 'neutral' }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}>
      {children}
    </span>
  );
}
