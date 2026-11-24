import { ClipboardCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useOnboarding } from '../context/OnboardingContext';

const LABELS = { personal: 'personal information', skills: 'skills', certifications: 'certifications' };

/** Reminder shown on every page until the setup is finished (hidden on the wizard itself). */
export default function OnboardingBanner() {
  const { loaded, enabled, status, steps, pending, complete } = useOnboarding();
  const location = useLocation();
  const navigate = useNavigate();

  if (!loaded || !enabled || !status || complete || !status.personalDone || location.pathname === '/onboarding') {
    return null;
  }

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-accent-100 bg-accent-50 px-4 py-3 text-sm text-accent-900 sm:flex-row sm:items-center sm:justify-between dark:border-accent-900/40 dark:bg-accent-900/20 dark:text-accent-100">
      <p className="flex items-start gap-2">
        <ClipboardCheck size={16} className="mt-0.5 flex-shrink-0" />
        <span>
          Finish setting up your profile: {steps.length - pending.length} of {steps.length} steps done. Still to do:{' '}
          {pending.map((p) => LABELS[p]).join(' and ')}.
        </span>
      </p>
      <button className="btn-primary flex-shrink-0 text-xs" onClick={() => navigate('/onboarding')}>
        Continue setup
      </button>
    </div>
  );
}
