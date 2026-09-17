import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';
import * as userService from '../services/userService';

/**
 * Debounced employee search + select. Used anywhere an admin needs to pick
 * an employee (1:1 notes, peer assignment, etc). `onSelect` receives the
 * full user object.
 *
 * The results dropdown is rendered through a portal into document.body,
 * positioned with `position: fixed` from the input's own bounding rect.
 * Previously it was a plain `absolute` child of this component's wrapper,
 * which meant any ancestor with `overflow-hidden`/`overflow-auto` (common
 * on cards and inside Modal's scrollable body) clipped it — z-index can't
 * fix that, since clipping happens before stacking order is even
 * considered. Rendering outside the whole DOM subtree via a portal, then
 * anchoring with fixed positioning computed from getBoundingClientRect(),
 * sidesteps every ancestor's overflow/stacking context entirely: the
 * dropdown is a sibling of the ancestor doing the clipping, not a
 * descendant of it.
 */
export default function EmployeePicker({ onSelect, placeholder = 'Search employees by name or email…', excludeIds = [] }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState(null); // { top, left, width } in viewport coordinates
  const wrapperRef = useRef(null); // the input + icon wrapper (still in normal flow)
  const dropdownRef = useRef(null); // the portalled results panel (lives in document.body)

  const updateCoords = useCallback(() => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setCoords({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, []);

  // Recompute position whenever the dropdown opens, and keep it pinned to
  // the input while the page (or any scrollable ancestor) scrolls, or the
  // window resizes. `true` (capture phase) is required to catch scroll
  // events fired on a nested scrollable container — plain `scroll` events
  // don't bubble, but capture-phase listeners on an ancestor still see them.
  useEffect(() => {
    if (!open) return;
    updateCoords();
    window.addEventListener('scroll', updateCoords, true);
    window.addEventListener('resize', updateCoords);
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [open, updateCoords]);

  useEffect(() => {
    function onClickOutside(e) {
      const insideInput = wrapperRef.current && wrapperRef.current.contains(e.target);
      // The portalled dropdown lives outside wrapperRef's DOM subtree (it's
      // appended to document.body), so it needs its own containment check
      // here — otherwise every click inside a result would look like a
      // click "outside" and close the dropdown before onSelect ever fires.
      const insideDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);
      if (!insideInput && !insideDropdown) setOpen(false);
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

  const showDropdown = open && query.trim();

  return (
    <div className="relative" ref={wrapperRef}>
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

      {showDropdown && coords &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{ position: 'fixed', top: coords.top, left: coords.left, width: coords.width }}
            className="z-[100] rounded-card border border-primary-100 bg-surface-light shadow-card dark:border-primary-900 dark:bg-surface-dark"
          >
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
          </div>,
          document.body
        )}
    </div>
  );
}
