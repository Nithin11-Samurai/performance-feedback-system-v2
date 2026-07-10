import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, KeyRound, AlertCircle } from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout';
import * as authService from '../services/authService';

const METHODS = {
  LINK: 'link',
  OTP: 'otp',
};

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [method, setMethod] = useState(METHODS.LINK);
  const [email, setEmail] = useState('');
  const [step, setStep] = useState('request'); // request -> (otp only) verify -> done
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleRequestLink(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await authService.forgotPassword(email);
    } finally {
      setStep('done');
      setSubmitting(false);
    }
  }

  async function handleRequestOtp(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await authService.forgotPasswordOtp(email);
    } finally {
      setStep('verify');
      setSubmitting(false);
    }
  }

  async function handleResendOtp() {
    setSubmitting(true);
    try {
      await authService.forgotPasswordOtp(email);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetWithOtp(e) {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await authService.resetPasswordOtp(email, otp, newPassword);
      setStep('done');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 'done') {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle2 size={32} className="text-success" />
          <h2 className="font-display text-lg font-semibold">
            {method === METHODS.LINK ? 'Check your email' : 'Password reset'}
          </h2>
          <p className="text-sm text-ink-light/60 dark:text-ink-dark/60">
            {method === METHODS.LINK
              ? `If an account exists for ${email}, we've sent a link to reset your password. It expires in 1 hour.`
              : 'Your password has been reset. Redirecting you to login…'}
          </p>
          {method === METHODS.LINK && (
            <Link to="/login" className="btn-secondary mt-2">
              <ArrowLeft size={14} /> Back to login
            </Link>
          )}
        </div>
      </AuthLayout>
    );
  }

  if (step === 'verify') {
    return (
      <AuthLayout>
        <h2 className="mb-1 font-display text-lg font-semibold">Enter your code</h2>
        <p className="mb-6 text-sm text-ink-light/60 dark:text-ink-dark/60">
          We sent a 6-digit code to <strong>{email}</strong>. It expires in 10 minutes.
        </p>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleResetWithOtp} className="space-y-4">
          <div>
            <label className="label">6-digit code</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              className="input text-center text-lg tracking-[0.5em]"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
            />
          </div>
          <div>
            <label className="label">New password</label>
            <input
              type="password"
              required
              minLength={8}
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input
              type="password"
              required
              minLength={8}
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <button type="submit" disabled={submitting || otp.length !== 6} className="btn-primary w-full">
            <KeyRound size={16} /> {submitting ? 'Resetting…' : 'Reset password'}
          </button>
          <button type="button" onClick={handleResendOtp} disabled={submitting} className="w-full text-center text-sm text-primary-600 hover:underline dark:text-primary-300">
            Resend code
          </button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h2 className="mb-1 font-display text-lg font-semibold">Forgot your password?</h2>
      <p className="mb-4 text-sm text-ink-light/60 dark:text-ink-dark/60">Choose how you'd like to reset it.</p>

      <div className="mb-6 flex gap-2">
        <button
          type="button"
          onClick={() => setMethod(METHODS.LINK)}
          className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium ${
            method === METHODS.LINK ? 'bg-primary-600 text-white' : 'bg-primary-50 text-primary-800 dark:bg-primary-900/40 dark:text-primary-100'
          }`}
        >
          Email link
        </button>
        <button
          type="button"
          onClick={() => setMethod(METHODS.OTP)}
          className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium ${
            method === METHODS.OTP ? 'bg-primary-600 text-white' : 'bg-primary-50 text-primary-800 dark:bg-primary-900/40 dark:text-primary-100'
          }`}
        >
          6-digit code
        </button>
      </div>

      <form onSubmit={method === METHODS.LINK ? handleRequestLink : handleRequestOtp} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </div>
        <button type="submit" disabled={submitting} className="btn-primary w-full">
          <Mail size={16} /> {submitting ? 'Sending…' : method === METHODS.LINK ? 'Send reset link' : 'Send code'}
        </button>
        <Link to="/login" className="flex items-center justify-center gap-1 text-sm text-ink-light/60 hover:underline dark:text-ink-dark/60">
          <ArrowLeft size={14} /> Back to login
        </Link>
      </form>
    </AuthLayout>
  );
}
