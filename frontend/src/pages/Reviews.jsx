import { useEffect, useState } from 'react';
import { AlertCircle, ClipboardList } from 'lucide-react';
import { usePageTitle } from '../context/PageTitleContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ROLES } from '../utils/roles';
import * as reviewService from '../services/reviewService';
import * as userService from '../services/userService';
import FeedbackForm from '../components/FeedbackForm';
import FeedbackList from '../components/FeedbackList';
import AiSummaryPanel from '../components/AiSummaryPanel';

function CycleSelector({ cycles, selected, onChange }) {
  return (
    <select className="input max-w-xs" value={selected || ''} onChange={(e) => onChange(e.target.value)}>
      {cycles.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name} ({c.status})
        </option>
      ))}
    </select>
  );
}

function SelfReviewSection({ cycle, existing, onChanged }) {
  const { showToast } = useToast();

  async function handleSaveDraft(payload) {
    try {
      const updated = await reviewService.submitSelfReview(cycle.id, payload);
      showToast('Self-review saved');
      onChanged(updated);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save self-review.', 'error');
    }
  }

  async function handleLock() {
    try {
      const updated = await reviewService.lockFeedback(existing.id);
      showToast('Self-review submitted');
      onChanged(updated);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit self-review.', 'error');
    }
  }

  return (
    <div className="card card-reviews">
      <h3 className="mb-3 font-display text-base font-semibold">My self-review</h3>
      <FeedbackForm kind="self" existing={existing} onSaveDraft={handleSaveDraft} onLock={handleLock} />
    </div>
  );
}

const REVIEWER_TYPE_LABELS = {
  peer: 'Peer',
  hr: 'HR',
  skip_level: 'Skip-Level Manager',
  project_lead: 'Project Lead',
  mentor: 'Mentor',
};

