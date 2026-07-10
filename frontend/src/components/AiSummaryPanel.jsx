import { useEffect, useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import * as aiSummaryService from '../services/aiSummaryService';
import { useToast } from '../context/ToastContext';

export default function AiSummaryPanel({ subjectId, cycleId, canGenerate }) {
  const { showToast } = useToast();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await aiSummaryService.getAiSummary(subjectId, cycleId);
      setSummary(data);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, cycleId]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const data = await aiSummaryService.generateAiSummary(subjectId, cycleId);
      setSummary(data);
      showToast('AI summary generated');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to generate summary.', 'error');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="card card-reviews">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-base font-semibold">
          <Sparkles size={16} className="text-primary-600 dark:text-primary-300" /> AI Performance Summary
        </h3>
        {canGenerate && (
          <button onClick={handleGenerate} disabled={generating} className="btn-secondary text-xs">
            <RefreshCw size={13} className={generating ? 'animate-spin' : ''} />
            {summary ? 'Regenerate' : 'Generate'}
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-ink-light/50 dark:text-ink-dark/50">Loading…</p>
      ) : summary ? (
        <div className="whitespace-pre-wrap text-sm leading-relaxed">{summary.summary_text}</div>
      ) : (
        <p className="text-sm text-ink-light/50 dark:text-ink-dark/50">
          {canGenerate
            ? 'No summary generated yet for this cycle. Click Generate once feedback has been submitted.'
            : 'No summary has been generated for this cycle yet.'}
        </p>
      )}
    </div>
  );
}
