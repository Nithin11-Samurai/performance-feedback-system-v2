function getGreetingPeriod() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

/**
 * Greeting is computed from the real system clock and the actual
 * logged-in user's first name (from AuthContext, passed in as a prop) -
 * nothing here is hardcoded or mocked. The illustration is a plain
 * inline SVG (mountain + flag + clouds), not an external image asset.
 */
export default function WelcomeCard({ firstName }) {
  const period = getGreetingPeriod();

  return (
    <div className="relative overflow-hidden rounded-2xl bg-primary-50 px-6 py-5 dark:bg-primary-900/20">
      <div className="relative z-10 max-w-md">
        <p className="text-lg font-semibold text-gray-900 dark:text-ink-dark">
          Good {period}, {firstName}! 👋
        </p>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-ink-dark/60">
          Here's what's happening with your team today.
        </p>
      </div>

      <svg
        viewBox="0 0 320 140"
        className="pointer-events-none absolute bottom-0 right-0 h-full w-64 opacity-90 sm:w-80"
        aria-hidden="true"
      >
        <circle cx="270" cy="35" r="22" fill="#fde9f2" />
        <ellipse cx="60" cy="130" rx="55" ry="14" fill="#fbdcec" />
        <ellipse cx="230" cy="135" rx="45" ry="10" fill="#fbdcec" />
        <path d="M110 140 L180 40 L250 140 Z" fill="#f6b8d9" />
        <path d="M155 140 L200 75 L245 140 Z" fill="#f19cc9" />
        <path d="M180 40 L192 62 L168 62 Z" fill="#fce4f0" />
        <path d="M180 40 L180 15" stroke="#c4126d" strokeWidth="2" />
        <path d="M180 15 L200 21 L180 27 Z" fill="#e83e93" />
      </svg>
    </div>
  );
}
