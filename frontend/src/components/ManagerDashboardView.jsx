import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Users, Hourglass, CheckCircle2, Star, AlertCircle } from 'lucide-react';
import * as dashboardService from '../services/dashboardService';
import StatCard from './StatCard';
import RadialProgress from './RadialProgress';
import UpcomingReviewsWidget from './UpcomingReviewsWidget';
import RecentlyAddedEmployeesWidget from './RecentlyAddedEmployeesWidget';
import NotificationsWidget from './NotificationsWidget';

function SectionCard({ title, children }) {
  return (
    <div className="card card-reviews">
      <h3 className="mb-4 font-display text-base font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function EmptyState({ text }) {
  return <p className="py-8 text-center text-sm text-ink-light/50 dark:text-ink-dark/50">{text}</p>;
}

export default function ManagerDashboardView() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    dashboardService
      .getManagerDashboardSummary()
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

  const kpis = summary?.kpis;
  const reviewCompletion = summary?.charts?.reviewCompletion || { submitted: 0, pending: 0 };
  const totalReviews = reviewCompletion.submitted + reviewCompletion.pending;
  const completionPct = totalReviews ? Math.round((reviewCompletion.submitted / totalReviews) * 100) : 0;

  const ratingDistData = [1, 2, 3, 4, 5].map((r) => ({
    rating: `${r}★`,
    count: summary?.charts?.ratingDistribution?.find((x) => x.rating === r)?.count || 0,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard loading={loading} icon={Users} label="Team Size" value={kpis?.teamSize ?? 0} variant="primary" />
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
          label="Average Team Rating"
          value={kpis?.averageRating != null ? `${kpis.averageRating}/5` : 'N/A'}
          variant="primary"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Team review completion">
          <div className="flex justify-center py-2">
            <RadialProgress
              percent={completionPct}
              color="#ea6bb3"
              label="Completed"
              sublabel={`${reviewCompletion.submitted} of ${totalReviews || 0}`}
            />
          </div>
        </SectionCard>

        <SectionCard title="Team rating distribution">
          {loading ? (
            <div className="skeleton h-[220px] w-full" />
          ) : ratingDistData.every((d) => d.count === 0) ? (
            <EmptyState text="No team ratings submitted yet." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ratingDistData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f6c0df" />
                <XAxis dataKey="rating" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="#ea6bb3" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <NotificationsWidget />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <UpcomingReviewsWidget cycles={summary?.widgets?.upcomingReviews || []} loading={loading} />
        <RecentlyAddedEmployeesWidget employees={summary?.widgets?.recentlyAddedEmployees || []} loading={loading} />
      </div>
    </div>
  );
}
