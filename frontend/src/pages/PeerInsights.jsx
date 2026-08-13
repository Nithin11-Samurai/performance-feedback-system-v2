import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
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
  Search,
  Briefcase,
  BarChart3,
  Check,
  FileSpreadsheet,
} from 'lucide-react';
import { usePageTitle } from '../context/PageTitleContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { isAdminTier } from '../utils/roles';
import * as peerInsightService from '../services/peerInsightService';
import { generateStructuredSummary } from '../utils/summaryGenerator';
import EmployeePicker from '../components/EmployeePicker';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Badge from '../components/Badge';
import Skeleton from '../components/Skeleton';
import SixtyFeedbackForm from '../components/SixtyFeedbackForm';

// API responses can be temporarily empty/undefined during cold starts, cached 304 responses,
// or partial failures. Keep list rendering stable instead of allowing React to crash on .length/.map().
const asArray = (value) => (Array.isArray(value) ? value : []);

const normalizeDistribution = (value) => {
  const distribution = value && typeof value === 'object' ? value : {};
  return {
    totalEmployees: Number.isFinite(Number(distribution.totalEmployees)) ? Number(distribution.totalEmployees) : 0,
    buckets: asArray(distribution.buckets).map((bucket) => ({
      ...bucket,
      rating: bucket?.rating,
      count: Number.isFinite(Number(bucket?.count)) ? Number(bucket.count) : 0,
      employees: asArray(bucket?.employees),
    })),
  };
};

export default function PeerInsights() {
  usePageTitle('360° Feedback');
  const { user } = useAuth();
  return isAdminTier(user.role) ? <HrPeerInsightsView /> : <EmployeePeerInsightsView />;
}

// ============================================================================
// HR / Admin-tier management view
// ============================================================================

// Category descriptions are stored as questions in the backend (used
// when a reviewer is answering), but read better as plain statements
// when HR is reviewing someone's feedback afterward. This is purely a
// display-layer rewording — the underlying category key/schema is
// untouched, so nothing about scoring or the review form changes.
const CATEGORY_STATEMENTS = {
  self_awareness: 'Uses their strengths to handle tough situations, stays calm under pressure, and learns from the experience.',
  driving_result: 'Sets goals, completes tasks on time, solves problems well, and tries to keep improving their work.',
  leadership: 'Supports others, acts responsibly, takes initiative, and adapts to change.',
  communication: 'Communicates clearly, gives and receives feedback well, and promotes open communication in the team.',
  teamwork: 'Supports the team, shares ideas, handles conflicts well, and appreciates others.',
  growth_development: 'Builds skills and habits that help them grow, work more efficiently, and have a bigger impact.',
  starc: 'Takes actions to support company initiatives and promote overall growth while upholding sincerity, trust, approachability, respect, and curiosity.',
};

function categoryStatement(category) {
  return CATEGORY_STATEMENTS[category.key] || category.question;
}

