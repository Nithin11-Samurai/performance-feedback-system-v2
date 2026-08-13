import { differenceInCalendarDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { CalendarClock } from 'lucide-react';
import Skeleton from './Skeleton';
import Badge from './Badge';

export default function UpcomingReviewsWidget({ cycles, loading, viewAllLink }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-primary-900/50 dark:bg-surface-dark">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-ink-dark">
          <CalendarClock size={15} className="text-primary-500" /> Upcoming reviews
        </h3>
        {viewAllLink && (
          <Link to={viewAllLink} className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-300">
            View all
          </Link>
        )}
      </div>
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : cycles.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <svg viewBox="0 0 100 100" className="mx-auto h-32 w-32" aria-hidden="true">
            <rect x="18" y="20" width="64" height="60" rx="10" fill="#fdeef7" />
            <rect x="26" y="32" width="48" height="40" rx="6" fill="#ffffff" />
            <rect x="31" y="12" width="7" height="16" rx="3.5" fill="#ea6bb3" />
            <rect x="62" y="12" width="7" height="16" rx="3.5" fill="#ea6bb3" />
            {[0, 1].map((row) =>
              [0, 1, 2].map((col) => (
                <rect
                  key={`${row}-${col}`}
                  x={34 + col * 13}
                  y={40 + row * 13}
                  width="8"
                  height="8"
                  rx="2"
                  fill="#f6b8d9"
                />
              ))
            )}
            <circle cx="50" cy="82" r="18" fill="#ffffff" stroke="#ea6bb3" strokeWidth="3.5" />
            <path d="M50 72 L50 82 L58 87" stroke="#ea6bb3" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="mt-1 text-sm font-medium text-gray-600 dark:text-ink-dark/70">No upcoming reviews</p>
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
