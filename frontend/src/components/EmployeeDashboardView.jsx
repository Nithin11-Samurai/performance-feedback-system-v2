import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ClipboardList, Bell, Users2, AlertCircle, MessageSquareText, Briefcase } from 'lucide-react';
import * as dashboardService from '../services/dashboardService';
import { useFeatureFlags } from '../context/FeatureFlagsContext';
import StatCard from './StatCard';
import NotificationsWidget from './NotificationsWidget';

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
        <ClickableStatCard
          to="/notifications"
          loading={loading}
          icon={Bell}
          label="Unread notifications"
          value={summary?.unreadNotifications ?? 0}
          variant="certs"
        />
      </div>

      {!loading && pendingCount > 0 && (
        <div className="card card-reviews flex items-start gap-3 border-l-4 border-primary-600">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-primary-600" />
          <div className="text-sm text-ink-light/80 dark:text-ink-dark/80">
            {pending.selfReviewPending && activeCycle && (
              <p>
                Your self-review for <strong>{activeCycle.name}</strong> is still pending.
              </p>
            )}
            {pending.pending360Count > 0 && (
              <p>
                You have {pending.pending360Count} anonymous peer review{pending.pending360Count === 1 ? '' : 's'} waiting
                in 360° Feedback.
              </p>
            )}
          </div>
        </div>
      )}

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
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-primary-50 p-3 dark:border-primary-900/50"
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

      <NotificationsWidget />
    </div>
  );
}
