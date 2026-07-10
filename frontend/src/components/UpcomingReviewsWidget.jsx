import { differenceInCalendarDays } from 'date-fns';
import { CalendarClock } from 'lucide-react';
import Skeleton from './Skeleton';
import Badge from './Badge';

export default function UpcomingReviewsWidget({ cycles, loading }) {
  return (
    <div className="card card-reviews">
      <h3 className="mb-4 flex items-center gap-2 font-display text-base font-semibold">
        <CalendarClock size={16} className="text-primary-600 dark:text-primary-300" /> Upcoming Reviews
      </h3>
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : cycles.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-light/50 dark:text-ink-dark/50">No active cycles closing soon.</p>
      ) : (
        <ul className="space-y-3">
          {cycles.map((c) => {
            const daysLeft = differenceInCalendarDays(new Date(c.end_date), new Date());
            return (
              <li key={c.id} className="flex items-center justify-between text-sm">
                <span className="font-medium">{c.name}</span>
                <Badge tone={daysLeft <= 3 ? 'danger' : daysLeft <= 7 ? 'warning' : 'primary'}>
                  {daysLeft <= 0 ? 'Closing today' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
                </Badge>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
