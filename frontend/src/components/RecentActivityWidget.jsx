import { formatDistanceToNow } from 'date-fns';
import { Activity } from 'lucide-react';
import Skeleton from './Skeleton';

const ACTION_LABELS = {
  UPDATE_USER_PROFILE: 'updated a profile',
  DEACTIVATE_USER: 'deactivated an employee',
  REACTIVATE_USER: 'reactivated an employee',
};

function describeAction(action) {
  return ACTION_LABELS[action] || action.replace(/_/g, ' ').toLowerCase();
}

export default function RecentActivityWidget({ activity, loading }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-primary-900/50 dark:bg-surface-dark">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-ink-dark">
        <Activity size={15} className="text-primary-500" /> Recent activity
      </h3>
      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      ) : activity.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400 dark:text-ink-dark/50">No recent activity.</p>
      ) : (
        <ul>
          {activity.map((a, i) => (
            <li
              key={i}
              className={`flex items-center gap-3 py-3 ${i > 0 ? 'border-t border-gray-100 dark:border-primary-900/40' : ''}`}
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-semibold text-primary-600 dark:bg-primary-900/40 dark:text-primary-300">
                {a.first_name?.[0]}
                {a.last_name?.[0]}
              </div>
              <p className="min-w-0 flex-1 truncate text-sm text-gray-700 dark:text-ink-dark/80">
                <span className="font-medium text-gray-900 dark:text-ink-dark">
                  {a.first_name} {a.last_name}
                </span>{' '}
                {describeAction(a.action)}
              </p>
              <span className="flex-shrink-0 whitespace-nowrap text-xs text-gray-400 dark:text-ink-dark/40">
                {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
