import { api, setTokens, clearTokens, getTokens, getActiveStorage } from './api';

export async function login(email, password, rememberMe = true) {
  const { data } = await api.post('/auth/login', { email, password });
  setTokens(data.data, rememberMe);
  getActiveStorage().setItem('user', JSON.stringify(data.data.user));
  return data.data.user;
}

export async function logout() {
  const { refreshToken } = getTokens();
  try {
    await api.post('/auth/logout', { refreshToken });
  } finally {
    clearTokens();
  }
}

export async function fetchMe() {
  const { data } = await api.get('/auth/me');
  getActiveStorage().setItem('user', JSON.stringify(data.data.user));
  return data.data.user;
}

export async function changePassword(currentPassword, newPassword) {
  const { data } = await api.post('/auth/change-password', { currentPassword, newPassword });
  return data;
}

export async function forgotPassword(email) {
  const { data } = await api.post('/auth/forgot-password', { email });
  return data;
}

export async function resetPassword(token, newPassword) {
  const { data } = await api.post('/auth/reset-password', { token, newPassword });
  return data;
}

// Item 5: OTP-based alternative
export async function forgotPasswordOtp(email) {
  const { data } = await api.post('/auth/forgot-password-otp', { email });
  return data;
}

export async function verifyResetOtp(email, otp) {
  const { data } = await api.post('/auth/verify-reset-otp', { email, otp });
  return data;
}

export async function resetPasswordOtp(email, otp, newPassword) {
  const { data } = await api.post('/auth/reset-password-otp', { email, otp, newPassword });
  return data;
}

// Admin-only: provision a new user account.
export async function registerUser(payload) {
  const { data } = await api.post('/auth/register', payload);
  return data.data.user;
}

export function getStoredUser() {
  const raw = getActiveStorage().getItem('user');
  return raw ? JSON.parse(raw) : null;
}
