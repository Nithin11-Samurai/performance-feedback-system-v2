import { differenceInCalendarDays } from 'date-fns';
import { CalendarClock, CalendarCheck } from 'lucide-react';
import Skeleton from './Skeleton';
import Badge from './Badge';

export default function UpcomingReviewsWidget({ cycles, loading }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-primary-900/50 dark:bg-surface-dark">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-ink-dark">
        <CalendarClock size={15} className="text-primary-500" /> Upcoming reviews
      </h3>
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : cycles.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <CalendarCheck size={22} className="text-gray-300 dark:text-ink-dark/30" />
          <p className="text-sm font-medium text-gray-600 dark:text-ink-dark/70">No upcoming reviews</p>
          <p className="text-xs text-gray-400 dark:text-ink-dark/40">You're all caught up.</p>
        </div>
      ) : (
        <ul>
          {cycles.map((c, i) => {
            const daysLeft = differenceInCalendarDays(new Date(c.end_date), new Date());
            return (
              <li
                key={c.id}
                className={`flex items-center justify-between gap-3 py-3 ${i > 0 ? 'border-t border-gray-100 dark:border-primary-900/40' : ''}`}
              >
                <span className="truncate text-sm font-medium text-gray-800 dark:text-ink-dark">{c.name}</span>
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
