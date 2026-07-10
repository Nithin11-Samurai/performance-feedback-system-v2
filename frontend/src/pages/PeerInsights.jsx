import { useEffect, useState } from 'react';
import {
  Plus,
  Users2,
  Trash2,
  Zap,
  ChevronLeft,
  ShieldCheck,
  Send,
  Lock,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { usePageTitle } from '../context/PageTitleContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { isAdminTier } from '../utils/roles';
import * as peerInsightService from '../services/peerInsightService';
import { describeCategoryResponse } from '../utils/feedbackNarrative';
import EmployeePicker from '../components/EmployeePicker';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Badge from '../components/Badge';
import Skeleton from '../components/Skeleton';
import SixtyFeedbackForm from '../components/SixtyFeedbackForm';

export default function PeerInsights() {
  usePageTitle('360° Feedback');
  const { user } = useAuth();
  return isAdminTier(user.role) ? <HrPeerInsightsView /> : <EmployeePeerInsightsView />;
}

// ============================================================================
// HR / Admin-tier management view
// ============================================================================

function HrPeerInsightsView() {
  const { showToast } = useToast();
  const [groups, setGroups] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedRound, setSelectedRound] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState(null);

  async function loadGroups() {
    const data = await peerInsightService.listGroups();
    setGroups(data);
  }

  useEffect(() => {
    loadGroups();
  }, []);

  async function handleDeleteGroup(group) {
    try {
      await peerInsightService.deleteGroup(group.id);
      showToast('Project group deleted');
      setGroups((prev) => prev.filter((g) => g.id !== group.id));
      if (selectedGroup?.id === group.id) setSelectedGroup(null);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete group.', 'error');
    }
  }

  if (selectedRound) {
    return <RoundDetail round={selectedRound} group={selectedGroup} onBack={() => setSelectedRound(null)} />;
  }

  if (selectedGroup) {
    return (
      <GroupDetail
        group={selectedGroup}
        onBack={() => setSelectedGroup(null)}
        onOpenRound={setSelectedRound}
        onGroupUpdated={(g) => setSelectedGroup(g)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="card card-reviews flex items-start gap-3">
        <ShieldCheck size={18} className="mt-0.5 flex-shrink-0 text-primary-600" />
        <p className="text-sm text-ink-light/60 dark:text-ink-dark/60">
          Anonymous 360-degree feedback, organized by project rather than the whole org. Peers never learn
          who reviewed them, only HR sees raw feedback, and only a curated summary you write is ever shared
          with the employee, once you explicitly release it.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">Project Groups</h3>
        <button className="btn-primary" onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> New project group
        </button>
      </div>

      {groups === null ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="card card-reviews flex flex-col items-center gap-2 py-16 text-center">
          <Users2 size={28} className="text-primary-300" />
          <p className="text-sm text-ink-light/50 dark:text-ink-dark/50">
            No project groups yet. Create one to start running 360° Feedback.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <div key={g.id} className="card card-reviews cursor-pointer" onClick={() => setSelectedGroup(g)}>
              <div className="mb-2 flex items-start justify-between">
                <h4 className="font-display text-base font-semibold">{g.name}</h4>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteGroup(g);
                  }}
                  className="text-ink-light/30 hover:text-danger dark:text-ink-dark/30"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {g.description && <p className="mb-2 text-sm text-ink-light/60 dark:text-ink-dark/60">{g.description}</p>}
              <p className="text-xs text-ink-light/40 dark:text-ink-dark/40">{g.members.length} member(s)</p>
            </div>
          ))}
        </div>
      )}

      <CreateGroupModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          loadGroups();
        }}
      />

      <ConfirmDialog
        open={!!confirmDeleteGroup}
        onClose={() => setConfirmDeleteGroup(null)}
        onConfirm={() => confirmDeleteGroup && handleDeleteGroup(confirmDeleteGroup)}
        title="Delete project group"
        message="This removes the group and all its 360° Feedback history. This cannot be undone."
        confirmLabel="Delete"
      />
    </div>
  );
}

