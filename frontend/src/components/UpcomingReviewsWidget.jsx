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
        <div className="flex flex-col items-center gap-1 py-4 text-center">
          <svg viewBox="0 0 100 90" className="h-20 w-24" aria-hidden="true">
            <circle cx="20" cy="18" r="10" fill="#fde9f2" />
            <rect x="22" y="14" width="56" height="60" rx="8" fill="#fbdcec" />
            <rect x="30" y="26" width="40" height="38" rx="4" fill="#ffffff" />
            <rect x="36" y="12" width="6" height="12" rx="2" fill="#e83e93" />
            <rect x="58" y="12" width="6" height="12" rx="2" fill="#e83e93" />
            {[0, 1, 2].map((row) =>
              [0, 1, 2, 3].map((col) => (
                <rect
                  key={`${row}-${col}`}
                  x={35 + col * 8}
                  y={34 + row * 8}
                  width="5"
                  height="5"
                  rx="1"
                  fill="#f6b8d9"
                />
              ))
            )}
            <circle cx="70" cy="66" r="14" fill="#ffffff" stroke="#e83e93" strokeWidth="2.5" />
            <path d="M70 58 L70 66 L76 70" stroke="#e83e93" strokeWidth="2.5" fill="none" strokeLinecap="round" />
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