function HrPeerInsightsView() {
  const { showToast } = useToast();
  const [groups, setGroups] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedRound, setSelectedRound] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [groupFilter, setGroupFilter] = useState('');
  const [distribution, setDistribution] = useState(null);
  const [ratingTrend, setRatingTrend] = useState(null);
  const [topRated, setTopRated] = useState(null);
  const [pendingProjects, setPendingProjects] = useState(null);
  const [remindingRoundId, setRemindingRoundId] = useState(null);
  const [overviewProjectFilter, setOverviewProjectFilter] = useState('');
  const [expandedBucket, setExpandedBucket] = useState(null);
  const [bucketFilter, setBucketFilter] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (activeTab !== 'overview') return;
    peerInsightService
      .getRatingDistribution(overviewProjectFilter || undefined)
      .then((data) => setDistribution(normalizeDistribution(data)))
      .catch(() => setDistribution({ totalEmployees: 0, buckets: [] }));
    peerInsightService
      .getRatingTrend(overviewProjectFilter || undefined)
      .then((data) => setRatingTrend(asArray(data)))
      .catch(() => setRatingTrend([]));
    peerInsightService
      .getTopRatedEmployees(5, overviewProjectFilter || undefined)
      .then((data) => setTopRated(asArray(data)))
      .catch(() => setTopRated([]));
  }, [activeTab, overviewProjectFilter]);

  useEffect(() => {
    if (activeTab === 'overview' && pendingProjects === null) {
      peerInsightService
        .getProjectsWithPendingFeedback()
        .then((data) => setPendingProjects(asArray(data)))
        .catch(() => setPendingProjects([]));
    }
  }, [activeTab, pendingProjects]);

  /** Jumps straight into the round where the existing remind UI already lives, from the Overview tab. */
  async function handleRemindAllPending(roundId) {
    setRemindingRoundId(roundId);
    try {
      const result = await peerInsightService.remindAllPendingForRound(roundId);
      showToast(result.message);
      peerInsightService.getProjectsWithPendingFeedback().then((data) => setPendingProjects(asArray(data)));
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send reminders.', 'error');
    } finally {
      setRemindingRoundId(null);
    }
  }

  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(() => {
      peerInsightService
        .searchSubjects(searchTerm.trim())
        .then((data) => setSearchResults(asArray(data)))
        .catch(() => setSearchResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  async function loadGroups() {
    const data = await peerInsightService.listGroups();
    setGroups(asArray(data));
  }

  useEffect(() => {
    loadGroups();
  }, []);

  async function handleDeleteGroup(group) {
    try {
      await peerInsightService.deleteGroup(group.id);
      showToast('Project group deleted');
      setGroups((prev) => asArray(prev).filter((g) => g.id !== group.id));
      if (selectedGroup?.id === group.id) setSelectedGroup(null);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete group.', 'error');
    }
  }

  if (selectedEmployee) {
    return <EmployeeCrossProjectView employee={selectedEmployee} onBack={() => setSelectedEmployee(null)} />;
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
      <div className="relative overflow-hidden rounded-2xl bg-primary-50 p-4 dark:bg-primary-900/20">
        <h2 className="relative z-10 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-ink-dark">
          <Users2 size={18} className="text-primary-600" /> 360° Feedback — anonymous, project-based growth insights.
        </h2>
        <div className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-primary-100/60" aria-hidden="true" />
      </div>

      <div className="flex gap-1 border-b border-primary-100 dark:border-primary-900/70">
        {[
          { key: 'overview', label: '360° Feedback Overview', icon: BarChart3 },
          { key: 'employee', label: 'Employee Insights', icon: Users2 },
          { key: 'groups', label: 'Project Groups', icon: Briefcase },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-primary-600 text-primary-700 dark:text-primary-300'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-ink-dark/60'
            }`}
          >
            <tab.icon size={15} /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
      <>
      <div className="card card-reviews">
        <h3 className="mb-1 flex items-center gap-2 font-display text-base font-semibold">
          <BarChart3 size={17} className="text-primary-600" /> 360° Feedback Rating Overview
        </h3>

        <div className="mt-4">
            <select
              value={overviewProjectFilter}
              onChange={(e) => setOverviewProjectFilter(e.target.value)}
              className="input mb-4 w-auto text-sm"
            >
              <option value="">All projects</option>
              {(groups || []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>

            {distribution === null ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-semibold leading-6 text-primary-700 dark:text-primary-300">
                      {distribution.totalEmployees}
                    </p>
                    <p className="text-xs text-ink-light/55 dark:text-ink-dark/55">
                      employee{distribution.totalEmployees === 1 ? '' : 's'} with submitted 360° Feedback
                      {overviewProjectFilter ? '' : ', org-wide'}
                    </p>
                  </div>
                  <button
                    onClick={() => peerInsightService.exportRatingDistributionExcel(overviewProjectFilter || undefined)}
                    className="btn-secondary text-xs"
                  >
                    <FileSpreadsheet size={13} /> Export Excel
                  </button>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {distribution.buckets.map((b) => {
                    const pct = distribution.totalEmployees > 0 ? (b.count / distribution.totalEmployees) * 100 : 0;
                    const isSelected = expandedBucket === b.rating;
                    return (
                      <button
                        key={b.rating}
                        onClick={() => {
                          setExpandedBucket(isSelected ? null : b.rating);
                          setBucketFilter('');
                        }}
                        className={`rounded-xl border p-3 text-center transition-colors ${
                          isSelected
                            ? 'border-primary-300 bg-primary-50 dark:bg-primary-900/40'
                            : 'border-primary-50 hover:bg-primary-50/60 dark:border-primary-900/50'
                        }`}
                      >
                        <p className="text-xl font-semibold text-primary-700 dark:text-primary-300">{b.rating}/5</p>
                        <p className="mb-2 text-xs text-ink-light/50 dark:text-ink-dark/50">
                          {b.count} employee{b.count === 1 ? '' : 's'}
                        </p>
                        <div className="h-1 overflow-hidden rounded-full bg-primary-50 dark:bg-primary-900/30">
                          <div className="h-full rounded-full bg-primary-400" style={{ width: `${pct}%` }} />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {expandedBucket !== null &&
                  (() => {
                    const bucket = asArray(distribution?.buckets).find((b) => b.rating === expandedBucket);
                    const bucketEmployees = asArray(bucket?.employees);
                    const filtered = bucketEmployees
                      .filter((e) => `${e.first_name || ''} ${e.last_name || ''}`.toLowerCase().includes(bucketFilter.trim().toLowerCase()))
                      .sort((a, b) => (a.first_name || '').localeCompare(b.first_name || ''));
                    return (
                      <div className="mt-3 rounded-xl border border-primary-50 p-3 dark:border-primary-900/50">
                        {bucketEmployees.length === 0 ? (
                          <p className="text-sm text-ink-light/50 dark:text-ink-dark/50">No employees in this bucket.</p>
                        ) : (
                          <>
                            {bucketEmployees.length > 8 && (
                              <input
                                value={bucketFilter}
                                onChange={(e) => setBucketFilter(e.target.value)}
                                placeholder={`Filter ${bucket.count} names…`}
                                className="input mb-2 text-sm"
                              />
                            )}
                            <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
                              {filtered.map((e) => (
                                <li key={e.id} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-primary-50/60 dark:hover:bg-primary-900/30">
                                  <span>
                                    {e.first_name} {e.last_name}
                                  </span>
                                  <span className="text-xs text-ink-light/45 dark:text-ink-dark/45">avg {e.avg_rating}/5</span>
                                </li>
                              ))}
                            </ul>
                            {filtered.length === 0 && (
                              <p className="py-2 text-center text-sm text-ink-light/50 dark:text-ink-dark/50">
                                No names match "{bucketFilter}".
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })()}
              </>
            )}
          </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card card-reviews">
          <h3 className="mb-4 font-display text-base font-semibold">Rating Trend</h3>
          {ratingTrend === null ? (
            <Skeleton className="h-[220px] w-full" />
          ) : ratingTrend.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-light/50 dark:text-ink-dark/50">
              No completed reviews yet — the trend will appear here once feedback starts coming in.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={ratingTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f6c0df" />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis domain={[0, 5]} fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="avg_rating" stroke="#E83E93" strokeWidth={2} dot={{ fill: '#E83E93' }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card card-reviews">
          <h3 className="mb-4 font-display text-base font-semibold">Top Rated Employees</h3>
          {topRated === null ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : topRated.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-light/50 dark:text-ink-dark/50">
              No submitted feedback yet.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary-100 text-left text-xs uppercase text-ink-light/40 dark:border-primary-900/50 dark:text-ink-dark/40">
                  <th className="pb-2">Employee Name</th>
                  <th className="pb-2 text-right">Average Rating</th>
                </tr>
              </thead>
              <tbody>
                {topRated.map((e) => (
                  <tr key={e.id} className="border-b border-primary-50 last:border-0 dark:border-primary-900/40">
                    <td className="py-2.5 font-medium text-gray-900 dark:text-ink-dark">
                      {e.first_name} {e.last_name}
                    </td>
                    <td className="py-2.5 text-right text-primary-600 dark:text-primary-300">{e.avg_rating}/5</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card card-reviews">
        <h3 className="mb-4 flex items-center gap-2 font-display text-base font-semibold">
          <AlertCircle size={17} className="text-primary-600" /> Projects with Pending Feedback
        </h3>
        {pendingProjects === null ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : pendingProjects.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-light/50 dark:text-ink-dark/50">
            No active rounds with pending feedback — everything's caught up.
          </p>
        ) : (
          <ul className="space-y-2">
            {pendingProjects.map((p) => (
              <li
                key={p.round_id}
                className="flex items-center justify-between rounded-xl border border-primary-50 p-3 dark:border-primary-900/50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-ink-dark">
                    {p.group_name} <span className="text-ink-light/40 dark:text-ink-dark/40">— {p.round_name}</span>
                  </p>
                  <p className="text-xs text-ink-light/50 dark:text-ink-dark/50">
                    {p.pending_count} pending{p.end_date && ` · Ends ${new Date(p.end_date).toLocaleDateString()}`}
                  </p>
                </div>
                <button
                  onClick={() => handleRemindAllPending(p.round_id)}
                  disabled={remindingRoundId === p.round_id}
                  className="btn-primary text-xs disabled:opacity-50"
                >
                  {remindingRoundId === p.round_id ? 'Sending…' : `Remind all (${p.pending_count})`}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      </>
      )}

      {activeTab === 'employee' && (
      <>
      <div className="card card-reviews flex items-start gap-3">
        <ShieldCheck size={18} className="mt-0.5 flex-shrink-0 text-primary-600" />
        <p className="text-sm text-ink-light/60 dark:text-ink-dark/60">
          Anonymous 360-degree feedback. Peers never learn who reviewed them, only HR sees raw feedback, and
          only a curated summary you write is ever shared with the employee, once you explicitly release it.
        </p>
      </div>

      <div className="relative">
        <div className="card card-reviews">
          <label className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Search size={15} /> Employee Insights Lookup
          </label>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name — e.g. Karan Bhadiadra"
            className="input"
          />
        </div>
        {searchTerm.trim().length >= 2 && (
          <div className="absolute left-5 right-5 top-full z-10 mt-1 max-h-64 overflow-y-auto rounded-xl border border-primary-100 bg-white shadow-lg dark:border-primary-900 dark:bg-primary-950">
            {searchResults === null ? (
              <p className="p-3 text-sm text-ink-light/50 dark:text-ink-dark/50">Searching…</p>
            ) : searchResults.length === 0 ? (
              <p className="p-3 text-sm text-ink-light/50 dark:text-ink-dark/50">
                No employee found with submitted feedback matching "{searchTerm}".
              </p>
            ) : (
              searchResults.map((e) => (
                <button
                  key={e.id}
                  onClick={() => {
                    setSelectedEmployee(e);
                    setSearchTerm('');
                    setSearchResults(null);
                  }}
                  className="flex w-full items-center justify-between border-b border-primary-50 px-3 py-2.5 text-left text-sm last:border-0 hover:bg-primary-50/60 dark:border-primary-900/50 dark:hover:bg-primary-900/30"
                >
                  <span className="font-medium">
                    {e.first_name} {e.last_name}
                  </span>
                  <span className="text-xs text-ink-light/45 dark:text-ink-dark/45">
                    {e.job_title || e.employee_code}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
      </>
      )}

      {activeTab === 'groups' && (
      <>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">Project Groups</h3>
        <button className="btn-primary" onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> New project group
        </button>
      </div>

      {groups !== null && groups.length > 6 && (
        <input
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value)}
          placeholder="Filter project groups by name…"
          className="input"
        />
      )}

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
        <div className="max-h-[560px] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groups
              .filter((g) => g.name.toLowerCase().includes(groupFilter.trim().toLowerCase()))
              .map((g) => (
                <div
                  key={g.id}
                  className="group relative cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-primary-900/50 dark:bg-surface-dark"
                  onClick={() => setSelectedGroup(g)}
                >
                  <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-primary-50 dark:bg-primary-900/30" />
                  <div className="relative">
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-200">
                        <Briefcase size={20} />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteGroup(g);
                        }}
                        className="text-ink-light/30 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100 dark:text-ink-dark/30"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <h4 className="font-display text-base font-semibold text-gray-900 dark:text-ink-dark">{g.name}</h4>
                    {g.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-ink-light/60 dark:text-ink-dark/60">{g.description}</p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {(g.members || []).slice(0, 4).map((m) => (
                          <div
                            key={m.id}
                            className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-primary-200 text-[10px] font-semibold text-primary-800 dark:border-surface-dark dark:bg-primary-800 dark:text-primary-100"
                          >
                            {m.first_name?.[0]}
                          </div>
                        ))}
                      </div>
                      <span className="text-xs font-medium text-ink-light/50 dark:text-ink-dark/50">
                        {(g.members || []).length} member{(g.members || []).length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
          {groups.filter((g) => g.name.toLowerCase().includes(groupFilter.trim().toLowerCase())).length === 0 && (
            <p className="py-6 text-center text-sm text-ink-light/50 dark:text-ink-dark/50">
              No project groups match "{groupFilter}".
            </p>
          )}
        </div>
      )}
      </>
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

// ============================================================================
// Cross-project view: one employee, every project they're part of, plus
// one overall summary that spans all of them
// ============================================================================

/**
 * Same "full detail by reviewer" pattern already used in the
 * single-project view, extracted so the cross-project view can use it
 * per-project too, without duplicating the fetch/render logic.
 */
function PerReviewerDetail({ roundId, subjectId, schema }) {
  const [rawFeedback, setRawFeedback] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());

  useEffect(() => {
    peerInsightService.getRawFeedback(roundId, subjectId).then((data) => setRawFeedback(asArray(data))).catch(() => setRawFeedback([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId, subjectId]);

  function toggleReviewer(id) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (rawFeedback === null) {
    return <Skeleton className="h-16 w-full" />;
  }

  if (rawFeedback.length === 0) {
    return <p className="text-sm text-ink-light/50 dark:text-ink-dark/50">No submitted feedback yet.</p>;
  }

  return (
    <div className="space-y-2">
      {rawFeedback.map((f) => {
            const isOpen = expandedIds.has(f.id);
            return (
              <div key={f.id} className="rounded-md bg-primary-50/50 dark:bg-primary-900/20">
                <button
                  onClick={() => toggleReviewer(f.id)}
                  className="flex w-full items-center justify-between gap-2 p-3 text-left"
                >
                  <span className="text-sm font-medium">
                    {f.reviewer_first_name} {f.reviewer_last_name}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`flex-shrink-0 text-ink-light/40 transition-transform dark:text-ink-dark/40 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div className="space-y-4 px-3 pb-4 text-sm">
                    {schema &&
                      f.category_scores &&
                      asArray(schema?.categories).map((c, i) => {
                        const entry = f.category_scores[c.key];
                        if (!entry?.score) return null;
                        const levelLabel = asArray(schema?.likertScale).find((l) => l.value === entry.score)?.label || entry.score;
                        return (
                          <div key={c.key} className={i > 0 ? 'border-t border-primary-100 pt-3 dark:border-primary-900/50' : ''}>
                            <p className="font-medium text-gray-900 dark:text-ink-dark">{c.label}</p>
                            <p className="mt-0.5 text-ink-light/70 dark:text-ink-dark/70">{categoryStatement(c)}</p>
                            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                              <Check size={12} /> {levelLabel}
                            </span>
                            {entry.comment && (
                              <p className="mt-1.5 text-xs italic text-ink-light/60 dark:text-ink-dark/60">"{entry.comment}"</p>
                            )}
                          </div>
                        );
                      })}
                    {f.comments && (
                      <div className="border-t border-primary-100 pt-3 dark:border-primary-900/50">
                        <p className="font-medium text-gray-900 dark:text-ink-dark">Final thoughts</p>
                        <p className="mt-0.5 text-ink-light/70 dark:text-ink-dark/70">"{f.comments}"</p>
                      </div>
                    )}
                    {f.strengths && <p>Strengths: {f.strengths}</p>}
                    {f.improvement_areas && <p>Areas for improvement: {f.improvement_areas}</p>}
                  </div>
                )}
              </div>
            );
      })}
    </div>
  );
}