function PeerAssignmentsSection({ cycle }) {
  const { showToast } = useToast();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState({}); // assignment.id -> feedback row

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    reviewService
      .listMyAssignments(cycle.id)
      .then((data) => !cancelled && setAssignments(data))
      .catch(() => !cancelled && setAssignments([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [cycle.id]);

  async function handleSaveDraft(assignment, payload) {
    try {
      const updated =
        assignment.reviewer_type === 'peer'
          ? await reviewService.submitPeerReview(cycle.id, assignment.subject_id, payload)
          : await reviewService.submitAssignedReview(assignment.reviewer_type, cycle.id, assignment.subject_id, payload);
      showToast(`${REVIEWER_TYPE_LABELS[assignment.reviewer_type] || assignment.reviewer_type} feedback saved`);
      setDrafts((d) => ({ ...d, [assignment.id]: updated }));
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save feedback.', 'error');
    }
  }

  async function handleLock(assignment) {
    const draft = drafts[assignment.id];
    if (!draft) return;
    try {
      const updated = await reviewService.lockFeedback(draft.id);
      showToast('Feedback submitted');
      setDrafts((d) => ({ ...d, [assignment.id]: updated }));
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit feedback.', 'error');
    }
  }

  if (loading || assignments.length === 0) return null;

  return (
    <div className="card card-reviews">
      <h3 className="mb-3 font-display text-base font-semibold">Feedback requested from you</h3>
      <div className="space-y-5">
        {assignments.map((a) => (
          <div key={a.id} className="border-t border-primary-50 pt-4 first:border-0 first:pt-0 dark:border-primary-900/50">
            <p className="mb-2 text-sm font-medium">
              {a.subject_first_name} {a.subject_last_name}{' '}
              <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-normal text-primary-700 dark:bg-primary-900/40 dark:text-primary-200">
                {REVIEWER_TYPE_LABELS[a.reviewer_type] || a.reviewer_type}
              </span>{' '}
              <span className="font-normal text-ink-light/50 dark:text-ink-dark/50">— {a.subject_job_title}</span>
            </p>
            <FeedbackForm
              kind="rated"
              existing={drafts[a.id]}
              onSaveDraft={(payload) => handleSaveDraft(a, payload)}
              onLock={() => handleLock(a)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ManagerReportsSection({ cycle }) {
  const { showToast } = useToast();
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [managerDraft, setManagerDraft] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userService
      .getMyDirectReports()
      .then(setReports)
      .finally(() => setLoading(false));
  }, []);

  async function selectReport(report) {
    setSelected(report);
    setManagerDraft(null);
    const data = await reviewService.listFeedbackForSubject(report.id, cycle.id);
    setFeedback(data);
  }

  async function handleSaveDraft(payload) {
    try {
      const updated = await reviewService.submitManagerReview(cycle.id, selected.id, payload);
      showToast('Manager feedback saved');
      setManagerDraft(updated);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save manager feedback.', 'error');
    }
  }

  async function handleLock() {
    if (!managerDraft) return;
    try {
      const updated = await reviewService.lockFeedback(managerDraft.id);
      showToast('Manager feedback submitted');
      setManagerDraft(updated);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit manager feedback.', 'error');
    }
  }

  if (loading) return null;
  if (reports.length === 0) {
    return (
      <div className="card card-reviews">
        <p className="text-sm text-ink-light/50 dark:text-ink-dark/50">You have no direct reports yet.</p>
      </div>
    );
  }

  return (
    <div className="card card-reviews">
      <h3 className="mb-3 font-display text-base font-semibold">Review your team</h3>
      <div className="mb-4 flex flex-wrap gap-2">
        {reports.map((r) => (
          <button
            key={r.id}
            onClick={() => selectReport(r)}
            className={`rounded-full px-3 py-1.5 text-sm ${
              selected?.id === r.id
                ? 'bg-primary-700 text-white'
                : 'bg-primary-50 text-primary-800 dark:bg-primary-900/40 dark:text-primary-100'
            }`}
          >
            {r.first_name} {r.last_name}
          </button>
        ))}
      </div>

      {selected && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <h4 className="mb-2 text-sm font-semibold">Your manager feedback for {selected.first_name}</h4>
            <FeedbackForm kind="rated" existing={managerDraft} onSaveDraft={handleSaveDraft} onLock={handleLock} />
          </div>
          <div>
            <h4 className="mb-2 text-sm font-semibold">All submitted feedback for {selected.first_name}</h4>
            <FeedbackList feedback={feedback} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function Reviews() {
  usePageTitle('Reviews');
  const { user } = useAuth();

  const [cycles, setCycles] = useState([]);
  const [cycleId, setCycleId] = useState(null);
  const [myFeedback, setMyFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    reviewService
      .listCycles()
      .then((data) => {
        setCycles(data);
        const active = data.find((c) => c.status === 'active');
        setCycleId((active || data[0])?.id || null);
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load review cycles.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!cycleId) return;
    reviewService
      .listFeedbackForSubject(user.id, cycleId)
      .then(setMyFeedback)
      .catch(() => setMyFeedback([]));
  }, [cycleId, user.id]);

  const selectedCycle = cycles.find((c) => c.id === cycleId);
  const mySelfDraft = myFeedback.find((f) => f.type === 'self');

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-300 border-t-primary-700" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
        <AlertCircle size={16} /> {error}
      </div>
    );
  }

  if (cycles.length === 0) {
    return (
      <div className="card card-reviews flex flex-col items-center gap-2 py-12 text-center">
        <ClipboardList size={28} className="text-primary-300" />
        <p className="text-sm text-ink-light/50 dark:text-ink-dark/50">No review cycles have been created yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-light/60 dark:text-ink-dark/60">Select a cycle to view or submit feedback.</p>
        <CycleSelector cycles={cycles} selected={cycleId} onChange={setCycleId} />
      </div>

      {selectedCycle?.status !== 'active' && (
        <div className="flex items-center gap-2 rounded-md bg-accent-50 px-4 py-3 text-sm text-accent-800 dark:bg-accent-900/30 dark:text-accent-100">
          <AlertCircle size={16} /> This cycle is {selectedCycle?.status}. New feedback can only be submitted while a
          cycle is active.
        </div>
      )}

      {selectedCycle?.status === 'active' && (
        <SelfReviewSection
          cycle={selectedCycle}
          existing={mySelfDraft}
          onChanged={() => reviewService.listFeedbackForSubject(user.id, cycleId).then(setMyFeedback)}
        />
      )}

      {selectedCycle?.status === 'active' && <PeerAssignmentsSection cycle={selectedCycle} />}

      {user.role === ROLES.MANAGER && selectedCycle?.status === 'active' && (
        <ManagerReportsSection cycle={selectedCycle} />
      )}

      <div className="card card-reviews">
        <h3 className="mb-3 font-display text-base font-semibold">Feedback about me — {selectedCycle?.name}</h3>
        <FeedbackList feedback={myFeedback} />
      </div>

      <AiSummaryPanel subjectId={user.id} cycleId={cycleId} canGenerate={false} />
    </div>
  );
}
