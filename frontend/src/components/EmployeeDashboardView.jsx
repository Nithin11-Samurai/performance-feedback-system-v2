import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ClipboardList, Users2, AlertCircle, MessageSquareText, Briefcase } from 'lucide-react';
import * as dashboardService from '../services/dashboardService';
import * as peerInsightService from '../services/peerInsightService';
import { useFeatureFlags } from '../context/FeatureFlagsContext';
import StatCard from './StatCard';
import Modal from './Modal';
import Skeleton from './Skeleton';

function SectionCard({ title, children }) {
  return (
    <div className="card card-reviews">
      <h3 className="mb-4 font-display text-base font-semibold">{title}</h3>
      {children}
    </div>
  );
}

/** Wraps StatCard in a clickable button when a destination is given, so pending-item cards actually take you somewhere. */
function ClickableStatCard({ to, ...statCardProps }) {
  const navigate = useNavigate();
  if (!to) return <StatCard {...statCardProps} />;
  return (
    <button onClick={() => navigate(to)} className="text-left transition-transform hover:-translate-y-0.5">
      <StatCard {...statCardProps} />
    </button>
  );
}

export default function EmployeeDashboardView() {
  const { isVisible } = useFeatureFlags();
  const showReviews = isVisible('reviews');

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openProject, setOpenProject] = useState(null);
  const [projectDetail, setProjectDetail] = useState(null);

  async function handleOpenProject(project) {
    setOpenProject(project);
    setProjectDetail(null);
    try {
      const detail = await peerInsightService.getMyProjectDetail(project.id);
      setProjectDetail(detail);
    } catch {
      setProjectDetail({ members: [] });
    }
  }

  useEffect(() => {
    let cancelled = false;
    dashboardService
      .getMyDashboardSummary()
      .then((data) => !cancelled && setSummary(data))
      .catch((err) => !cancelled && setError(err.response?.data?.message || 'Failed to load dashboard data.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
        <AlertCircle size={16} /> {error}
      </div>
    );
  }

  const ratingHistory = summary?.ratingHistory || [];
  const activeCycle = summary?.targetCycle?.status === 'active' ? summary.targetCycle : null;
  const pending = summary?.pendingActions;
  const myProjects = summary?.myProjects || [];

  const pendingCount = (pending?.selfReviewPending ? 1 : 0) + (pending?.pending360Count || 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {showReviews ? (
          <ClickableStatCard
            to="/reviews"
            loading={loading}
            icon={ClipboardList}
            label="Active review cycle"
            value={activeCycle ? activeCycle.name : 'None'}
            variant="reviews"
          />
        ) : (
          <ClickableStatCard
            to="/peer-insights"
            loading={loading}
            icon={MessageSquareText}
            label="Pending 360° Feedback"
            value={pending?.pending360Count || 0}
            variant="reviews"
          />
        )}
        <ClickableStatCard
          to="/peer-insights"
          loading={loading}
          icon={Users2}
          label="Pending action items"
          value={pendingCount}
          variant="skills"
        />
      </div>

      <SectionCard title="My projects">
        {loading ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="skeleton h-14 w-full" />
            ))}
          </div>
        ) : myProjects.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-light/50 dark:text-ink-dark/50">
            You're not part of any 360° Feedback project yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {myProjects.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => handleOpenProject(p)}
                  className="flex w-full items-center gap-3 rounded-xl border-l-[3px] border-primary-400 bg-primary-50/50 p-3 text-left transition-colors hover:bg-primary-50 dark:border-primary-500 dark:bg-primary-900/20 dark:hover:bg-primary-900/30"
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300">
                    <Briefcase size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-ink-dark">{p.name}</p>
                    {p.description && (
                      <p className="truncate text-xs text-gray-400 dark:text-ink-dark/40">{p.description}</p>
                    )}
                  </div>
                  <span className="flex-shrink-0 text-xs text-gray-400 dark:text-ink-dark/40">
                    {p.member_count} member{p.member_count === 1 ? '' : 's'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {showReviews && (
        <SectionCard title="My rating trend over time">
          {loading ? (
            <div className="skeleton h-[220px] w-full" />
          ) : ratingHistory.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-light/50 dark:text-ink-dark/50">
              No rated feedback yet — once managers or peers submit ratings across review cycles, your trend will appear here.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={ratingHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f6c0df" />
                <XAxis dataKey="cycle_name" fontSize={11} />
                <YAxis domain={[0, 5]} fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="avg_rating" stroke="#ea6bb3" strokeWidth={2} dot={{ fill: '#ea6bb3' }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      )}

      <Modal open={!!openProject} onClose={() => setOpenProject(null)} title={openProject?.name || 'Project'}>
        {projectDetail === null ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {projectDetail.description && (
              <p className="mb-3 text-sm text-ink-light/60 dark:text-ink-dark/60">{projectDetail.description}</p>
            )}
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-light/40 dark:text-ink-dark/40">
              Members ({projectDetail.members.length})
            </p>
            {projectDetail.members.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-xl border border-primary-50 p-3 dark:border-primary-900/50"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-semibold text-primary-600 dark:bg-primary-900/40 dark:text-primary-300">
                  {m.first_name?.[0]}
                  {m.last_name?.[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-ink-dark">
                    {m.first_name} {m.last_name}
                  </p>
                  <p className="truncate text-xs text-gray-400 dark:text-ink-dark/40">
                    {m.job_title || 'No title set'}
                    {m.department ? ` · ${m.department}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
