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
  const [topRated, setTopRated] = useState(null);

  useEffect(() => {
    if (showReviews) {
      reviewService.listCycles().then(setCycles);
    } else {
      peerInsightService.listGroups().then(setPeerGroups);
      peerInsightService.getRatingDistribution().then(setRatingDistribution);
      peerInsightService
        .getTopRatedEmployees(5)
        .then(setTopRated)
        .catch(() => setTopRated([]));
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
            {ratingDistribution === null ? (
              <p className="text-sm text-gray-500 dark:text-ink-dark/60">Loading…</p>
            ) : (
              <>
                <p className="text-sm text-gray-500 dark:text-ink-dark/60">
                  {peerGroups === null
                    ? ''
                    : peerGroups.length === 0
                      ? 'No project groups created yet.'
                      : `${peerGroups.length} project group${peerGroups.length === 1 ? '' : 's'} running anonymous 360° feedback.`}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-primary-50/60 p-3 dark:bg-primary-900/20">
                    <p className="text-lg font-semibold text-gray-900 dark:text-ink-dark">
                      {ratingDistribution.totalEmployees}
                      {kpis?.totalEmployees ? (
                        <span className="text-xs font-normal text-ink-light/50 dark:text-ink-dark/50">
                          {' '}
                          / {kpis.totalEmployees}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-ink-light/50 dark:text-ink-dark/50">Employees rated</p>
                  </div>
                  <div className="rounded-xl bg-violet-50 p-3 dark:bg-violet-900/20">
                    <p className="flex items-center gap-1 text-lg font-semibold text-gray-900 dark:text-ink-dark">
                      <Star size={14} className="fill-violet-400 text-violet-400" />
                      {(() => {
                        const withRatings = ratingDistribution.buckets.flatMap((b) => b.employees);
                        if (withRatings.length === 0) return 'N/A';
                        const avg = withRatings.reduce((sum, e) => sum + e.avg_rating, 0) / withRatings.length;
                        return `${avg.toFixed(1)}/5`;
                      })()}
                    </p>
                    <p className="text-xs text-ink-light/50 dark:text-ink-dark/50">Org average rating</p>
                  </div>
                </div>
              </>
            )}
            <Link
              to="/peer-insights"
              className="mt-4 block rounded-full border border-primary-200 py-2 text-center text-sm font-semibold text-primary-600 transition-colors hover:bg-primary-50 dark:border-primary-800 dark:text-primary-300 dark:hover:bg-primary-900/40"
            >
              View details
            </Link>
          </div>
        )}

        <RecentActivityWidget activity={widgets?.recentActivity || []} loading={loading} />
        {showReviews ? (
          <UpcomingReviewsWidget cycles={widgets?.upcomingReviews || []} loading={loading} viewAllLink="/admin/cycles" />
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-primary-900/50 dark:bg-surface-dark">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-ink-dark">Top Rated Employees</h3>
              <Link to="/peer-insights" className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-300">
                View all
              </Link>
            </div>
            {topRated === null ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="skeleton h-8 w-full" />
                ))}
              </div>
            ) : topRated.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400 dark:text-ink-dark/50">No submitted feedback yet.</p>
            ) : (
              <ul className="space-y-1">
                {topRated.map((e, i) => (
                  <li
                    key={e.id}
                    className={`flex items-center justify-between py-2 ${i > 0 ? 'border-t border-gray-100 dark:border-primary-900/40' : ''}`}
                  >
                    <span className="truncate text-sm font-medium text-gray-800 dark:text-ink-dark">
                      {e.first_name} {e.last_name}
                    </span>
                    <span className="flex-shrink-0 text-sm font-semibold text-primary-600 dark:text-primary-300">
                      {e.avg_rating}/5
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
