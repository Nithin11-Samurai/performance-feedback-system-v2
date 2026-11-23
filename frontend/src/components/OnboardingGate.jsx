import { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useOnboarding } from '../context/OnboardingContext';

const PROMPTED_KEY = 'onboardingPrompted';

/**
 * Wraps the page area of the signed-in layout.
 *  - Contact details are required: until they're filled in, every page sends
 *    the person to the setup wizard.
 *  - Skills / certifications are optional: the wizard opens once per login
 *    session (unless they chose "Finish later"), after which a reminder
 *    banner stays until everything is done.
 */
export default function OnboardingGate({ children }) {
  const { loaded, enabled, status, complete } = useOnboarding();
  const location = useLocation();
  const navigate = useNavigate();

  const onWizard = location.pathname === '/onboarding';
  const active = loaded && enabled && !!status && !complete;
  const promptOnce = active && !onWizard && status.personalDone && !status.dismissed;

  useEffect(() => {
    if (promptOnce && !sessionStorage.getItem(PROMPTED_KEY)) {
      sessionStorage.setItem(PROMPTED_KEY, '1');
      navigate('/onboarding', { replace: true });
    }
  }, [promptOnce, navigate]);

  if (active && !onWizard && !status.personalDone) {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}
