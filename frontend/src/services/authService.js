import {
  api,
  setTokens,
  clearTokens,
  getTokens,
  getActiveStorage,
} from './api';

export async function login(
  email,
  password,
  rememberMe = true
) {
  const { data } = await api.post('/auth/login', {
    email,
    password,
  });

  setTokens(data.data, rememberMe);

  getActiveStorage().setItem(
    'user',
    JSON.stringify(data.data.user)
  );

  return data.data.user;
}

/**
 * Microsoft Entra / Microsoft 365 SSO login.
 *
 * The Microsoft access token is sent to the backend.
 * The backend validates the Microsoft identity and returns
 * the application's normal access and refresh JWT tokens.
 */
export async function loginWithMicrosoft(
  accessToken,
  rememberMe = true
) {
  if (!accessToken) {
    throw new Error(
      'Microsoft access token was not provided.'
    );
  }

  const { data } = await api.post(
    '/auth/microsoft',
    {
      accessToken,
    }
  );

  setTokens(data.data, rememberMe);

  getActiveStorage().setItem(
    'user',
    JSON.stringify(data.data.user)
  );

  return data.data.user;
}

export async function logout() {
  const { refreshToken } = getTokens();

  try {
    await api.post('/auth/logout', {
      refreshToken,
    });
  } finally {
    clearTokens();
    getActiveStorage().removeItem('user');
  }
}

export async function fetchMe() {
  const { data } = await api.get('/auth/me');

  getActiveStorage().setItem(
    'user',
    JSON.stringify(data.data.user)
  );

  return data.data.user;
}

export async function changePassword(
  currentPassword,
  newPassword
) {
  const { data } = await api.post(
    '/auth/change-password',
    {
      currentPassword,
      newPassword,
    }
  );

  return data;
}

export async function forgotPassword(email) {
  const { data } = await api.post(
    '/auth/forgot-password',
    {
      email,
    }
  );

  return data;
}

export async function resetPassword(
  token,
  newPassword
) {
  const { data } = await api.post(
    '/auth/reset-password',
    {
      token,
      newPassword,
    }
  );

  return data;
}

// Item 5: OTP-based alternative

export async function forgotPasswordOtp(email) {
  const { data } = await api.post(
    '/auth/forgot-password-otp',
    {
      email,
    }
  );

  return data;
}

export async function verifyResetOtp(
  email,
  otp
) {
  const { data } = await api.post(
    '/auth/verify-reset-otp',
    {
      email,
      otp,
    }
  );

  return data;
}

export async function resetPasswordOtp(
  email,
  otp,
  newPassword
) {
  const { data } = await api.post(
    '/auth/reset-password-otp',
    {
      email,
      otp,
      newPassword,
    }
  );

  return data;
}

// Admin-only: provision a new user account.

export async function registerUser(payload) {
  const { data } = await api.post(
    '/auth/register',
    payload
  );

  return data.data.user;
}

// Backend-driven SSO (replaces the earlier browser-only popup/redirect
// approach — see ssoService.js on the backend for why).

// Whether the login page should show the "Sign in with Microsoft" button
// at all. Checked at runtime, not a build-time env var, so turning SSO
// on/off on the backend doesn't require a frontend rebuild.
export async function getSsoStatus() {
  try {
    const { data } = await api.get('/auth/sso/status');
    return Boolean(data.data.enabled);
  } catch {
    // If the check itself fails, fail closed — hide the button rather
    // than show one that won't work.
    return false;
  }
}

// The /sso-callback page calls this with the one-time exchange code to
// get real tokens back, same shape as a password login.
export async function completeSso(exchangeCode) {
  const { data } = await api.post('/auth/sso/exchange', { code: exchangeCode });
  // SSO has no "remember me" checkbox of its own — default to a
  // persistent session, matching how corporate SSO normally behaves.
  setTokens(data.data, true);
  getActiveStorage().setItem('user', JSON.stringify(data.data.user));
  return data.data.user;
}

export function getStoredUser() {
  const raw =
    getActiveStorage().getItem('user');

  return raw ? JSON.parse(raw) : null;
}