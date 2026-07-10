import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import * as notificationService from '../services/notificationService';

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef(null);

  async function load() {
    try {
      const { notifications: list, unreadCount: count } = await notificationService.listNotifications({ limit: 10 });
      setNotifications(list);
      setUnreadCount(count);
    } catch {
      // Silently ignore — the bell just won't update this cycle.
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleMarkAllRead() {
    await notificationService.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  async function handleItemClick(notification) {
    if (!notification.is_read) {
      await notificationService.markNotificationRead(notification.id);
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (notification.link) {
      navigate(notification.link);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative rounded-md p-2 text-ink-light/70 hover:bg-primary-50 dark:text-ink-dark/70 dark:hover:bg-primary-900/40 transition-colors"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 max-w-[85vw] rounded-card border border-primary-100 bg-surface-light shadow-card dark:border-primary-900 dark:bg-surface-dark">
          <div className="flex items-center justify-between border-b border-primary-100 px-4 py-3 dark:border-primary-900">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-primary-600 hover:underline dark:text-primary-300">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-ink-light/50 dark:text-ink-dark/50">
                Nothing here yet.
              </p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`block w-full border-b border-primary-50 px-4 py-3 text-left text-sm last:border-0 hover:bg-primary-50/50 dark:border-primary-900/50 dark:hover:bg-primary-900/30 ${
                    !n.is_read ? 'bg-primary-50/40 dark:bg-primary-900/20' : ''
                  }`}
                >
                  <p className="font-medium">{n.title}</p>
                  {n.message && <p className="mt-0.5 text-ink-light/70 dark:text-ink-dark/70">{n.message}</p>}
                  <p className="mt-1 text-xs text-ink-light/40 dark:text-ink-dark/40">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
