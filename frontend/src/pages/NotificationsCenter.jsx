import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCheck, AlertCircle } from 'lucide-react';
import { usePageTitle } from '../context/PageTitleContext';
import * as notificationService from '../services/notificationService';
import Skeleton from '../components/Skeleton';
import Badge from '../components/Badge';

export default function NotificationsCenter() {
  usePageTitle('Notifications');
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { notifications: list, unreadCount: count } = await notificationService.listNotifications({
        limit: 50,
        unreadOnly: filter === 'unread' ? 'true' : undefined,
      });
      setNotifications(list);
      setUnreadCount(count);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function handleMarkRead(id) {
    await notificationService.markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function handleMarkAllRead() {
    await notificationService.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  async function handleItemClick(n) {
    if (!n.is_read) await handleMarkRead(n.id);
    if (n.link) navigate(n.link);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['all', 'unread'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                filter === f ? 'bg-primary-600 text-white' : 'bg-primary-50 text-primary-800 dark:bg-primary-900/40 dark:text-primary-100'
              }`}
            >
              {f === 'all' ? 'All' : `Unread (${unreadCount})`}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="btn-secondary text-xs">
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="card card-reviews flex flex-col items-center gap-2 py-16 text-center">
          <Bell size={28} className="text-primary-300" />
          <p className="text-sm text-ink-light/50 dark:text-ink-dark/50">
            {filter === 'unread' ? "You're all caught up." : 'No notifications yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleItemClick(n)}
              className={`card card-reviews block w-full text-left transition-colors ${
                !n.is_read ? 'bg-primary-50/40 dark:bg-primary-900/20' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <p className="text-sm font-medium">{n.title}</p>
                    {!n.is_read && <Badge tone="primary">New</Badge>}
                  </div>
                  {n.message && <p className="text-sm text-ink-light/70 dark:text-ink-dark/70">{n.message}</p>}
                </div>
                <span className="flex-shrink-0 text-xs text-ink-light/40 dark:text-ink-dark/40">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
