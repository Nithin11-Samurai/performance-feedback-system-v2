import { useEffect, useState, useRef } from 'react';
import { Search, X } from 'lucide-react';
import * as userService from '../services/userService';

/**
 * Debounced employee search + select. Used anywhere an admin needs to pick
 * an employee (1:1 notes, peer assignment, etc). `onSelect` receives the
 * full user object.
 */
export default function EmployeePicker({ onSelect, placeholder = 'Search employees by name or email…', excludeIds = [] }) {
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
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const users = await userService.listUsers({ search: query, limit: 10 });
        setResults(users.filter((u) => !excludeIds.includes(u.id)));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-light/40 dark:text-ink-dark/40" />
        <input
          className="input pl-9 pr-9"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
        />
        {query && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-light/40 hover:text-ink-light/70 dark:text-ink-dark/40"
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && query.trim() && (
        <div className="absolute z-20 mt-1 w-full rounded-card border border-primary-100 bg-surface-light shadow-card dark:border-primary-900 dark:bg-surface-dark">
          {loading ? (
            <p className="px-4 py-3 text-sm text-ink-light/50 dark:text-ink-dark/50">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-ink-light/50 dark:text-ink-dark/50">No matches found.</p>
          ) : (
            results.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  onSelect(u);
                  setQuery('');
                  setResults([]);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-primary-50 dark:hover:bg-primary-900/40"
              >
                <span>
                  {u.first_name} {u.last_name}{' '}
                  <span className="text-ink-light/40 dark:text-ink-dark/40">· {u.email}</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