function CreateGroupModal({ open, onClose, onCreated }) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setMembers([]);
    }
  }, [open]);

  function addMember(person) {
    if (!members.find((m) => m.id === person.id)) {
      setMembers((prev) => [...prev, person]);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (members.length < 2) {
      showToast('Add at least 2 members to run 360° Feedback for this group.', 'error');
      return;
    }
    setSaving(true);
    try {
      await peerInsightService.createGroup(name, description, members.map((m) => m.id));
      showToast('Project group created');
      onCreated();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create group.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New project group" size="lg">
      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label className="label">Project name</label>
          <input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Conga Rollout" />
        </div>
        <div>
          <label className="label">Description (optional)</label>
          <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="label">Add members</label>
          <EmployeePicker onSelect={addMember} placeholder="Search employee to add…" excludeIds={members.map((m) => m.id)} />
          <div className="mt-2 flex flex-wrap gap-2">
            {members.map((m) => (
              <span key={m.id} className="flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs dark:bg-primary-900/40">
                {m.first_name} {m.last_name}
                <button type="button" onClick={() => setMembers((prev) => prev.filter((x) => x.id !== m.id))} className="text-ink-light/40 hover:text-danger">
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Creating…' : 'Create group'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function GroupDetail({ group, onBack, onOpenRound, onGroupUpdated }) {
  const { showToast } = useToast();
  const [rounds, setRounds] = useState(null);
  const [starting, setStarting] = useState(false);
  const [addPersonOpen, setAddPersonOpen] = useState(false);

  async function loadRounds() {
    const data = await peerInsightService.listRoundsForGroup(group.id);
    setRounds(data);
  }

  useEffect(() => {
    loadRounds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.id]);

  async function handleStartRound() {
    setStarting(true);
    try {
      const round = await peerInsightService.startRound(group.id);
      showToast('360° Feedback round started, reviewers notified');
      loadRounds();
      onOpenRound(round);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to start round.', 'error');
    } finally {
      setStarting(false);
    }
  }

  async function handleAddMember(person) {
    try {
      await peerInsightService.addMember(group.id, person.id);
      const refreshed = await peerInsightService.getGroup(group.id);
      onGroupUpdated(refreshed);
      showToast(`${person.first_name} added to the group`);
      setAddPersonOpen(false);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add member.', 'error');
    }
  }

  async function handleRemoveMember(person) {
    try {
      await peerInsightService.removeMember(group.id, person.id);
      const refreshed = await peerInsightService.getGroup(group.id);
      onGroupUpdated(refreshed);
      showToast(`${person.first_name} removed`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to remove member.', 'error');
    }
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-ink-light/60 hover:underline dark:text-ink-dark/60">
        <ChevronLeft size={15} /> All project groups
      </button>

      <div className="card card-reviews">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold">{group.name}</h3>
            {group.description && <p className="text-sm text-ink-light/60 dark:text-ink-dark/60">{group.description}</p>}
          </div>
          <button className="btn-primary" onClick={handleStartRound} disabled={starting || group.members.length < 2}>
            <Zap size={16} /> {starting ? 'Starting…' : 'Start 360° Feedback Round'}
          </button>
        </div>

        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold">Members ({group.members.length})</h4>
          <button onClick={() => setAddPersonOpen(true)} className="text-xs text-primary-600 hover:underline dark:text-primary-300">
            + Add member
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {group.members.map((m) => (
            <span key={m.id} className="flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs dark:bg-primary-900/40">
              {m.first_name} {m.last_name}
              <button onClick={() => handleRemoveMember(m)} className="text-ink-light/40 hover:text-danger">
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="card card-reviews">
        <h4 className="mb-3 font-display text-sm font-semibold">Rounds</h4>
        {rounds === null ? (
          <Skeleton className="h-16 w-full" />
        ) : rounds.length === 0 ? (
          <p className="text-sm text-ink-light/50 dark:text-ink-dark/50">
            No rounds yet, click "Start 360° Feedback Round" to kick off the first one.
          </p>
        ) : (
          <ul className="space-y-2">
            {rounds.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => onOpenRound(r)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-primary-50 dark:hover:bg-primary-900/40"
                >
                  <span>{r.name}</span>
                  <Badge tone={r.status === 'active' ? 'success' : 'neutral'}>{r.status}</Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal open={addPersonOpen} onClose={() => setAddPersonOpen(false)} title="Add member">
        <EmployeePicker onSelect={handleAddMember} placeholder="Search employee…" excludeIds={group.members.map((m) => m.id)} />
      </Modal>
    </div>
  );
}

function RoundDetail({ round, group, onBack }) {
  const { showToast } = useToast();
  const [completion, setCompletion] = useState(null);
  const [subjects, setSubjects] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [confirmClose, setConfirmClose] = useState(false);

  async function load() {
    const [comp, subs] = await Promise.all([
      peerInsightService.getCompletionSummary(round.id),
      peerInsightService.listSubjectsInRound(round.id),
    ]);
    setCompletion(comp);
    setSubjects(subs);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.id]);

  async function handleClose() {
    try {
      await peerInsightService.closeRound(round.id);
      showToast('Round closed');
      setConfirmClose(false);
      onBack();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to close round.', 'error');
    }
  }

  const submittedCount = completion?.find((c) => c.status === 'submitted')?.count || 0;
  const pendingCount = completion?.find((c) => c.status === 'pending')?.count || 0;

  if (selectedSubject) {
    return <SubjectCuration round={round} subject={selectedSubject} onBack={() => setSelectedSubject(null)} />;
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-ink-light/60 hover:underline dark:text-ink-dark/60">
        <ChevronLeft size={15} /> {group.name}
      </button>

      <div className="card card-reviews">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-lg font-semibold">{round.name}</h3>
          <div className="flex items-center gap-2">
            <Badge tone={round.status === 'active' ? 'success' : 'neutral'}>{round.status}</Badge>
            {round.status === 'active' && (
              <button className="btn-secondary text-xs" onClick={() => setConfirmClose(true)}>
                <Lock size={13} /> Close round
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-4 text-sm">
          <span className="text-success">{submittedCount} submitted</span>
          <span className="text-ink-light/50 dark:text-ink-dark/50">{pendingCount} pending</span>
        </div>
      </div>

      <div className="card card-reviews">
        <h4 className="mb-3 font-display text-sm font-semibold">Employees reviewed this round</h4>
        {subjects === null ? (
          <Skeleton className="h-24 w-full" />
        ) : subjects.length === 0 ? (
          <p className="text-sm text-ink-light/50 dark:text-ink-dark/50">No feedback submitted yet.</p>
        ) : (
          <ul className="space-y-1">
            {subjects.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => setSelectedSubject(s)}
                  className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-primary-50 dark:hover:bg-primary-900/40"
                >
                  {s.first_name} {s.last_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={handleClose}
        title="Close this round"
        message="Reviewers will no longer be able to submit feedback for this round. You can still curate and release summaries afterward."
        confirmLabel="Close round"
      />
    </div>
  );
}

function SubjectCuration({ round, subject, onBack }) {
  const { showToast } = useToast();
  const [rawFeedback, setRawFeedback] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [showByReviewer, setShowByReviewer] = useState(false);
  const [summary, setSummary] = useState(null);
  const [summaryText, setSummaryText] = useState('');
  const [saving, setSaving] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [schema, setSchema] = useState(null);

  useEffect(() => {
    peerInsightService.getFeedbackFormSchema().then(setSchema);
  }, []);

  async function load() {
    const [feedback, breakdownData, existingSummary] = await Promise.all([
      peerInsightService.getRawFeedback(round.id, subject.id),
      peerInsightService.getCategoryBreakdown(round.id, subject.id),
      peerInsightService.getSummary(round.id, subject.id),
    ]);
    setRawFeedback(feedback);
    setBreakdown(breakdownData);
    setSummary(existingSummary);
    setSummaryText(existingSummary?.summary_text || '');
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.id, subject.id]);

  async function handleSaveSummary() {
    setSaving(true);
    try {
      const saved = await peerInsightService.saveSummary(round.id, subject.id, summaryText);
      setSummary(saved);
      showToast('Summary saved');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save summary.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateAi() {
    setGeneratingAi(true);
    try {
      const draft = await peerInsightService.generateAiSummaryDraft(round.id, subject.id);
      setSummaryText(draft);
      showToast('AI draft generated — review and edit before sending');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to generate AI summary.', 'error');
    } finally {
      setGeneratingAi(false);
    }
  }

  async function handleRelease() {
    if (!summary) return;
    setReleasing(true);
    try {
      const released = await peerInsightService.releaseSummary(summary.id);
      setSummary(released);
      showToast(`Summary released to ${subject.first_name}`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to release summary.', 'error');
    } finally {
      setReleasing(false);
    }
  }

  async function handleUnrelease() {
    if (!summary) return;
    setReleasing(true);
    try {
      const reverted = await peerInsightService.unreleaseSummary(summary.id);
      setSummary(reverted);
      showToast(`Reverted — ${subject.first_name} can no longer see this summary`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to revert summary.', 'error');
    } finally {
      setReleasing(false);
    }
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-ink-light/60 hover:underline dark:text-ink-dark/60">
        <ChevronLeft size={15} /> {round.name}
      </button>

      <div className="card card-reviews">
        <h3 className="mb-1 font-display text-lg font-semibold">
          {subject.first_name} {subject.last_name}
        </h3>
        <p className="text-xs text-ink-light/50 dark:text-ink-dark/50">
          Raw feedback below is visible to HR/Admin only, {subject.first_name} will only ever see the curated
          summary you write, and only after you release it.
        </p>
      </div>

      <div className="card card-reviews">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="font-display text-sm font-semibold">
            Feedback breakdown ({breakdown?.reviewerCount ?? 0} peer{breakdown?.reviewerCount === 1 ? '' : 's'})
          </h4>
          {breakdown?.overallRatingAvg && (
            <span className="text-sm font-semibold text-primary-700 dark:text-primary-300">
              Avg overall: {breakdown.overallRatingAvg}/5
            </span>
          )}
        </div>

        {breakdown === null ? (
          <Skeleton className="h-32 w-full" />
        ) : breakdown.reviewerCount === 0 ? (
          <p className="text-sm text-ink-light/50 dark:text-ink-dark/50">No submitted feedback yet.</p>
        ) : (
          <>
            <div className="space-y-4">
              {breakdown.categories.map((cat) => {
                if (cat.responses.length === 0) return null;
                return (
                  <div key={cat.key} className="border-b border-primary-50 pb-3 last:border-0 dark:border-primary-900/50">
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-sm font-semibold">{cat.label}</p>
                      <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-800 dark:bg-primary-900/60 dark:text-primary-100">
                        avg {cat.avgScore}/5
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {cat.responses.map((r, i) => (
                        <p key={i} className="text-sm text-ink-light/80 dark:text-ink-dark/80">
                          {describeCategoryResponse(cat.key, r.scoreLabel, r.comment)}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {breakdown.finalThoughts.length > 0 && (
              <div className="mt-3">
                <p className="mb-1 text-sm font-semibold">Final thoughts from peers</p>
                <div className="space-y-1 text-xs text-ink-light/60 dark:text-ink-dark/60">
                  {breakdown.finalThoughts.map((t, i) => (
                    <p key={i}>"{t}"</p>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setShowByReviewer((v) => !v)}
              className="mt-4 text-xs text-primary-600 hover:underline dark:text-primary-300"
            >
              {showByReviewer ? 'Hide' : 'Show'} full detail by reviewer
            </button>

            {showByReviewer && rawFeedback && (
              <div className="mt-3 space-y-3">
                {rawFeedback.map((f) => (
                  <div key={f.id} className="rounded-md bg-primary-50/50 p-3 text-sm dark:bg-primary-900/20">
                    <p className="mb-2 text-xs font-medium text-ink-light/50 dark:text-ink-dark/50">
                      From {f.reviewer_first_name} {f.reviewer_last_name} {f.rating && `· Overall ${f.rating}/5`}
                    </p>
                    {schema && f.category_scores && (
                      <div className="mb-2 space-y-1">
                        {schema.categories.map((c) => {
                          const entry = f.category_scores[c.key];
                          if (!entry?.score) return null;
                          const label = schema.likertScale.find((l) => l.value === entry.score)?.label || entry.score;
                          return (
                            <p key={c.key}>
                              <span className="font-medium">{c.label}:</span> {label}
                              {entry.comment && <span className="text-ink-light/60 dark:text-ink-dark/60"> — {entry.comment}</span>}
                            </p>
                          );
                        })}
                      </div>
                    )}
                    {f.strengths && <p>Strengths: {f.strengths}</p>}
                    {f.improvement_areas && <p>Areas for improvement: {f.improvement_areas}</p>}
                    {f.comments && <p>Final thoughts: {f.comments}</p>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="card card-reviews">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="flex items-center gap-2 font-display text-sm font-semibold">
            <Sparkles size={15} /> HR Curated Summary
          </h4>
          <button
            onClick={handleGenerateAi}
            disabled={generatingAi || !breakdown?.reviewerCount}
            className="btn-secondary text-xs disabled:opacity-40"
            title={!breakdown?.reviewerCount ? 'No submitted feedback yet to summarize' : 'Draft a summary from the feedback above using AI'}
          >
            <Sparkles size={13} /> {generatingAi ? 'Generating…' : 'Generate with AI'}
          </button>
        </div>
        {summary?.released_to_employee && (
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs text-success">
              <CheckCircle2 size={13} /> Released to {subject.first_name} on {new Date(summary.released_at).toLocaleDateString()}
            </p>
            <button onClick={handleUnrelease} disabled={releasing} className="text-xs text-ink-light/40 hover:text-danger dark:text-ink-dark/40">
              Revert
            </button>
          </div>
        )}
        <textarea
          className="input"
          rows={5}
          placeholder="Summarize the feedback above into constructive, actionable points for the employee…"
          value={summaryText}
          onChange={(e) => setSummaryText(e.target.value)}
        />
        {summary?.released_to_employee && (
          <p className="mt-1 text-xs text-ink-light/40 dark:text-ink-dark/40">
            Editing and saving will automatically revert this — you'll need to release it again to send the
            updated version.
          </p>
        )}
        <div className="mt-3 flex justify-end gap-2">
          <button className="btn-secondary" onClick={handleSaveSummary} disabled={saving || !summaryText.trim()}>
            {saving ? 'Saving…' : 'Save summary'}
          </button>
          <button className="btn-primary" onClick={handleRelease} disabled={releasing || !summary || summary.released_to_employee}>
            <Send size={14} /> {releasing ? 'Releasing…' : summary?.released_to_employee ? 'Released' : 'Release to employee'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Employee-facing view
// ============================================================================

function EmployeePeerInsightsView() {
  const { showToast } = useToast();
  const [assignments, setAssignments] = useState(null);
  const [summaries, setSummaries] = useState(null);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState({});
  const [expandedId, setExpandedId] = useState(null);

  async function loadAssignments() {
    try {
      const data = await peerInsightService.listAllMyPendingAssignments();
      setAssignments(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load.');
    }
  }

  useEffect(() => {
    loadAssignments();
    peerInsightService
      .listMyReleasedSummaries()
      .then(setSummaries)
      .catch(() => setSummaries([]));
  }, []);

  async function handleSaveDraft(assignment, payload) {
    try {
      const updated = await peerInsightService.saveDraft(assignment.id, payload);
      setDrafts((d) => ({ ...d, [assignment.id]: updated }));
      showToast('Draft saved');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save draft.', 'error');
    }
  }

  async function handleSubmit(assignment) {
    try {
      await peerInsightService.submitFeedback(assignment.id);
      showToast('Submitted anonymously — thank you');
      setAssignments((prev) => prev.filter((a) => a.id !== assignment.id));
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit.', 'error');
    }
  }

  return (
    <div className="space-y-4">
      <div className="card card-reviews flex items-start gap-3">
        <Sparkles size={18} className="mt-0.5 flex-shrink-0 text-primary-600" />
        <p className="text-sm text-ink-light/60 dark:text-ink-dark/60">
          Your responses below are completely anonymous — the people you review will never know who said
          what, or even that you were the one asked to review them.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div>
        <h3 className="mb-3 font-display text-lg font-semibold">Peer reviews to complete</h3>
        {assignments === null ? (
          <Skeleton className="h-24 w-full" />
        ) : assignments.length === 0 ? (
          <p className="py-4 text-sm text-ink-light/50 dark:text-ink-dark/50">
            Nothing pending right now — you'll be notified if you're asked to review a teammate.
          </p>
        ) : (
          <div className="space-y-2">
            {assignments.map((a) => {
              const isOpen = expandedId === a.id;
              return (
                <div key={a.id} className="card card-reviews !p-0 overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isOpen ? null : a.id)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left"
                  >
                    <span className="text-sm font-medium">
                      Anonymous review for {a.subject_first_name} {a.subject_last_name}
                      <span className="ml-2 text-xs font-normal text-ink-light/40 dark:text-ink-dark/40">({a.group_name})</span>
                    </span>
                    <ChevronDown size={16} className={`flex-shrink-0 text-ink-light/40 transition-transform dark:text-ink-dark/40 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="border-t border-primary-50 px-5 py-4 dark:border-primary-900/50">
                      <SixtyFeedbackForm
                        existing={drafts[a.id]}
                        onSaveDraft={(payload) => handleSaveDraft(a, payload)}
                        onLock={() => handleSubmit(a)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-3 font-display text-lg font-semibold">My 360° Feedback summaries</h3>
        {summaries === null ? (
          <Skeleton className="h-24 w-full" />
        ) : summaries.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-light/50 dark:text-ink-dark/50">
            No summaries shared with you yet.
          </p>
        ) : (
          <div className="space-y-4">
            {summaries.map((s) => {
              const isRecent = Date.now() - new Date(s.released_at).getTime() < 7 * 24 * 60 * 60 * 1000;
              return (
                <div
                  key={s.id}
                  className="rounded-card border-l-4 border-primary-600 bg-primary-50/60 p-5 shadow-card dark:bg-primary-900/20"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="flex items-center gap-2 text-sm font-semibold text-primary-800 dark:text-primary-100">
                      <Sparkles size={15} /> {s.group_name} — {s.round_name}
                    </p>
                    {isRecent && <Badge tone="primary">New</Badge>}
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-light/90 dark:text-ink-dark/90">
                    {s.summary_text}
                  </p>
                  <p className="mt-3 text-xs text-ink-light/40 dark:text-ink-dark/40">
                    Shared {new Date(s.released_at).toLocaleDateString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
