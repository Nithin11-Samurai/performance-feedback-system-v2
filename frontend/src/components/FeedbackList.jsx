import Badge from './Badge';

const TYPE_TONE = { self: 'neutral', manager: 'primary', peer: 'accent' };

export default function FeedbackList({ feedback }) {
  if (feedback.length === 0) {
    return <p className="py-6 text-center text-sm text-ink-light/50 dark:text-ink-dark/50">No feedback submitted yet.</p>;
  }

  return (
    <ul className="space-y-4">
      {feedback.map((f) => (
        <li key={f.id} className="border-b border-primary-50 pb-4 last:border-0 last:pb-0 dark:border-primary-900/50">
          <div className="mb-1 flex items-center gap-2">
            <Badge tone={TYPE_TONE[f.type]}>{f.type}</Badge>
            <span className="text-sm font-medium">{f.reviewer_name}</span>
            {f.rating && <span className="data-mono text-xs text-ink-light/50 dark:text-ink-dark/50">{f.rating}/5</span>}
          </div>
          {f.strengths && <p className="text-sm">Strengths: {f.strengths}</p>}
          {f.improvement_areas && <p className="text-sm">Areas for improvement: {f.improvement_areas}</p>}
          {f.achievements && <p className="text-sm">Achievements: {f.achievements}</p>}
          {f.goals && <p className="text-sm">Goals: {f.goals}</p>}
          {f.comments && <p className="text-sm">Comments: {f.comments}</p>}
        </li>
      ))}
    </ul>
  );
}
