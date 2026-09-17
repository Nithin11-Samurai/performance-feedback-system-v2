import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  LogIn,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout';
import { useAuth } from '../context/AuthContext';
import { getSsoStatus } from '../services/authService';
import { API_BASE_URL } from '../services/api';

const SSO_ERROR_MESSAGES = {
  sso_failed: 'Microsoft sign-in failed. Please try again.',
  sso_no_account:
    'No account is linked to this Microsoft sign-in. Contact HR to get set up.',
  sso_not_configured:
    'Microsoft sign-in is not set up yet. Please use your email and password.',
};

export default function Login() {
  const {
    login,
    microsoftError,
    loading: authLoading,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ssoEnabled, setSsoEnabled] = useState(false);

  const redirectTo =
    location.state?.from?.pathname || '/dashboard';

  // Backend-driven SSO redirects failures back here as ?error=...
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ssoError = params.get('error');

    if (ssoError && SSO_ERROR_MESSAGES[ssoError]) {
      setError(SSO_ERROR_MESSAGES[ssoError]);
    }
  }, [location.search]);

  // Ask the backend whether SSO is actually configured before showing
  // the Microsoft button.
  useEffect(() => {
    getSsoStatus().then(setSsoEnabled);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();

    setError('');
    setSubmitting(true);

    try {
      await login(email, password, rememberMe);

      navigate(redirectTo, {
        replace: true,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to log in. Please check your credentials.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Backend-driven SSO:
  // Full-page redirect to the backend, which redirects to Microsoft,
  // then back to /sso-callback with a one-time code.
  // No popup, no MSAL browser SDK.
  function handleMicrosoftSignIn() {
    const url = new URL(
      `${API_BASE_URL}/auth/sso/login`
    );

    url.searchParams.set('redirect', redirectTo);

    window.location.href = url.toString();
  }

  const isSubmitting = submitting || authLoading;

  const displayError = error || microsoftError;

  return (
    <AuthLayout>
      <h2 className="mb-1 font-display text-lg font-semibold">
        Welcome back
      </h2>

      <p className="mb-6 text-sm text-ink-light/60 dark:text-ink-dark/60">
        Sign in with the account provided by your HR team.
      </p>

      {displayError && (
        <div className="mb-4 flex items-start gap-2 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          <AlertCircle
            size={16}
            className="mt-0.5 flex-shrink-0"
          />

          <span>{displayError}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div>
          <label
            className="label"
            htmlFor="email"
          >
            Email
          </label>

          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label
            className="label"
            htmlFor="password"
          >
            Password
          </label>

          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              className="input pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isSubmitting}
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword((s) => !s)
              }
              aria-label={
                showPassword
                  ? 'Hide password'
                  : 'Show password'
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-light/40 hover:text-ink-light/70 dark:text-ink-dark/40"
              disabled={isSubmitting}
            >
              {showPassword ? (
                <EyeOff size={16} />
              ) : (
                <Eye size={16} />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-ink-light/70 dark:text-ink-dark/70">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) =>
                setRememberMe(e.target.checked)
              }
              className="h-4 w-4 rounded border-primary-300 text-primary-600 focus:ring-primary-500"
              disabled={isSubmitting}
            />

            Remember me
          </label>

          <Link
            to="/forgot-password"
            className="text-primary-600 hover:underline dark:text-primary-300"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary flex w-full items-center justify-center gap-2"
        >
          <LogIn size={16} />

          {submitting
            ? 'Signing in…'
            : 'Sign in'}
        </button>
      </form>

      {/* Microsoft SSO - intentionally placed below normal login */}
      {ssoEnabled && (
        <>
          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-ink-light/10 dark:bg-ink-dark/10" />

            <span className="text-xs font-medium uppercase tracking-wide text-ink-light/40 dark:text-ink-dark/40">
              Or
            </span>

            <div className="h-px flex-1 bg-ink-light/10 dark:bg-ink-dark/10" />
          </div>

          <button
            type="button"
            onClick={handleMicrosoftSignIn}
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-3 rounded-md border border-ink-light/15 bg-white px-4 py-2.5 text-sm font-medium text-ink-light shadow-sm transition hover:bg-ink-light/5 disabled:cursor-not-allowed disabled:opacity-60 dark:border-ink-dark/15 dark:bg-ink-dark/5 dark:text-ink-dark dark:hover:bg-ink-dark/10"
          >
            <span className="flex h-5 w-5 items-center justify-center">
              <span className="grid h-4 w-4 grid-cols-2 grid-rows-2 gap-[1px]">
                <span className="bg-[#f25022]" />
                <span className="bg-[#7fba00]" />
                <span className="bg-[#00a4ef]" />
                <span className="bg-[#ffb900]" />
              </span>
            </span>

            <span>Sign in with Microsoft</span>
          </button>

          <div className="mt-3 text-center text-xs text-ink-light/50 dark:text-ink-dark/50">
            Use your company Microsoft 365 account
          </div>
        </>
      )}
    </AuthLayout>
  );
}