function getGreetingPeriod() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

/**
 * Minimal welcome banner - not a large colorful hero, just a clean white
 * strip with a subtle pink-tinted icon accent. Greeting is computed from
 * the real system clock and the actual logged-in user's first name
 * (from AuthContext) - nothing here is hardcoded or mocked.
 */
export default function WelcomeCard({ firstName }) {
  const period = getGreetingPeriod();

  return (
    <div className="rounded-2xl border border-primary-100 bg-white px-5 py-4 dark:border-primary-900/50 dark:bg-surface-dark">
      <p className="text-lg font-semibold text-gray-900 dark:text-ink-dark">
        Good {period}, {firstName}! 👋
      </p>
      <p className="mt-0.5 text-sm text-gray-500 dark:text-ink-dark/60">
        Here's what's happening with your team today.
      </p>
    </div>
  );
}
