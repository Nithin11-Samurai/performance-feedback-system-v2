import { Check } from 'lucide-react';

const STAGES = ['draft', 'active', 'closed'];
const STAGE_LABELS = { draft: 'Draft', active: 'Active', closed: 'Closed' };

function daysBetween(a, b) {
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

/**
 * Horizontal lifecycle timeline: Draft -> Active -> Closed. When the cycle
 * is active, the segment between Active and Closed fills proportionally to
 * elapsed time between start_date and end_date, so HR can see at a glance
 * how far through the window they are — not just a static step indicator.
 */
export default function CycleTimeline({ cycle }) {
  const currentIndex = STAGES.indexOf(cycle.status);
  const startDate = new Date(cycle.start_date);
  const endDate = new Date(cycle.end_date);
  const today = new Date();

  let elapsedPct = 0;
  if (cycle.status === 'active') {
    const total = daysBetween(startDate, endDate) || 1;
    const elapsed = daysBetween(startDate, today);
    elapsedPct = Math.min(100, Math.round((elapsed / total) * 100));
  } else if (cycle.status === 'closed') {
    elapsedPct = 100;
  }

  return (
    <div className="py-2">
      <div className="flex items-center">
        {STAGES.map((stage, i) => {
          const isDone = i < currentIndex || cycle.status === 'closed';
          const isCurrent = i === currentIndex;
          return (
            <div key={stage} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors ${
                    isDone || isCurrent
                      ? 'border-primary-600 bg-primary-600 text-white'
                      : 'border-primary-200 bg-surface-light text-ink-light/40 dark:border-primary-800 dark:bg-surface-dark dark:text-ink-dark/40'
                  }`}
                >
                  {isDone ? <Check size={14} /> : i + 1}
                </div>
                <span
                  className={`mt-1.5 text-xs font-medium ${
                    isCurrent ? 'text-primary-700 dark:text-primary-300' : 'text-ink-light/50 dark:text-ink-dark/50'
                  }`}
                >
                  {STAGE_LABELS[stage]}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <div className="mx-2 h-1 flex-1 overflow-hidden rounded-full bg-primary-100 dark:bg-primary-900">
                  <div
                    className="h-full rounded-full bg-primary-600 transition-all duration-500"
                    style={{ width: i === 0 ? (currentIndex > 0 ? '100%' : '0%') : `${elapsedPct}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex justify-between text-xs text-ink-light/50 dark:text-ink-dark/50">
        <span>Starts {startDate.toLocaleDateString()}</span>
        {cycle.status === 'active' && <span>{elapsedPct}% through the review window</span>}
        <span>Ends {endDate.toLocaleDateString()}</span>
      </div>
    </div>
  );
}
