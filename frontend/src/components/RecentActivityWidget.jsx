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
    <div className="card card-reviews">
      <h3 className="mb-4 flex items-center gap-2 font-display text-base font-semibold">
        <Activity size={16} className="text-primary-600 dark:text-primary-300" /> Recent Activity
      </h3>
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      ) : activity.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-light/50 dark:text-ink-dark/50">No recent activity.</p>
      ) : (
        <ul className="space-y-3">
          {activity.map((a, i) => (
            <li key={i} className="flex items-start justify-between gap-3 text-sm">
              <span>
                <strong>
                  {a.first_name} {a.last_name}
                </strong>{' '}
                {describeAction(a.action)}
              </span>
              <span className="flex-shrink-0 text-xs text-ink-light/40 dark:text-ink-dark/40">
                {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
