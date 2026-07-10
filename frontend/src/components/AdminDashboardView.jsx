import { useEffect, useState } from 'react';
import { Users, Hourglass, CheckCircle2, Star, AlertCircle, Filter } from 'lucide-react';
import * as dashboardService from '../services/dashboardService';
import * as catalogService from '../services/catalogService';
import * as reviewService from '../services/reviewService';
import StatCard from './StatCard';
import RadialProgress from './RadialProgress';
import RecentActivityWidget from './RecentActivityWidget';
import UpcomingReviewsWidget from './UpcomingReviewsWidget';

/**
 * Deliberately minimal: 4 KPI cards, one chart, two widgets — everything
 * else (department comparisons, rating distribution, skill/cert
 * breakdowns) already lives in Analytics and Skills and Certifications,
 * so it doesn't need to be duplicated here too. A department + cycle
 * filter lets an admin narrow the numbers without leaving the page.
 */
export default function AdminDashboardView() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [departments, setDepartments] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [department, setDepartment] = useState('');
  const [cycleId, setCycleId] = useState('');

  useEffect(() => {
    catalogService.listDepartments().then((list) => setDepartments(list.map((d) => d.name)));
    reviewService.listCycles().then(setCycles);
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await dashboardService.getAdminDashboardSummary({
        department: department || undefined,
        cycleId: cycleId || undefined,
      });
      setSummary(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [department, cycleId]);

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
    <div className="space-y-6">
      {/* --- Filter bar --- */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-sm text-ink-light/50 dark:text-ink-dark/50">
          <Filter size={14} /> Filter:
        </span>
        <select className="input w-auto text-sm" value={department} onChange={(e) => setDepartment(e.target.value)}>
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select className="input w-auto text-sm" value={cycleId} onChange={(e) => setCycleId(e.target.value)}>
          <option value="">Current cycle</option>
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {(department || cycleId) && (
          <button
            className="text-xs text-primary-600 hover:underline dark:text-primary-300"
            onClick={() => {
              setDepartment('');
              setCycleId('');
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* --- KPI row --- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard loading={loading} icon={Users} label="Total Employees" value={kpis?.totalEmployees ?? 0} variant="primary" />
        <StatCard loading={loading} icon={Hourglass} label="Pending Reviews" value={kpis?.pendingReviews ?? 0} variant="notes" />
        <StatCard
          loading={loading}
          icon={CheckCircle2}
          label="Completed Reviews"
          value={kpis?.completedReviews ?? 0}
          variant="certs"
        />
        <StatCard
          loading={loading}
          icon={Star}
          label="Average Rating"
          value={kpis?.averageRating != null ? `${kpis.averageRating}/5` : 'N/A'}
          variant="primary"
        />
      </div>

      {/* --- Chart + widgets --- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card card-reviews">
          <h3 className="mb-4 font-display text-base font-semibold">Review completion</h3>
          <div className="flex justify-center py-2">
            <RadialProgress
              percent={completionPct}
              color="#ea6bb3"
              label="Completed"
              sublabel={`${reviewCompletion.submitted} of ${totalReviews || 0}`}
            />
          </div>
          {summary?.targetCycle && (
            <p className="mt-2 text-center text-xs text-ink-light/50 dark:text-ink-dark/50">{summary.targetCycle.name}</p>
          )}
        </div>

        <RecentActivityWidget activity={widgets?.recentActivity || []} loading={loading} />
        <UpcomingReviewsWidget cycles={widgets?.upcomingReviews || []} loading={loading} />
      </div>
    </div>
  );
}
