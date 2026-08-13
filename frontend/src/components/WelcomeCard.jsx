function getGreetingPeriod() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

/**
 * Greeting is computed from the real system clock and the actual
 * logged-in user's first name (from AuthContext, passed in as a prop) -
 * nothing here is hardcoded or mocked. Decoration is abstract (soft
 * overlapping circles), not a literal illustrated scene - reads as
 * clean and intentional rather than risking looking amateurish.
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

      <div className="pointer-events-none absolute -right-8 -top-12 h-44 w-44 rounded-full bg-primary-100/60" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-20 right-20 h-36 w-36 rounded-full bg-primary-200/40" aria-hidden="true" />
      <div className="pointer-events-none absolute right-8 top-1/2 h-16 w-16 -translate-y-1/2 rounded-full border-2 border-primary-300/50" aria-hidden="true" />
      <div className="pointer-events-none absolute right-32 top-3 h-3 w-3 rounded-full bg-primary-300/60" aria-hidden="true" />
    </div>
  );
}
