/**
 * Auth controller — thin HTTP layer over authService.
 * No business logic here; just request/response shaping.
 */
const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/authService');
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
  const { user, accessToken, refreshToken } = await authService.login(email, password);
  res.json({
    success: true,
    message: 'Login successful',
    data: { user, accessToken, refreshToken },
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
  res.json({ success: true, message: 'Logged out successfully' });
});

const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user.id, currentPassword, newPassword, getRequestMeta(req));
  res.json({ success: true, message: 'Password changed successfully. Please log in again.' });
});

// POST /api/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  await authService.requestPasswordReset(req.body.email);
  // Always the same response, regardless of whether the email exists.
  res.json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' });
});

// POST /api/auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  await authService.resetPassword(token, newPassword, getRequestMeta(req));
  res.json({ success: true, message: 'Password reset successfully. Please log in with your new password.' });
});

// POST /api/auth/forgot-password-otp
const forgotPasswordOtp = asyncHandler(async (req, res) => {
  await authService.requestPasswordResetOtp(req.body.email);
  res.json({ success: true, message: 'If an account with that email exists, a 6-digit code has been sent.' });
});

// POST /api/auth/verify-reset-otp
const verifyResetOtp = asyncHandler(async (req, res) => {
  await authService.verifyPasswordResetOtp(req.body.email, req.body.otp);
  res.json({ success: true, message: 'Code verified.' });
});

// POST /api/auth/reset-password-otp
const resetPasswordOtp = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  await authService.resetPasswordWithOtp(email, otp, newPassword, getRequestMeta(req));
  res.json({ success: true, message: 'Password reset successfully. Please log in with your new password.' });
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  me,
  changePassword,
  forgotPassword,
  resetPassword,
  forgotPasswordOtp,
  verifyResetOtp,
  resetPasswordOtp,
};
