import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Play, Lock, Trash2, AlertCircle, Users2, FileDown, FileSpreadsheet } from 'lucide-react';
import { usePageTitle } from '../context/PageTitleContext';
import { useToast } from '../context/ToastContext';
import * as reviewService from '../services/reviewService';
import * as exportService from '../services/exportService';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Badge from '../components/Badge';
import CycleTimeline from '../components/CycleTimeline';
import ProgressBar from '../components/ProgressBar';
import RadialProgress from '../components/RadialProgress';
import Skeleton from '../components/Skeleton';

const STATUS_TONE = { draft: 'neutral', active: 'success', closed: 'danger' };
const NEXT_STATUS = { draft: 'active', active: 'closed', closed: null };
const NEXT_LABEL = { draft: 'Activate', active: 'Close', closed: null };
const TYPE_COLORS = { self: '#ed7dbc', manager: '#ea6bb3', peer: '#e02891' };

function CompletionSummary({ cycle }) {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    setSummary(null);
    reviewService.getCompletionSummary(cycle.id).then(setSummary).catch(() => setSummary([]));
  }, [cycle.id]);

  if (summary === null) {
    return (
      <div className="card card-reviews">
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const byType = { self: { submitted: 0, pending: 0 }, manager: { submitted: 0, pending: 0 }, peer: { submitted: 0, pending: 0 } };
  summary.forEach((row) => {
    if (byType[row.type]) byType[row.type][row.status] = row.count;
  });

  const totalSubmitted = Object.values(byType).reduce((sum, c) => sum + c.submitted, 0);
  const totalAll = Object.values(byType).reduce((sum, c) => sum + c.submitted + c.pending, 0);
  const overallPct = totalAll > 0 ? Math.round((totalSubmitted / totalAll) * 100) : 0;

  return (
    <div className="card card-reviews">
      <h4 className="mb-4 font-display text-sm font-semibold">Review completion</h4>
      {totalAll === 0 ? (
        <p className="py-6 text-center text-sm text-ink-light/50 dark:text-ink-dark/50">
          No feedback has been created for this cycle yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-[auto_1fr]">
          <div className="flex justify-center sm:justify-start">
            <RadialProgress percent={overallPct} label="Overall" sublabel={`${totalSubmitted} of ${totalAll}`} />
          </div>
          <div className="flex flex-col justify-center gap-4">
            {Object.entries(byType).map(([type, counts]) => (
              <ProgressBar
                key={type}
                label={type}
                submitted={counts.submitted}
                total={counts.submitted + counts.pending}
                color={TYPE_COLORS[type]}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminCycles() {
  usePageTitle('Review Cycles');
  const { showToast } = useToast();

  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' });
  const [saving, setSaving] = useState(false);
  const [confirmTransition, setConfirmTransition] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await reviewService.listCycles();
      setCycles(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load review cycles.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await reviewService.createCycle(form);
      showToast('Review cycle created');
      setCreateOpen(false);
      setForm({ name: '', startDate: '', endDate: '' });
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create cycle.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleTransition(cycle) {
    const nextStatus = NEXT_STATUS[cycle.status];
    if (!nextStatus) return;
    try {
      const updated = await reviewService.updateCycle(cycle.id, { status: nextStatus });
      showToast(`Cycle ${nextStatus === 'active' ? 'activated' : 'closed'}`);
      setCycles((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      if (selected?.id === updated.id) setSelected(updated);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update cycle.', 'error');
    }
  }

  async function handleDelete(cycle) {
    try {
      await reviewService.deleteCycle(cycle.id);
      showToast('Cycle deleted');
      setCycles((prev) => prev.filter((c) => c.id !== cycle.id));
      if (selected?.id === cycle.id) setSelected(null);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete cycle.', 'error');
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
      <div className="card card-reviews h-fit">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold">Cycles</h3>
          <button className="btn-primary text-xs" onClick={() => setCreateOpen(true)}>
            <Plus size={14} /> New
          </button>
        </div>

        {error && (
          <div className="mb-2 flex items-center gap-2 rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex h-24 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-300 border-t-primary-700" />
          </div>
        ) : (
          <ul className="space-y-2">
            {cycles.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setSelected(c)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                    selected?.id === c.id ? 'bg-primary-700 text-white' : 'hover:bg-primary-50 dark:hover:bg-primary-900/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{c.name}</p>
                    <Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge>
                  </div>
                  <p className={`text-xs ${selected?.id === c.id ? 'text-primary-100' : 'text-ink-light/50 dark:text-ink-dark/50'}`}>
                    {new Date(c.start_date).toLocaleDateString()} – {new Date(c.end_date).toLocaleDateString()}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected ? (
        <div className="space-y-4">
          <div className="card card-reviews">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold">{selected.name}</h3>
                <Badge tone={STATUS_TONE[selected.status]}>{selected.status}</Badge>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary text-xs" onClick={() => exportService.exportCyclePdf(selected.id, selected.name)}>
                  <FileDown size={14} /> PDF
                </button>
                <button className="btn-secondary text-xs" onClick={() => exportService.exportCycleExcel(selected.id, selected.name)}>
                  <FileSpreadsheet size={14} /> Excel
                </button>
                {NEXT_STATUS[selected.status] && (
                  <button className="btn-primary text-xs" onClick={() => setConfirmTransition(selected)}>
                    {selected.status === 'draft' ? <Play size={14} /> : <Lock size={14} />}
                    {NEXT_LABEL[selected.status]}
                  </button>
                )}
                {selected.status === 'draft' && (
                  <button className="btn-danger text-xs" onClick={() => setConfirmDelete(selected)}>
                    <Trash2 size={14} /> Delete
                  </button>
                )}
              </div>
            </div>
            <CycleTimeline cycle={selected} />
          </div>

          <CompletionSummary cycle={selected} />
          <div className="card card-reviews flex items-start gap-3 bg-primary-50/40 dark:bg-primary-900/20">
            <Users2 size={18} className="mt-0.5 flex-shrink-0 text-primary-600" />
            <p className="text-sm text-ink-light/70 dark:text-ink-dark/70">
              Looking for 360°/peer reviews or HR approval? Those now live in their own dedicated{' '}
              <Link to="/peer-insights" className="font-medium text-primary-700 underline dark:text-primary-300">
                360° Feedback
              </Link>{' '}
              section — anonymous, project-based, and decoupled from this review cycle.
            </p>
          </div>
        </div>
      ) : (
        <div className="card card-reviews flex items-center justify-center py-16 text-sm text-ink-light/50 dark:text-ink-dark/50">
          Select a cycle to manage it.
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create review cycle">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Cycle name</label>
            <input
              required
              className="input"
              placeholder="e.g. H2 2026 Review"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start date</label>
              <input
                type="date"
                required
                className="input"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">End date</label>
              <input
                type="date"
                required
                className="input"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Creating…' : 'Create cycle'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmTransition}
        onClose={() => setConfirmTransition(null)}
        onConfirm={() => confirmTransition && handleTransition(confirmTransition)}
        title={confirmTransition?.status === 'draft' ? 'Activate cycle' : 'Close cycle'}
        message={
          confirmTransition?.status === 'draft'
            ? 'Activating will allow employees, managers, and peers to submit feedback. Continue?'
            : 'Closing this cycle will prevent any further feedback submissions. Continue?'
        }
        confirmLabel={confirmTransition?.status === 'draft' ? 'Activate' : 'Close cycle'}
        danger={confirmTransition?.status === 'active'}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        title="Delete cycle"
        message="Delete this draft cycle? This cannot be undone."
        confirmLabel="Delete"
      />
    </div>
  );
}
