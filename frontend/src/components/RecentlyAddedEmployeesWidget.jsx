import { UserPlus } from 'lucide-react';
import Skeleton from './Skeleton';

export default function RecentlyAddedEmployeesWidget({ employees, loading }) {
  return (
    <div className="card card-reviews">
      <h3 className="mb-4 flex items-center gap-2 font-display text-base font-semibold">
        <UserPlus size={16} className="text-primary-600 dark:text-primary-300" /> Recently Added Employees
      </h3>
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      ) : employees.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-light/50 dark:text-ink-dark/50">No employees yet.</p>
      ) : (
        <ul className="space-y-3">
          {employees.map((e) => (
            <li key={e.id} className="flex items-center gap-3 text-sm">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 dark:bg-primary-900 dark:text-primary-100">
                {e.first_name?.[0]}
                {e.last_name?.[0]}
              </div>
              <div>
                <p className="font-medium">
                  {e.first_name} {e.last_name}
                </p>
                <p className="text-xs text-ink-light/50 dark:text-ink-dark/50">
                  {e.job_title || 'N/A'} {e.department ? `· ${e.department}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
