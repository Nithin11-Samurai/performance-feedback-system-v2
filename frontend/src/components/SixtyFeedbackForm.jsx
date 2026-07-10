import { useEffect, useState } from 'react';
import { Star, Lock, Save, Send, AlertCircle } from 'lucide-react';
import * as peerInsightService from '../services/peerInsightService';

/**
 * The real 360 Feedback question set (Item 2) - 7 categories, each a
 * mandatory 1-5 Likert score with an optional comment, then an Overall
 * Rating (also mandatory, existing star UI) right before an optional
 * Final Thoughts box.
 *
 * Same calling convention as FeedbackForm.jsx ({ existing, onSaveDraft,
 * onLock }) so it drops into PeerInsights.jsx without touching anything
 * else - Reviews.jsx keeps using the original FeedbackForm untouched.
 */
export default function SixtyFeedbackForm({ existing, onSaveDraft, onLock }) {
  const isLocked = existing?.status === 'submitted';
  const [schema, setSchema] = useState(null);
  const [scores, setScores] = useState(existing?.category_scores || {});
  const [rating, setRating] = useState(existing?.rating || 0);
  const [finalThoughts, setFinalThoughts] = useState(existing?.comments || '');
  const [saving, setSaving] = useState(false);
  const [locking, setLocking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    peerInsightService.getFeedbackFormSchema().then(setSchema);
  }, []);

  function setCategoryScore(key, value) {
    setScores((prev) => ({ ...prev, [key]: { ...prev[key], score: value } }));
  }

  function setCategoryComment(key, value) {
    setScores((prev) => ({ ...prev, [key]: { ...prev[key], comment: value } }));
  }

  async function handleSaveDraft(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveDraft({ rating, comments: finalThoughts, categoryScores: scores });
    } finally {
      setSaving(false);
    }
  }

  async function handleLock() {
    setError('');
    if (schema) {
      const missing = schema.categories.filter((c) => !scores[c.key]?.score);
      if (missing.length > 0) {
        setError(`Please answer: ${missing.map((c) => c.label).join(', ')}`);
        return;
      }
    }
    if (!rating) {
      setError('Please give an Overall Rating before submitting.');
      return;
    }
    setLocking(true);
    try {
      await onSaveDraft({ rating, comments: finalThoughts, categoryScores: scores });
      await onLock();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit.');
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
        {schema?.categories.map((c) => {
          const entry = existing.category_scores?.[c.key];
          if (!entry?.score) return null;
          const label = schema.likertScale.find((l) => l.value === entry.score)?.label || entry.score;
          return (
            <p key={c.key}>
              <strong>{c.label}:</strong> {label}
              {entry.comment && <span className="text-ink-light/60 dark:text-ink-dark/60"> — {entry.comment}</span>}
            </p>
          );
        })}
        {existing.rating && (
          <p>
            Overall rating: <strong>{existing.rating}/5</strong>
          </p>
        )}
        {existing.comments && <p>Final thoughts: {existing.comments}</p>}
      </div>
    );
  }

  if (!schema) {
    return <p className="text-sm text-ink-light/50 dark:text-ink-dark/50">Loading questions…</p>;
  }

  return (
    <form onSubmit={handleSaveDraft} className="space-y-5">
      {schema.categories.map((c) => (
        <div key={c.key} className="border-b border-primary-50 pb-4 last:border-0 dark:border-primary-900/50">
          <p className="mb-1 text-sm font-semibold">
            {c.label} <span className="text-danger">*</span>
          </p>
          <p className="mb-3 text-xs text-ink-light/60 dark:text-ink-dark/60">{c.question}</p>
          <div className="grid grid-cols-5 gap-1 text-center">
            {schema.likertScale.map((opt) => (
              <label key={opt.value} className="flex cursor-pointer flex-col items-center gap-1.5 text-xs">
                <input
                  type="radio"
                  name={c.key}
                  checked={scores[c.key]?.score === opt.value}
                  onChange={() => setCategoryScore(c.key, opt.value)}
                  className="h-4 w-4 accent-primary-600"
                />
                <span className="text-ink-light/60 dark:text-ink-dark/60">{opt.label}</span>
              </label>
            ))}
          </div>
          <textarea
            className="input mt-3"
            rows={2}
            placeholder={`${c.label}: additional comment (optional)`}
            value={scores[c.key]?.comment || ''}
            onChange={(e) => setCategoryComment(c.key, e.target.value)}
          />
        </div>
      ))}

      <div>
        <label className="label">
          Overall rating <span className="text-danger">*</span>
        </label>
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

      <div>
        <label className="label">Final thoughts: any additional comments</label>
        <textarea className="input" rows={3} value={finalThoughts} onChange={(e) => setFinalThoughts(e.target.value)} />
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-sm text-danger">
          <AlertCircle size={14} /> {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button type="submit" disabled={saving} className="btn-secondary">
          <Save size={14} /> {saving ? 'Saving…' : 'Save draft'}
        </button>
        <button type="button" disabled={locking} onClick={handleLock} className="btn-primary">
          <Send size={14} /> {locking ? 'Submitting…' : 'Submit final'}
        </button>
      </div>
    </form>
  );
}
