import { useEffect, useState, Fragment } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, ShieldAlert } from 'lucide-react';
import { usePageTitle } from '../context/PageTitleContext';
import * as activityLogService from '../services/activityLogService';
import Skeleton from '../components/Skeleton';
import Badge from '../components/Badge';

const PAGE_SIZE = 20;

function formatAction(action) {
  return action.replace(/_/g, ' ').toLowerCase();
}

export default function ActivityLog() {
  usePageTitle('Activity Log');

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [distinctActions, setDistinctActions] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { logs: data, total: totalCount } = await activityLogService.getActivityLogs({
        action: actionFilter || undefined,
        entityType: entityTypeFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setLogs(data);
      setTotal(totalCount);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load activity log.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    activityLogService.getDistinctActions().then(setDistinctActions);
  }, []);

  useEffect(() => {
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter, entityTypeFilter, startDate, endDate]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter, entityTypeFilter, startDate, endDate, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="card card-reviews flex items-start gap-3">
        <ShieldAlert size={18} className="mt-0.5 flex-shrink-0 text-primary-600" />
        <p className="text-sm text-ink-light/60 dark:text-ink-dark/60">
          Enterprise audit trail: every profile change, deactivation, and bulk action, with who did it, when,
          from where, and what changed.
        </p>
      </div>

      <div className="card card-reviews">
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <select className="input text-sm" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
            <option value="">All actions</option>
            {distinctActions.map((a) => (
              <option key={a} value={a}>
                {formatAction(a)}
              </option>
            ))}
          </select>
          <select className="input text-sm" value={entityTypeFilter} onChange={(e) => setEntityTypeFilter(e.target.value)}>
            <option value="">All entity types</option>
            <option value="user">User</option>
          </select>
          <input type="date" className="input text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input type="date" className="input text-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

        {error && (
          <div className="mb-3 flex items-center gap-2 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-light/50 dark:text-ink-dark/50">No activity matches these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-primary-100 text-xs uppercase tracking-wide text-ink-light/50 dark:border-primary-900 dark:text-ink-dark/50">
                  <th className="py-2 pr-3">User</th>
                  <th className="py-2 pr-3">Action</th>
                  <th className="py-2 pr-3">Entity</th>
                  <th className="py-2 pr-3">IP Address</th>
                  <th className="py-2 pr-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <Fragment key={log.id}>
                    <tr
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                      className="cursor-pointer border-b border-primary-50 hover:bg-primary-50/50 dark:border-primary-900/50 dark:hover:bg-primary-900/30"
                    >
                      <td className="py-2 pr-3">{log.actor_first_name ? `${log.actor_first_name} ${log.actor_last_name}` : 'System'}</td>
                      <td className="py-2 pr-3">
                        <Badge tone="primary">{formatAction(log.action)}</Badge>
                      </td>
                      <td className="py-2 pr-3 capitalize">{log.entity_type || 'N/A'}</td>
                      <td className="data-mono py-2 pr-3 text-xs">{log.ip_address || 'N/A'}</td>
                      <td className="py-2 pr-3 text-xs">{new Date(log.created_at).toLocaleString()}</td>
                    </tr>
                    {expandedId === log.id && (log.old_value || log.new_value || log.user_agent) && (
                      <tr className="bg-primary-50/30 dark:bg-primary-900/20">
                        <td colSpan={5} className="px-3 py-3 text-xs">
                          {log.user_agent && (
                            <p className="mb-1 text-ink-light/50 dark:text-ink-dark/50">Browser: {log.user_agent}</p>
                          )}
                          {log.old_value && (
                            <p>
                              <span className="font-semibold">Before:</span> {JSON.stringify(log.old_value)}
                            </p>
                          )}
                          {log.new_value && (
                            <p>
                              <span className="font-semibold">After:</span> {JSON.stringify(log.new_value)}
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-primary-50 pt-3 text-xs dark:border-primary-900/50">
          <span className="text-ink-light/50 dark:text-ink-dark/50">
            {total === 0 ? '0 results' : `${page * PAGE_SIZE + 1}-${Math.min((page + 1) * PAGE_SIZE, total)} of ${total}`}
          </span>
          <div className="flex gap-1">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded-md p-1.5 hover:bg-primary-50 disabled:opacity-30 dark:hover:bg-primary-900/40"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="rounded-md p-1.5 hover:bg-primary-50 disabled:opacity-30 dark:hover:bg-primary-900/40"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
