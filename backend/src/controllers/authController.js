/**
 * Auth controller — thin HTTP layer over authService.
 * No business logic here; just request/response shaping.
 */
const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/authService');
const ssoService = require('../services/ssoService');
const config = require('../config/env');
const { getRequestMeta } = require('../utils/requestMeta');

const register = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.register(req.body);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: { user, accessToken, refreshToken },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { user, accessToken, refreshToken } =
    await authService.login(email, password);

  res.json({
    success: true,
    message: 'Login successful',
    data: { user, accessToken, refreshToken },
  });
});

/**
 * Microsoft SSO login.
 *
 * Frontend obtains a Microsoft Graph access token through MSAL
 * and sends it here. The auth service verifies the token with
 * Microsoft Graph, finds the matching application user, and
 * returns the application's normal JWT access/refresh tokens.
 */
const loginWithMicrosoft = asyncHandler(async (req, res) => {
  const { accessToken } = req.body;

  const { user, accessToken: appAccessToken, refreshToken } =
    await authService.loginWithMicrosoftAccessToken(accessToken);

  res.json({
    success: true,
    message: 'Microsoft login successful',
    data: {
      user,
      accessToken: appAccessToken,
      refreshToken,
    },
  });
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  const result = await authService.refresh(refreshToken);

  res.json({
    success: true,
    message: 'Token refreshed',
    data: result,
  });
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user.id, req.body.refreshToken);

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

const me = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: { user: req.user },
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  await authService.changePassword(
    req.user.id,
    currentPassword,
    newPassword,
    getRequestMeta(req)
  );

  res.json({
    success: true,
    message: 'Password changed successfully. Please log in again.',
  });
});

// POST /api/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  await authService.requestPasswordReset(req.body.email);

  // Always the same response, regardless of whether the email exists.
  res.json({
    success: true,
    message:
      'If an account with that email exists, a reset link has been sent.',
  });
});

// POST /api/auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  await authService.resetPassword(
    token,
    newPassword,
    getRequestMeta(req)
  );

  res.json({
    success: true,
    message:
      'Password reset successfully. Please log in with your new password.',
  });
});

// POST /api/auth/forgot-password-otp
const forgotPasswordOtp = asyncHandler(async (req, res) => {
  await authService.requestPasswordResetOtp(req.body.email);

  res.json({
    success: true,
    message:
      'If an account with that email exists, a 6-digit code has been sent.',
  });
});

// POST /api/auth/verify-reset-otp
const verifyResetOtp = asyncHandler(async (req, res) => {
  await authService.verifyPasswordResetOtp(
    req.body.email,
    req.body.otp
  );

  res.json({
    success: true,
    message: 'Code verified.',
  });
});

// POST /api/auth/reset-password-otp
const resetPasswordOtp = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  await authService.resetPasswordWithOtp(
    email,
    otp,
    newPassword,
    getRequestMeta(req)
  );

  res.json({
    success: true,
    message:
      'Password reset successfully. Please log in with your new password.',
  });
});

// ---------------------------------------------------------
// Backend-driven Microsoft SSO (see ssoService.js for why this
// replaced the earlier browser-only popup/redirect approach)
// ---------------------------------------------------------

// GET /api/auth/sso/status — lets the login page know whether to show the
// "Sign in with Microsoft" button, without needing a frontend rebuild
// whenever SSO gets configured or reconfigured on the backend.
const ssoStatus = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { enabled: config.entra.isConfigured } });
});

// GET /api/auth/sso/login — full-page redirect to Microsoft. Not
// asyncHandler-wrapped for its error path: this is a browser navigation,
// not an XHR call, so a JSON error response would just render as a raw
// JSON page instead of something the person can act on.
const ssoLogin = async (req, res) => {
  if (!config.entra.isConfigured) {
    return res.redirect(`${config.clientUrl}/login?error=sso_not_configured`);
  }
  try {
    const redirectTo = typeof req.query.redirect === 'string' ? req.query.redirect : '';
    const authUrl = await ssoService.getAuthUrl(redirectTo);
    res.redirect(authUrl);
  } catch (err) {
    res.redirect(`${config.clientUrl}/login?error=sso_failed`);
  }
};

// GET /api/auth/sso/callback — Microsoft redirects here after sign-in.
// Exchanges the code server-side, then bounces the browser to the
// frontend with a short-lived one-time code (see ssoExchangeStore.js)
// rather than putting real tokens in a URL.
const ssoCallback = async (req, res) => {
  const { code, error, state } = req.query;
  if (error) {
    return res.redirect(`${config.clientUrl}/login?error=sso_failed`);
  }
  try {
    const exchangeCode = await ssoService.handleCallback(code);
    const redirectParam = state ? `&redirect=${encodeURIComponent(state)}` : '';
    res.redirect(`${config.clientUrl}/sso-callback?code=${exchangeCode}${redirectParam}`);
  } catch (err) {
    const reason = err.statusCode === 403 ? 'sso_no_account' : 'sso_failed';
    res.redirect(`${config.clientUrl}/login?error=${reason}`);
  }
};

// POST /api/auth/sso/exchange — the frontend's /sso-callback page calls
// this immediately with the one-time code to get real tokens back as
// JSON, same shape as a normal /auth/login response.
const ssoExchange = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const { user, accessToken, refreshToken } = ssoService.exchangeCode(code);
  res.json({
    success: true,
    message: 'Login successful',
    data: { user, accessToken, refreshToken },
  });
});

module.exports = {
  register,
  login,
  loginWithMicrosoft,
  refresh,
  logout,
  me,
  changePassword,
  forgotPassword,
  resetPassword,
  forgotPasswordOtp,
  verifyResetOtp,
  resetPasswordOtp,
  ssoStatus,
  ssoLogin,
  ssoCallback,
  ssoExchange,
};