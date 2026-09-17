import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout';
import { useAuth } from '../context/AuthContext';

/**
 * Landing page for the backend-driven SSO redirect (see ssoService.js /
 * authController.js on the backend). By the time the browser gets here,
 * the backend has already completed the entire Microsoft token exchange
 * server-side — this page's only job is to swap the short-lived one-time
 * `code` in the URL for real access/refresh tokens (POST
 * /auth/sso/exchange) and continue on to the dashboard, same as a normal
 * password login would.
 */
export default function SsoCallback() {
  const [searchParams] = useSearchParams();
  const { loginWithSso } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  // Effects can run twice in dev (React StrictMode), and the exchange
  // code is single-use — without this guard, the second run would always
  // fail with "expired or already used" right after the first succeeded.
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    const code = searchParams.get('code');
    const redirectTo = searchParams.get('redirect') || '/dashboard';

    if (!code) {
      navigate('/login?error=sso_failed', { replace: true });
      return;
    }

    loginWithSso(code)
      .then(() => navigate(redirectTo, { replace: true }))
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Sign-in failed. Please try again.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthLayout>
      {error ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <AlertCircle size={28} className="text-danger" />
          <p className="text-sm text-ink-light/70 dark:text-ink-dark/70">{error}</p>
          <button onClick={() => navigate('/login', { replace: true })} className="btn-primary mt-2">
            Back to login
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Loader2 size={28} className="animate-spin text-primary-600" />
          <p className="text-sm text-ink-light/60 dark:text-ink-dark/60">Signing you in…</p>
        </div>
      )}
    </AuthLayout>
  );
}
