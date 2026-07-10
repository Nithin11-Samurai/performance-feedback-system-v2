import logo from '../assets/logo-samurai.png';

export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-paper-light dark:bg-paper-dark">
      {/* Branding panel — hidden on small screens */}
      <div className="relative hidden w-1/2 flex-col items-center justify-center overflow-hidden bg-primary-50 px-12 dark:bg-primary-950 lg:flex">
        <img src={logo} alt="Company logo" className="mb-8 h-40 w-40 object-contain" />
        <h2 className="mb-2 text-center font-display text-2xl font-semibold text-primary-800 dark:text-primary-100">
          Grow, together.
        </h2>
        <p className="max-w-sm text-center text-sm text-primary-700/70 dark:text-primary-200/70">
          Track skills, certifications, and performance reviews all in one place — built for HR teams who'd
          rather spend time coaching people than chasing spreadsheets.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col items-center justify-center px-4 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-center gap-2 lg:hidden">
            <img src={logo} alt="Company logo" className="h-10 w-10 rounded-md object-cover" />
            <span className="font-display text-2xl font-semibold text-primary-800 dark:text-primary-100">
              Performance
            </span>
          </div>
          <div className="card card-reviews">{children}</div>
        </div>
      </div>
    </div>
  );
}
