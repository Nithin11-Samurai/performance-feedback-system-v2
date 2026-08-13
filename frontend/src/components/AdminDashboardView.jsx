import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Hourglass, CheckCircle2, Star, AlertCircle, FileDown, Users2, Briefcase } from 'lucide-react';
import * as dashboardService from '../services/dashboardService';
import * as reviewService from '../services/reviewService';
import * as exportService from '../services/exportService';
import * as peerInsightService from '../services/peerInsightService';
import { useFeatureFlags } from '../context/FeatureFlagsContext';
import StatCard from './StatCard';
import RadialProgress from './RadialProgress';
import RecentActivityWidget from './RecentActivityWidget';
import UpcomingReviewsWidget from './UpcomingReviewsWidget';

/** Wraps StatCard in a Link so clicking a KPI actually takes you to the relevant page. */
function LinkedStatCard({ to, ...statCardProps }) {
  return (
    <Link to={to} className="block text-left transition-transform hover:-translate-y-0.5">
      <StatCard {...statCardProps} />
    </Link>
  );
}

/**
 * Deliberately minimal: 4 KPI cards, one chart, two widgets — everything
 * else (department comparisons, rating distribution, skill/cert
 * breakdowns) already lives in Analytics and Skills and Certifications,
 * so it doesn't need to be duplicated here too.
 *
 * Structured (self-managed) Reviews and Review Cycles aren't rolled out
 * to everyone yet — this dashboard checks the same feature flags Settings
 * uses and shows the review-specific KPIs/cards only when at least one of
 * those flags is actually on for the current user's audience. When
 * neither is on, it shows 360° Feedback data instead of leaving empty
 * gaps, and automatically switches back the moment those flags are
 * enabled — nothing here is hardcoded to "hide reviews forever".
 */
export default function AdminDashboardView() {
  const { isVisible } = useFeatureFlags();
  const showReviews = isVisible('reviews') || isVisible('review_cycles');

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [cycles, setCycles] = useState([]);

  const [peerGroups, setPeerGroups] = useState(null);
  const [ratingDistribution, setRatingDistribution] = useState(null);

  useEffect(() => {
    if (showReviews) {
      reviewService.listCycles().then(setCycles);
    } else {
      peerInsightService.listGroups().then(setPeerGroups);
      peerInsightService.getRatingDistribution().then(setRatingDistribution);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showReviews]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await dashboardService.getAdminDashboardSummary({});
      setSummary(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleExportReport() {
    if (!showReviews) return;
    const targetCycle = cycles[0];
    if (!targetCycle) return;
    try {
      await exportService.exportCycleExcel(targetCycle.id, targetCycle.name);
    } catch (err) {
      setError(err.response?.data?.message || 'Export failed.');
    }
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
        <AlertCircle size={16} /> {error}
      </div>
    );
  }

  const kpis = summary?.kpis;
  const widgets = summary?.widgets;

  const reviewCompletion = summary?.charts?.reviewCompletion || { submitted: 0, pending: 0 };
  const totalReviews = reviewCompletion.submitted + reviewCompletion.pending;
  const completionPct = totalReviews ? Math.round((reviewCompletion.submitted / totalReviews) * 100) : 0;

  return (
    <div className="space-y-5">
      {showReviews && (
        <div className="flex justify-end">
          <button onClick={handleExportReport} disabled={cycles.length === 0} className="btn-secondary text-xs disabled:opacity-40">
            <FileDown size={14} /> Export Report
          </button>
        </div>
      )}

      {/* --- KPI row --- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <LinkedStatCard
          to="/admin/employees"
          loading={loading}
          icon={Users}
          label="Total Employees"
          value={kpis?.totalEmployees ?? 0}
          variant="primary"
        />
        {showReviews ? (
          <>
            <LinkedStatCard
              to="/admin/cycles"
              loading={loading}
              icon={Hourglass}
              label="Pending Reviews"
              value={kpis?.pendingReviews ?? 0}
              variant="notes"
            />
            <LinkedStatCard
              to="/admin/cycles"
              loading={loading}
              icon={CheckCircle2}
              label="Completed Reviews"
              value={kpis?.completedReviews ?? 0}
              variant="certs"
            />
            <LinkedStatCard
              to="/admin/cycles"
              loading={loading}
              icon={Star}
              label="Average Rating"
              value={kpis?.averageRating != null ? `${kpis.averageRating}/5` : 'N/A'}
              variant="rating"
            />
          </>
        ) : (
          <>
            <LinkedStatCard
              to="/peer-insights"
              loading={ratingDistribution === null}
              icon={Users2}
              label="Employees with 360° Feedback"
              value={ratingDistribution?.totalEmployees ?? 0}
              variant="certs"
            />
            <LinkedStatCard
              to="/peer-insights"
              loading={peerGroups === null}
              icon={Briefcase}
              label="Active Project Groups"
              value={peerGroups?.length ?? 0}
              variant="notes"
            />
            <LinkedStatCard
              to="/peer-insights"
              loading={ratingDistribution === null}
              icon={Star}
              label="Highest Rating Bucket"
              value={ratingDistribution?.buckets?.find((b) => b.count > 0)?.rating ? `${ratingDistribution.buckets.find((b) => b.count > 0).rating}/5` : 'N/A'}
              variant="rating"
            />
          </>
        )}
      </div>

      {/* --- Chart + widgets --- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {showReviews ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-primary-900/50 dark:bg-surface-dark">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-ink-dark">Review completion</h3>
            <div className="flex justify-center py-2">
              <RadialProgress
                percent={completionPct}
                color="#E83E93"
                label="Completed"
                sublabel={`${reviewCompletion.submitted} of ${totalReviews || 0}`}
              />
            </div>
            {summary?.targetCycle && (
              <p className="mt-2 text-center text-xs text-gray-400 dark:text-ink-dark/40">{summary.targetCycle.name}</p>
            )}
            <Link
              to="/admin/cycles"
              className="mt-4 block rounded-full border border-primary-200 py-2 text-center text-sm font-semibold text-primary-600 transition-colors hover:bg-primary-50 dark:border-primary-800 dark:text-primary-300 dark:hover:bg-primary-900/40"
            >
              View details
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-primary-900/50 dark:bg-surface-dark">
            <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-ink-dark">360° Feedback overview</h3>
            <p className="text-sm text-gray-500 dark:text-ink-dark/60">
              {peerGroups === null
                ? 'Loading…'
                : peerGroups.length === 0
                  ? 'No project groups created yet.'
                  : `${peerGroups.length} project group${peerGroups.length === 1 ? '' : 's'} running anonymous 360° feedback.`}
            </p>
            <Link
              to="/peer-insights"
              className="mt-4 block rounded-full border border-primary-200 py-2 text-center text-sm font-semibold text-primary-600 transition-colors hover:bg-primary-50 dark:border-primary-800 dark:text-primary-300 dark:hover:bg-primary-900/40"
            >
              View details
            </Link>
          </div>
        )}

        <RecentActivityWidget activity={widgets?.recentActivity || []} loading={loading} />
        {showReviews && (
          <UpcomingReviewsWidget cycles={widgets?.upcomingReviews || []} loading={loading} viewAllLink="/admin/cycles" />
        )}
      </div>
    </div>
  );
}
