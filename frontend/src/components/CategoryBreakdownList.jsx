/**
 * Drop this into PeerInsights.jsx's SubjectCuration component, replacing
 * the existing per-category breakdown rendering block:
 *
 *   import CategoryBreakdownList from '../components/CategoryBreakdownList';
 *   ...
 *   <CategoryBreakdownList breakdown={breakdown} />
 *
 * What changed vs. the previous version: each category used to render
 * one auto-generated sentence PER REVIEWER (via describeCategoryResponse),
 * which reads fine with 2 reviewers but becomes 10 near-identical lines
 * with 10 reviewers. This version keeps the average rating badge
 * (unchanged — still the fastest way to scan a category), but only
 * shows lines for reviewers who actually wrote a comment. A category
 * with no written comments just shows its average and nothing else,
 * so this scales to any number of reviewers without getting noisy.
 *
 * The synthesized, editable, sendable narrative HR actually hands to
 * the employee remains the separate "Generate with AI" HR Curated
 * Summary section below this — this component is just the quick-scan
 * breakdown, not the final deliverable.
 */
export default function CategoryBreakdownList({ breakdown }) {
  if (!breakdown || breakdown.reviewerCount === 0) {
    return <p className="text-sm text-ink-light/50 dark:text-ink-dark/50">No submitted feedback yet.</p>;
  }

  return (
    <div className="space-y-4">
      {breakdown.categories.map((cat) => {
        const comments = cat.responses.filter((r) => r.comment);
        if (cat.responses.length === 0) return null;

        return (
          <div key={cat.key} className="border-b border-primary-50 pb-3 last:border-0 dark:border-primary-900/50">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-sm font-semibold">{cat.label}</p>
              <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-800 dark:bg-primary-900/60 dark:text-primary-100">
                avg {cat.avgScore}/5 · {cat.responses.length} reviewer{cat.responses.length === 1 ? '' : 's'}
              </span>
            </div>

            {comments.length > 0 && (
              <div className="space-y-1 text-sm text-ink-light/70 dark:text-ink-dark/70">
                {comments.map((r, i) => (
                  <p key={i}>"{r.comment}"</p>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {breakdown.finalThoughts.length > 0 && (
        <div>
          <p className="mb-1 text-sm font-semibold">Final thoughts from peers</p>
          <div className="space-y-1 text-sm text-ink-light/70 dark:text-ink-dark/70">
            {breakdown.finalThoughts.map((t, i) => (
              <p key={i}>"{t}"</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