function EmployeeCrossProjectView({ employee, onBack }) {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [schema, setSchema] = useState(null);
  const [overallSummary, setOverallSummary] = useState(null);
  const [summaryText, setSummaryText] = useState('');
  const [saving, setSaving] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState(new Set());

  function toggleProject(roundId) {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(roundId)) next.delete(roundId);
      else next.add(roundId);
      return next;
    });
  }

  useEffect(() => {
    peerInsightService.getFeedbackFormSchema().then((data) => setSchema(data || { categories: [], likertScale: [] })).catch(() => setSchema({ categories: [], likertScale: [] }));
    Promise.all([
      peerInsightService.getCrossProjectBreakdown(employee.id),
      peerInsightService.getOverallSummary(employee.id),
    ]).then(([breakdownData, summary]) => {
      const safeBreakdown = breakdownData && typeof breakdownData === 'object'
        ? { ...breakdownData, projects: asArray(breakdownData.projects), overall: breakdownData.overall || null }
        : { projects: [], overall: null };
      setData(safeBreakdown);
      setOverallSummary(summary || null);
      setSummaryText(summary?.summary_text || '');
    }).catch(() => {
      setData({ projects: [], overall: null });
      setOverallSummary(null);
    });
  }, [employee.id]);

  function handleGenerateSummary() {
    if (!data) return;
    const draft = generateStructuredSummary(data.overall, employee.first_name);
    if (!draft) {
      showToast('No submitted feedback yet to summarize.', 'error');
      return;
    }
    setSummaryText(draft);
    showToast('Draft generated from all projects combined — review and edit before sending');
  }

  async function handleSaveSummary() {
    setSaving(true);
    try {
      const saved = await peerInsightService.saveOverallSummary(employee.id, summaryText);
      setOverallSummary(saved);
      showToast('Overall summary saved');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save summary.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleRelease() {
    setReleasing(true);
    try {
      const released = await peerInsightService.releaseOverallSummary(employee.id);
      setOverallSummary(released);
      showToast(`Released to ${employee.first_name}`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to release.', 'error');
    } finally {
      setReleasing(false);
    }
  }

  async function handleRevert() {
    try {
      const reverted = await peerInsightService.unreleaseOverallSummary(employee.id);
      setOverallSummary(reverted);
      showToast(`Reverted — no longer visible to ${employee.first_name}`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to revert.', 'error');
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-ink-light/60 hover:underline dark:text-ink-dark/60"
      >
        <ChevronLeft size={15} /> Back
      </button>

      <div className="card card-reviews">
        <h3 className="font-display text-lg font-semibold">
          {employee.first_name} {employee.last_name}
        </h3>
        <p className="text-sm text-ink-light/55 dark:text-ink-dark/55">
          {employee.job_title || 'No job title set'}
          {employee.department ? ` · ${employee.department}` : ''}
        </p>
      </div>

      {data === null ? (
        <Skeleton className="h-40 w-full" />
      ) : asArray(data?.projects).length === 0 ? (
        <p className="text-sm text-ink-light/50 dark:text-ink-dark/50">
          No submitted 360° Feedback found for this employee yet.
        </p>
      ) : (
        <>
          {asArray(data?.projects).map((p) => {
            const isExpanded = expandedProjects.has(p.roundId);
            return (
              <div key={p.roundId} className="card card-reviews">
                <button
                  onClick={() => toggleProject(p.roundId)}
                  className="flex w-full items-center justify-between gap-2 text-left"
                >
                  <div className="flex items-center gap-2">
                    <Briefcase size={15} className="text-primary-600" />
                    <h4 className="font-display text-sm font-semibold">{p.groupName}</h4>
                    <span className="text-xs text-ink-light/40 dark:text-ink-dark/40">({p.roundName})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {!isExpanded && (
                      <span className="text-xs text-ink-light/50 dark:text-ink-dark/50">
                        {p.breakdown.reviewerCount} reviewer{p.breakdown.reviewerCount === 1 ? '' : 's'}
                      </span>
                    )}
                    <ChevronDown
                      size={16}
                      className={`flex-shrink-0 text-ink-light/40 transition-transform dark:text-ink-dark/40 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>
                {isExpanded && (
                  <div className="mt-3">
                    <PerReviewerDetail roundId={p.roundId} subjectId={employee.id} schema={schema} />
                  </div>
                )}
              </div>
            );
          })}

          <div className="card card-reviews">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="flex items-center gap-2 font-display text-sm font-semibold">
                <Sparkles size={15} /> Overall Summary — across all {asArray(data?.projects).length} project
                {asArray(data?.projects).length === 1 ? '' : 's'}
              </h4>
              <button
                onClick={handleGenerateSummary}
                disabled={!data.overall?.reviewerCount}
                className="btn-secondary text-xs disabled:opacity-40"
              >
                <Sparkles size={13} /> Generate Summary
              </button>
            </div>

            {overallSummary?.released_to_employee && (
              <div className="mb-2 flex items-center justify-between rounded-md bg-green-50 px-3 py-2 text-xs text-green-700 dark:bg-green-900/20 dark:text-green-300">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} /> Released to {employee.first_name} on{' '}
                  {new Date(overallSummary.released_at).toLocaleDateString()}
                </span>
                <button onClick={handleRevert} className="font-medium underline">
                  Revert
                </button>
              </div>
            )}

            <textarea
              value={summaryText}
              onChange={(e) => setSummaryText(e.target.value)}
              rows={8}
              placeholder="Write or generate an overall summary spanning everything this employee has been reviewed on, across all their projects..."
              className="input"
            />

            <div className="mt-3 flex justify-end gap-2">
              <button onClick={handleSaveSummary} disabled={saving || !summaryText.trim()} className="btn-secondary text-xs">
                {saving ? 'Saving…' : 'Save draft'}
              </button>
              <button
                onClick={handleRelease}
                disabled={releasing || !summaryText.trim()}
                className="btn-primary text-xs"
              >
                <Send size={13} /> {releasing ? 'Releasing…' : 'Save & release to employee'}
              </button>
            </div>
          </div>
        </>
      )}
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
  const [editingMembers, setEditingMembers] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [startRoundOpen, setStartRoundOpen] = useState(false);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [roundNameInput, setRoundNameInput] = useState('');
  const [roundEndDateInput, setRoundEndDateInput] = useState('');
  const [editNameInput, setEditNameInput] = useState(group.name);
  const [editDescriptionInput, setEditDescriptionInput] = useState(group.description || '');
  const members = asArray(group?.members);

  async function loadRounds() {
    const data = await peerInsightService.listRoundsForGroup(group.id);
    setRounds(asArray(data));
  }

  useEffect(() => {
    loadRounds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.id]);

  async function handleStartRound() {
    setStarting(true);
    try {
      const round = await peerInsightService.startRound(
        group.id,
        roundNameInput.trim() || undefined,
        roundEndDateInput || undefined
      );
      showToast('360° Feedback round started, reviewers notified');
      setStartRoundOpen(false);
      setRoundNameInput('');
      setRoundEndDateInput('');
      loadRounds();
      onOpenRound(round);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to start round.', 'error');
    } finally {
      setStarting(false);
    }
  }

  async function handleUpdateProject() {
    try {
      const updated = await peerInsightService.updateGroup(group.id, {
        name: editNameInput.trim(),
        description: editDescriptionInput.trim(),
      });
      onGroupUpdated(updated);
      showToast('Project updated');
      setEditProjectOpen(false);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update project.', 'error');
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
    } finally {
      setConfirmRemove(null);
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
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg font-semibold">{group.name}</h3>
              <button
                onClick={() => {
                  setEditNameInput(group.name);
                  setEditDescriptionInput(group.description || '');
                  setEditProjectOpen(true);
                }}
                className="text-xs text-primary-600 hover:underline dark:text-primary-300"
              >
                Edit
              </button>
            </div>
            {group.description && <p className="text-sm text-ink-light/60 dark:text-ink-dark/60">{group.description}</p>}
          </div>
          <button
            className="btn-primary"
            onClick={() => setStartRoundOpen(true)}
            disabled={starting || members.length < 2}
          >
            <Zap size={16} /> Start 360° Feedback Round
          </button>
        </div>

        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold">Members ({members.length})</h4>
          <div className="flex items-center gap-3">
            {editingMembers && (
              <button onClick={() => setAddPersonOpen(true)} className="text-xs text-primary-600 hover:underline dark:text-primary-300">
                + Add member
              </button>
            )}
            <button
              onClick={() => setEditingMembers((v) => !v)}
              className="text-xs text-ink-light/60 hover:underline dark:text-ink-dark/60"
            >
              {editingMembers ? 'Done' : 'Edit members'}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <span key={m.id} className="flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs dark:bg-primary-900/40">
              {m.first_name} {m.last_name}
              {editingMembers && (
                <button onClick={() => setConfirmRemove(m)} className="text-ink-light/40 hover:text-danger">
                  ×
                </button>
              )}
            </span>
          ))}
        </div>

        <ConfirmDialog
          open={!!confirmRemove}
          onClose={() => setConfirmRemove(null)}
          onConfirm={() => handleRemoveMember(confirmRemove)}
          title="Remove member"
          message={
            confirmRemove
              ? `Remove ${confirmRemove.first_name} ${confirmRemove.last_name} from "${group.name}"? Any feedback they've already submitted or received stays intact — this only removes them from future rounds in this group.`
              : ''
          }
          confirmLabel="Remove"
          danger
        />
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
                  <span>
                    {r.name}
                    <span className="ml-2 text-xs text-ink-light/40 dark:text-ink-dark/40">
                      Started {new Date(r.started_at).toLocaleDateString()}
                      {r.end_date && ` · Ends ${new Date(r.end_date).toLocaleDateString()}`}
                    </span>
                  </span>
                  <Badge tone={r.status === 'active' ? 'success' : 'neutral'}>{r.status}</Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal open={addPersonOpen} onClose={() => setAddPersonOpen(false)} title="Add member">
        <EmployeePicker onSelect={handleAddMember} placeholder="Search employee…" excludeIds={members.map((m) => m.id)} />
      </Modal>

      <Modal open={startRoundOpen} onClose={() => setStartRoundOpen(false)} title="Start 360° Feedback Round">
        <div className="space-y-3">
          <div>
            <label className="label">Round name (optional)</label>
            <input
              value={roundNameInput}
              onChange={(e) => setRoundNameInput(e.target.value)}
              placeholder={`Round ${(rounds?.length || 0) + 1}`}
              className="input"
            />
            <p className="mt-1 text-xs text-ink-light/50 dark:text-ink-dark/50">
              Leave blank to auto-name it "Round {(rounds?.length || 0) + 1}".
            </p>
          </div>
          <div>
            <label className="label">End date (optional)</label>
            <input
              type="date"
              value={roundEndDateInput}
              onChange={(e) => setRoundEndDateInput(e.target.value)}
              className="input"
            />
            <p className="mt-1 text-xs text-ink-light/50 dark:text-ink-dark/50">
              Reviewers get an automatic reminder 3 days before this date if they haven't submitted yet.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary text-sm" onClick={() => setStartRoundOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary text-sm" onClick={handleStartRound} disabled={starting}>
              <Zap size={14} /> {starting ? 'Starting…' : 'Start round'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={editProjectOpen} onClose={() => setEditProjectOpen(false)} title="Edit project">
        <div className="space-y-3">
          <div>
            <label className="label">Project name</label>
            <input value={editNameInput} onChange={(e) => setEditNameInput(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              value={editDescriptionInput}
              onChange={(e) => setEditDescriptionInput(e.target.value)}
              rows={3}
              className="input"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary text-sm" onClick={() => setEditProjectOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary text-sm" onClick={handleUpdateProject} disabled={!editNameInput.trim()}>
              Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function RoundDetail({ round: initialRound, group, onBack }) {
  const { showToast } = useToast();
  const [round, setRound] = useState(initialRound);
  const [completion, setCompletion] = useState(null);
  const [subjects, setSubjects] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [assignmentDetail, setAssignmentDetail] = useState(null);
  const [showStatusDetail, setShowStatusDetail] = useState(false);
  const [reminding, setReminding] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editNameInput, setEditNameInput] = useState(round.name);
  const [editEndDateInput, setEditEndDateInput] = useState(round.end_date ? round.end_date.slice(0, 10) : '');

  async function load() {
    const [comp, subs, detail] = await Promise.all([
      peerInsightService.getCompletionSummary(round.id),
      peerInsightService.listSubjectsInRound(round.id),
      peerInsightService.getRoundAssignmentDetail(round.id),
    ]);
    setCompletion(comp);
    setSubjects(subs);
    setAssignmentDetail(detail);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.id]);

  async function handleRemind(feedbackId) {
    setReminding(feedbackId);
    try {
      const result = await peerInsightService.remindReviewer(feedbackId);
      showToast(result.message);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send reminder.', 'error');
    } finally {
      setReminding(null);
    }
  }

  async function handleClose() {
    try {
      const updated = await peerInsightService.closeRound(round.id);
      setRound(updated);
      showToast('Round closed');
      setConfirmClose(false);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to close round.', 'error');
    }
  }

  async function handleReactivate() {
    try {
      const updated = await peerInsightService.reactivateRound(round.id);
      setRound(updated);
      showToast('Round reactivated');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reactivate round.', 'error');
    }
  }

  async function handleUpdateRound() {
    try {
      const updated = await peerInsightService.updateRound(round.id, {
        name: editNameInput.trim(),
        endDate: editEndDateInput || null,
      });
      setRound(updated);
      showToast('Round updated');
      setEditOpen(false);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update round.', 'error');
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
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-semibold">{round.name}</h3>
            <button
              onClick={() => {
                setEditNameInput(round.name);
                setEditEndDateInput(round.end_date ? round.end_date.slice(0, 10) : '');
                setEditOpen(true);
              }}
              className="text-xs text-primary-600 hover:underline dark:text-primary-300"
            >
              Edit
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={round.status === 'active' ? 'success' : 'neutral'}>{round.status}</Badge>
            {round.status === 'active' ? (
              <button className="btn-secondary text-xs" onClick={() => setConfirmClose(true)}>
                <Lock size={13} /> Close round
              </button>
            ) : (
              <button className="btn-secondary text-xs" onClick={handleReactivate}>
                <Zap size={13} /> Reactivate round
              </button>
            )}
          </div>
        </div>
        <p className="mb-4 text-xs text-ink-light/50 dark:text-ink-dark/50">
          Started {new Date(round.started_at).toLocaleDateString()}
          {round.end_date && ` · Ends ${new Date(round.end_date).toLocaleDateString()}`}
        </p>
        <button
          onClick={() => setShowStatusDetail((v) => !v)}
          className="flex items-center gap-4 text-sm hover:opacity-80"
          title="Click to see who's submitted and who's pending"
        >
          <span className="text-success">{submittedCount} submitted</span>
          <span className="text-ink-light/50 dark:text-ink-dark/50">{pendingCount} pending</span>
          <ChevronDown size={14} className={`text-ink-light/40 transition-transform ${showStatusDetail ? 'rotate-180' : ''}`} />
        </button>

        {showStatusDetail && (
          <div className="mt-3 space-y-1.5 border-t border-primary-50 pt-3 dark:border-primary-900/50">
            {assignmentDetail === null ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              assignmentDetail.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <span>
                    {a.reviewer_first_name} {a.reviewer_last_name}
                    <span className="ml-2 text-xs text-ink-light/40 dark:text-ink-dark/40">
                      reviewing {a.subject_first_name} {a.subject_last_name}
                    </span>
                  </span>
                  {a.status === 'submitted' ? (
                    <Badge tone="success">Submitted</Badge>
                  ) : (
                    <button
                      onClick={() => handleRemind(a.id)}
                      disabled={reminding === a.id}
                      className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-300"
                    >
                      {reminding === a.id ? 'Sending…' : 'Remind'}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
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
        message="Reviewers will no longer be able to submit feedback for this round. You can still curate and release summaries afterward, and reactivate the round later if needed."
        confirmLabel="Close round"
      />

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit round">
        <div className="space-y-3">
          <div>
            <label className="label">Round name</label>
            <input value={editNameInput} onChange={(e) => setEditNameInput(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">End date</label>
            <input
              type="date"
              value={editEndDateInput}
              onChange={(e) => setEditEndDateInput(e.target.value)}
              className="input"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-secondary text-sm" onClick={() => setEditOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary text-sm" onClick={handleUpdateRound} disabled={!editNameInput.trim()}>
              Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SubjectCuration({ round, subject, onBack }) {
  const { showToast } = useToast();
  const [rawFeedback, setRawFeedback] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [summary, setSummary] = useState(null);
  const [summaryText, setSummaryText] = useState('');
  const [saving, setSaving] = useState(false);
  const [releasing, setReleasing] = useState(false);
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

  function handleGenerateSummary() {
    const draft = generateStructuredSummary(breakdown, subject.first_name);
    if (!draft) {
      showToast('No submitted feedback yet to summarize.', 'error');
      return;
    }
    setSummaryText(draft);
    showToast('Draft generated — review and edit before sending');
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
        <h4 className="mb-3 font-display text-sm font-semibold">
          Feedback breakdown ({breakdown?.reviewerCount ?? 0} peer{breakdown?.reviewerCount === 1 ? '' : 's'})
        </h4>

        {breakdown === null ? (
          <Skeleton className="h-32 w-full" />
        ) : breakdown.reviewerCount === 0 ? (
          <p className="text-sm text-ink-light/50 dark:text-ink-dark/50">No submitted feedback yet.</p>
        ) : (
          <>
            <p className="mb-2 text-xs font-medium text-ink-light/50 dark:text-ink-dark/50">
              Individual reviewer feedback
            </p>

            {rawFeedback && (
              <div className="space-y-2">
                {rawFeedback.map((f) => (
                  <div key={f.id} className="rounded-md bg-primary-50/50 p-3 text-sm dark:bg-primary-900/20">
                    <p className="mb-3 font-medium text-gray-900 dark:text-ink-dark">
                      {f.reviewer_first_name} {f.reviewer_last_name}
                    </p>
                    <div className="space-y-4">
                      {schema &&
                        f.category_scores &&
                        schema.categories.map((c, i) => {
                          const entry = f.category_scores[c.key];
                          if (!entry?.score) return null;
                          const levelLabel = schema.likertScale.find((l) => l.value === entry.score)?.label || entry.score;
                          return (
                            <div key={c.key} className={i > 0 ? 'border-t border-primary-100 pt-3 dark:border-primary-900/50' : ''}>
                              <p className="font-medium text-gray-900 dark:text-ink-dark">{c.label}</p>
                              <p className="mt-0.5 text-ink-light/70 dark:text-ink-dark/70">{categoryStatement(c)}</p>
                              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                                <Check size={12} /> {levelLabel}
                              </span>
                              {entry.comment && (
                                <p className="mt-1.5 text-xs italic text-ink-light/60 dark:text-ink-dark/60">"{entry.comment}"</p>
                              )}
                            </div>
                          );
                        })}
                      {f.comments && (
                        <div className="border-t border-primary-100 pt-3 dark:border-primary-900/50">
                          <p className="font-medium text-gray-900 dark:text-ink-dark">Final thoughts</p>
                          <p className="mt-0.5 text-ink-light/70 dark:text-ink-dark/70">"{f.comments}"</p>
                        </div>
                      )}
                      {f.strengths && <p>Strengths: {f.strengths}</p>}
                      {f.improvement_areas && <p>Areas for improvement: {f.improvement_areas}</p>}
                    </div>
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
            onClick={handleGenerateSummary}
            disabled={!breakdown?.reviewerCount}
            className="btn-secondary text-xs disabled:opacity-40"
            title={
              !breakdown?.reviewerCount
                ? 'No submitted feedback yet to summarize'
                : 'Draft a structured summary from the feedback above'
            }
          >
            <Sparkles size={13} /> Generate Summary
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
  const [overallSummary, setOverallSummary] = useState(null);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState({});
  const [expandedId, setExpandedId] = useState(null);

  async function loadAssignments() {
    try {
      const data = await peerInsightService.listAllMyPendingAssignments();
      setAssignments(asArray(data));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load.');
    }
  }

  useEffect(() => {
    loadAssignments();
    peerInsightService
      .listMyReleasedSummaries()
      .then((data) => setSummaries(asArray(data)))
      .catch(() => setSummaries([]));
    peerInsightService
      .getMyReleasedOverallSummary()
      .then(setOverallSummary)
      .catch(() => setOverallSummary(null));
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
      setAssignments((prev) => asArray(prev).filter((a) => a.id !== assignment.id));
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

        {overallSummary && (
          <div className="mb-4 rounded-card border-l-4 border-accent-600 bg-accent-50/60 p-5 shadow-card dark:bg-accent-900/20">
            <div className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold text-accent-800 dark:text-accent-100">
                <Briefcase size={15} /> Overall — across all your projects
              </p>
              {Date.now() - new Date(overallSummary.released_at).getTime() < 7 * 24 * 60 * 60 * 1000 && (
                <Badge tone="primary">New</Badge>
              )}
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-light/90 dark:text-ink-dark/90">
              {overallSummary.summary_text}
            </p>
            <p className="mt-3 text-xs text-ink-light/40 dark:text-ink-dark/40">
              Shared {new Date(overallSummary.released_at).toLocaleDateString()}
            </p>
          </div>
        )}

        {summaries === null ? (
          <Skeleton className="h-24 w-full" />
        ) : summaries.length === 0 && !overallSummary ? (
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
