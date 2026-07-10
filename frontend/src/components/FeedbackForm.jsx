import { useState } from 'react';
import { Star, Lock, Save, Send } from 'lucide-react';

/**
 * @param {'self'|'rated'} kind - 'self' hides the star rating
 * @param {object|null} existing - existing draft/submitted feedback row, if any
 * @param {(payload) => Promise} onSaveDraft
 * @param {() => Promise} onLock - submits (locks) the existing draft
 */
export default function FeedbackForm({ kind = 'rated', existing, onSaveDraft, onLock }) {
  const isLocked = existing?.status === 'submitted';
  const [rating, setRating] = useState(existing?.rating || 0);
  const [strengths, setStrengths] = useState(existing?.strengths || '');
  const [improvementAreas, setImprovementAreas] = useState(existing?.improvement_areas || '');
  const [achievements, setAchievements] = useState(existing?.achievements || '');
  const [goals, setGoals] = useState(existing?.goals || '');
  const [comments, setComments] = useState(existing?.comments || '');
  const [saving, setSaving] = useState(false);
  const [locking, setLocking] = useState(false);

  async function handleSaveDraft(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveDraft({
        rating: kind === 'rated' ? rating : undefined,
        strengths,
        improvementAreas,
        achievements,
        goals,
        comments,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleLock() {
    setLocking(true);
    try {
      await onLock();
    } finally {
      setLocking(false);
    }
  }

  if (isLocked) {
    return (
      <div className="space-y-3 rounded-md bg-primary-50/50 p-4 text-sm dark:bg-primary-900/20">
        <div className="flex items-center gap-2 text-primary-700 dark:text-primary-200">
          <Lock size={14} /> Submitted — no further edits possible.
        </div>
        {kind === 'rated' && existing.rating && (
          <p>
            Overall rating: <strong>{existing.rating}/5</strong>
          </p>
        )}
        {existing.strengths && <p>Strengths: {existing.strengths}</p>}
        {existing.improvement_areas && <p>Areas for improvement: {existing.improvement_areas}</p>}
        {existing.achievements && <p>Achievements: {existing.achievements}</p>}
        {existing.goals && <p>Goals: {existing.goals}</p>}
        {existing.comments && <p>Comments: {existing.comments}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={handleSaveDraft} className="space-y-3">
      {kind === 'rated' && (
        <div>
          <label className="label">Overall rating</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                className="rounded p-0.5"
              >
                <Star size={22} className={n <= rating ? 'fill-accent-400 text-accent-400' : 'text-primary-200 dark:text-primary-800'} />
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <label className="label">Strengths</label>
        <textarea className="input" rows={2} value={strengths} onChange={(e) => setStrengths(e.target.value)} />
      </div>
      <div>
        <label className="label">Areas for improvement</label>
        <textarea
          className="input"
          rows={2}
          value={improvementAreas}
          onChange={(e) => setImprovementAreas(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Achievements</label>
        <textarea
          className="input"
          rows={2}
          placeholder="Notable wins this cycle…"
          value={achievements}
          onChange={(e) => setAchievements(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Goals</label>
        <textarea
          className="input"
          rows={2}
          placeholder="Goals for the next cycle…"
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Comments</label>
        <textarea className="input" rows={2} value={comments} onChange={(e) => setComments(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="submit" disabled={saving} className="btn-secondary">
          <Save size={14} /> {saving ? 'Saving…' : 'Save draft'}
        </button>
        <button
          type="button"
          disabled={!existing || locking}
          onClick={handleLock}
          className="btn-primary"
          title={!existing ? 'Save a draft first' : undefined}
        >
          <Send size={14} /> {locking ? 'Submitting…' : 'Submit final'}
        </button>
      </div>
    </form>
  );
}
