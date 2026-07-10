import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import * as userService from '../services/userService';
import { useAuth } from '../context/AuthContext';
import { ROLES, isAdminTier } from '../utils/roles';

/**
 * Global search across employee name/ID/email/department/manager/role/status
 * (Feature 8). Only shown to Admin/Manager — same scoping as the backend
 * (manager's results are limited to their own team).
 */
export default function GlobalSearchBar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const data = await userService.globalSearch(query);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  if (!isAdminTier(user?.role) && user?.role !== ROLES.MANAGER) return null;

  function goToEmployee(id) {
    setQuery('');
    setResults([]);
    setOpen(false);
    navigate(isAdminTier(user.role) ? '/admin/employees' : '/team', { state: { openEmployeeId: id } });
  }

  return (
    <div className="relative hidden sm:block" ref={containerRef}>
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-light/40 dark:text-ink-dark/40" />
        <input
          className="input w-56 pl-9 pr-8 text-sm"
          placeholder="Search employees…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        {query && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-light/40 hover:text-ink-light/70 dark:text-ink-dark/40"
            onClick={() => setQuery('')}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute right-0 z-30 mt-1 w-80 max-w-[85vw] rounded-card border border-primary-100 bg-surface-light shadow-card dark:border-primary-900 dark:bg-surface-dark">
          {loading ? (
            <p className="px-4 py-3 text-sm text-ink-light/50 dark:text-ink-dark/50">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-ink-light/50 dark:text-ink-dark/50">No matches found.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => goToEmployee(r.id)}
                    className="flex w-full flex-col items-start px-4 py-2 text-left text-sm hover:bg-primary-50 dark:hover:bg-primary-900/40"
                  >
                    <span className="font-medium">
                      {r.first_name} {r.last_name}{' '}
                      <span className="font-normal text-ink-light/40 dark:text-ink-dark/40">· {r.employee_code}</span>
                    </span>
                    <span className="text-xs text-ink-light/50 dark:text-ink-dark/50">
                      {r.job_title || r.role} · {r.department || 'N/A'}
                      {r.manager_first_name ? ` · Reports to ${r.manager_first_name} ${r.manager_last_name}` : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
