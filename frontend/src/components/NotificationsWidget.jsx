import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Bell } from 'lucide-react';
import * as notificationService from '../services/notificationService';
import Skeleton from './Skeleton';

/**
 * Dashboard-card version of notifications, distinct from the topbar
 * NotificationBell dropdown — reuses the same existing service/endpoint,
 * just a different presentation suited to the dashboard grid.
 */
export default function NotificationsWidget() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationService
      .listNotifications({ limit: 5 })
      .then((data) => setNotifications(data.notifications))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="card card-reviews">
      <h3 className="mb-4 flex items-center gap-2 font-display text-base font-semibold">
        <Bell size={16} className="text-primary-600 dark:text-primary-300" /> Notifications
      </h3>
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-light/50 dark:text-ink-dark/50">You're all caught up.</p>
      ) : (
        <ul className="space-y-3">
          {notifications.map((n) => (
            <li key={n.id} className="text-sm">
              <p className={n.is_read ? 'text-ink-light/70 dark:text-ink-dark/70' : 'font-medium'}>{n.title}</p>
              <p className="text-xs text-ink-light/40 dark:text-ink-dark/40">
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
