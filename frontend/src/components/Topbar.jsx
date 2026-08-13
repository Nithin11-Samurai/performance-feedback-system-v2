import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, User as UserIcon, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';
import GlobalSearchBar from './GlobalSearchBar';

export default function Topbar({ title, onOpenMenu }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [topbarAvatarFailed, setTopbarAvatarFailed] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    setTopbarAvatarFailed(false);
  }, [user?.avatar_url]);

  useEffect(() => {
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <header className="flex h-[72px] items-center justify-between border-b border-primary-100/70 bg-surface-light px-4 dark:border-primary-900/70 dark:bg-surface-dark sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMenu}
          aria-label="Open menu"
          className="rounded-md p-2 text-ink-light/70 hover:bg-primary-50 dark:text-ink-dark/70 dark:hover:bg-primary-900/40 md:hidden"
        >
          <Menu size={20} />
        </button>
        <h1 className="font-display text-lg font-semibold sm:text-xl">{title}</h1>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <GlobalSearchBar />
        <ThemeToggle />
        <NotificationBell />

        <div className="relative ml-1 sm:ml-2" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-full px-1.5 py-1 hover:bg-primary-50 dark:hover:bg-primary-900/40"
          >
            {user?.avatar_url && !topbarAvatarFailed ? (
              <img
                src={
                  user.avatar_url.startsWith('http')
                    ? user.avatar_url
                    : `${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '')}${user.avatar_url}`
                }
                alt=""
                className="h-9 w-9 rounded-full object-cover"
                onError={() => setTopbarAvatarFailed(true)}
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 dark:bg-primary-900 dark:text-primary-100">
                {user?.first_name?.[0]}
                {user?.last_name?.[0]}
              </div>
            )}
            <span className="hidden text-left sm:block">
              <p className="text-sm font-medium leading-tight text-gray-800 dark:text-ink-dark">
                {user?.first_name} {user?.last_name}
              </p>
            </span>
            <ChevronDown size={16} className="hidden text-ink-light/40 dark:text-ink-dark/40 sm:block" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 z-20 mt-2 w-48 rounded-card border border-primary-100 bg-surface-light py-1 shadow-card dark:border-primary-900 dark:bg-surface-dark">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/profile');
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-primary-50 dark:hover:bg-primary-900/40"
              >
                <UserIcon size={15} /> My Profile
              </button>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-danger hover:bg-danger/10"
              >
                <LogOut size={15} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
