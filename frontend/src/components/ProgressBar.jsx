export default function ProgressBar({ label, submitted, total, color = '#ea6bb3' }) {
  const pct = total > 0 ? Math.round((submitted / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium capitalize">{label}</span>
        <span className="data-mono text-ink-light/50 dark:text-ink-dark/50">
          {submitted}/{total} ({pct}%)
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-primary-100 dark:bg-primary-900">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
