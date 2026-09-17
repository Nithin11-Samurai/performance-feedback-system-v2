/**
 * Auth service — business logic, separate from the controller so it can be
 * reused (e.g. by the seed script or admin "create user" flow) and unit
 * tested without spinning up Express.
 */
const userModel = require('../models/userModel');
const refreshTokenModel = require('../models/refreshTokenModel');
const { hashPassword, comparePassword } = require('../utils/password');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require('../utils/jwt');
const AppError = require('../utils/AppError');
const config = require('../config/env');

// Converts a JWT "expiresIn" style string (e.g. '7d', '8h') into a Date.
function expiryToDate(expiresIn) {
  const match = /^(\d+)([smhd])$/.exec(expiresIn);

  if (!match) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // fallback: 7 days
  }

  const value = parseInt(match[1], 10);
  const unitMs = {
    s: 1000,
    m: 60000,
    h: 3600000,
    d: 86400000,
  }[match[2]];

  return new Date(Date.now() + value * unitMs);
}

async function issueTokenPair(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  await refreshTokenModel.store(
    user.id,
    refreshToken,
    expiryToDate(config.jwt.refreshExpiresIn)
  );

  return { accessToken, refreshToken };
}

/**
 * Register a new user. In production this should typically only be
 * callable by Admin/HR (enforced at the route level) — see authRoutes.js.
 */
async function register(payload) {
  const existingEmail = await userModel.findByEmail(payload.email);

  if (existingEmail) {
    throw AppError.conflict('An account with this email already exists');
  }

  const existingCode = await userModel.findByEmployeeCode(payload.employeeCode);

  if (existingCode) {
    throw AppError.conflict('This employee code is already in use');
  }

  const passwordHash = await hashPassword(payload.password);

  const user = await userModel.create({
    employeeCode: payload.employeeCode,
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    passwordHash,
    role: payload.role,
    jobTitle: payload.jobTitle,
    department: payload.department,
    managerId: payload.managerId,
    dateOfJoining: payload.dateOfJoining,
  });

  const tokens = await issueTokenPair(user);

  await sendWelcomeEmail(user);

  return {
    user,
    ...tokens,
  };
}

async function login(email, password) {
  const userWithPassword = await userModel.findByEmail(email);

  if (!userWithPassword) {
    throw AppError.unauthorized('Invalid email or password');
  }

  if (userWithPassword.deleted_at) {
    throw AppError.unauthorized('Invalid email or password');
  }

  if (!userWithPassword.is_active) {
    throw AppError.forbidden('This account has been deactivated. Contact HR.');
  }

  const isMatch = await comparePassword(
    password,
    userWithPassword.password_hash
  );

  if (!isMatch) {
    throw AppError.unauthorized('Invalid email or password');
  }

  // Strip password hash before returning/using downstream.
  const { password_hash, ...user } = userWithPassword;

  const tokens = await issueTokenPair(user);

  return {
    user,
    ...tokens,
  };
}

/**
 * Microsoft SSO login.
 *
 * The frontend obtains a Microsoft Graph access token using MSAL.
 * The backend verifies that token by calling Microsoft Graph /me,
 * then maps the Microsoft account email to an existing employee
 * in the application's users table and issues the same JWT pair
 * used by the normal email/password login.
 */
async function loginWithMicrosoftAccessToken(accessToken) {
  if (!accessToken) {
    throw AppError.unauthorized('Microsoft access token is required');
  }

  let graphResponse;

  try {
    graphResponse = await fetch(
      'https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );
  } catch (err) {
    throw AppError.unauthorized('Unable to verify Microsoft account');
  }

  if (!graphResponse.ok) {
    throw AppError.unauthorized('Invalid or expired Microsoft login');
  }

  const microsoftUser = await graphResponse.json();

  // Prefer "mail"; fall back to "userPrincipalName".
  // Some Microsoft 365 accounts do not populate the "mail" property —
  // and critically, userPrincipalName can be on a DIFFERENT domain than
  // the primary email (common when a tenant's UPN suffix isn't the same
  // as its mail domain, e.g. "...@pinksamurais.onmicrosoft.com" instead
  // of "...@pinksamurais.com"). Logging both raw Graph fields here (not
  // just the one we picked) makes that class of mismatch immediately
  // visible instead of a bare "not registered" with no way to tell why.
  const logger = require('../utils/logger');
  logger.info('Microsoft SSO: resolving account', {
    graphMail: microsoftUser.mail,
    graphUserPrincipalName: microsoftUser.userPrincipalName,
  });

  const email = (
    microsoftUser.mail ||
    microsoftUser.userPrincipalName ||
    ''
  )
    .trim()
    .toLowerCase();

  if (!email) {
    throw AppError.unauthorized(
      'Could not determine Microsoft account email'
    );
  }

  const user = await userModel.findByEmail(email);
  logger.info('Microsoft SSO: lookup result', {
    resolvedEmail: email,
    matchFound: Boolean(user),
  });

  if (!user) {
    throw AppError.unauthorized(
      'Your Microsoft account is not registered in the Performance Feedback System'
    );
  }

  if (user.deleted_at) {
    throw AppError.unauthorized('Your account is no longer active');
  }

  if (!user.is_active) {
    throw AppError.forbidden(
      'This account has been deactivated. Contact HR.'
    );
  }

  const tokens = await issueTokenPair(user);

  return {
    user,
    ...tokens,
  };
}

async function refresh(refreshToken) {
  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (err) {
    throw AppError.unauthorized('Invalid or expired refresh token');
  }

  const valid = await refreshTokenModel.isValid(
    payload.sub,
    refreshToken
  );

  if (!valid) {
    throw AppError.unauthorized(
      'Refresh token has been revoked or is invalid'
    );
  }

  const user = await userModel.findById(payload.sub);

  if (!user || !user.is_active) {
    throw AppError.unauthorized('Account not found or deactivated');
  }

  // Rotate: revoke the old refresh token and issue a brand new pair.
  await refreshTokenModel.revoke(payload.sub, refreshToken);

  const tokens = await issueTokenPair(user);

  return {
    user,
    ...tokens,
  };
}

async function logout(userId, refreshToken) {
  if (refreshToken) {
    await refreshTokenModel.revoke(userId, refreshToken);
  } else {
    await refreshTokenModel.revokeAllForUser(userId);
  }
}

async function changePassword(
  userId,
  currentPassword,
  newPassword,
  requestMeta = {}
) {
  const user = await userModel.findByIdWithPassword(userId);

  if (!user) {
    throw AppError.notFound('User not found');
  }

  const isMatch = await comparePassword(
    currentPassword,
    user.password_hash
  );

  if (!isMatch) {
    throw AppError.badRequest('Current password is incorrect');
  }

  const newHash = await hashPassword(newPassword);

  await userModel.updatePassword(userId, newHash);

  // Force re-login everywhere after a password change.
  await refreshTokenModel.revokeAllForUser(userId);

  const auditLog = require('../utils/auditLog');

  await auditLog.record(
    userId,
    'PASSWORD_CHANGED',
    'user',
    userId,
    { method: 'self-service' },
    requestMeta
  );
}

/**
 * "Forgot password" — request step. Always responds as if successful
 * regardless of whether the email exists, to avoid leaking which emails
 * are registered. The actual email (if the account exists) is sent via
 * the existing emailService, which gracefully no-ops if SMTP isn't
 * configured (logs instead of sending) — same behavior as every other
 * notification in the app.
 */
async function requestPasswordReset(email) {
  const crypto = require('crypto');
  const passwordResetModel = require('../models/passwordResetModel');
  const emailService = require('./emailService');

  const user = await userModel.findByEmail(email);

  if (!user) {
    return; // deliberately silent
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await passwordResetModel.create(
    user.id,
    token,
    expiresAt
  );

  const resetLink = `${config.clientUrl}/reset-password?token=${token}`;

  await emailService.sendMail(
    user.email,
    'Reset your password',
    `<p>Hi ${user.first_name},</p>
     <p>We received a request to reset your password. This link expires in 1 hour:</p>
     <p><a href="${resetLink}">${resetLink}</a></p>
     <p>If you didn't request this, you can safely ignore this email.</p>`
  );
}

/**
 * "Forgot password" — completion step. Validates the token, sets the new
 * password, marks the token used (single-use), and revokes all existing
 * sessions (same as a normal password change).
 */
async function resetPassword(
  token,
  newPassword,
  requestMeta = {}
) {
  const passwordResetModel = require('../models/passwordResetModel');

  const resetToken = await passwordResetModel.findValid(token);

  if (!resetToken) {
    throw AppError.badRequest(
      'This password reset link is invalid or has expired. Please request a new one.'
    );
  }

  const newHash = await hashPassword(newPassword);

  await userModel.updatePassword(
    resetToken.user_id,
    newHash
  );

  await passwordResetModel.markUsed(resetToken.id);

  await refreshTokenModel.revokeAllForUser(
    resetToken.user_id
  );

  const auditLog = require('../utils/auditLog');

  await auditLog.record(
    resetToken.user_id,
    'PASSWORD_CHANGED',
    'user',
    resetToken.user_id,
    { method: 'forgot-password' },
    requestMeta
  );
}

/**
 * Item 5: OTP-based password reset — offered alongside the email-link
 * flow above, so the person can pick whichever they prefer. Same
 * anti-enumeration posture: silent no-op if the email doesn't exist.
 */
async function requestPasswordResetOtp(email) {
  const passwordResetOtpModel = require('../models/passwordResetOtpModel');
  const emailService = require('./emailService');
  const { buildEmailHtml } = require('../utils/emailTemplate');

  const user = await userModel.findByEmail(email);

  if (!user) {
    return; // deliberately silent
  }

  const otp = String(
    Math.floor(100000 + Math.random() * 900000)
  );

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await passwordResetOtpModel.create(
    user.id,
    otp,
    expiresAt
  );

  const html = buildEmailHtml({
    title: 'Your password reset code',
    greeting: `Hi ${user.first_name},`,
    bodyHtml: `<p>Use this code to reset your password. It expires in 10 minutes.</p>
               <p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#ea6bb3;margin:16px 0;">${otp}</p>
               <p>If you didn't request this, you can safely ignore this email.</p>`,
  });

  await emailService.sendMail(
    user.email,
    'Your password reset code',
    html
  );
}

async function verifyPasswordResetOtp(email, otp) {
  const passwordResetOtpModel = require('../models/passwordResetOtpModel');

  const user = await userModel.findByEmail(email);

  if (!user) {
    throw AppError.badRequest(
      'Invalid code. Please check and try again.'
    );
  }

  const record = await passwordResetOtpModel.verifyOtp(
    user.id,
    otp
  );

  if (!record) {
    throw AppError.badRequest(
      'Invalid or expired code. Please check and try again, or request a new one.'
    );
  }

  return {
    userId: user.id,
    otpRecordId: record.id,
  };
}

async function resetPasswordWithOtp(
  email,
  otp,
  newPassword,
  requestMeta = {}
) {
  const passwordResetOtpModel = require('../models/passwordResetOtpModel');

  const { userId, otpRecordId } =
    await verifyPasswordResetOtp(email, otp);

  const newHash = await hashPassword(newPassword);

  await userModel.updatePassword(userId, newHash);

  await passwordResetOtpModel.markUsed(otpRecordId);

  await refreshTokenModel.revokeAllForUser(userId);

  const auditLog = require('../utils/auditLog');

  await auditLog.record(
    userId,
    'PASSWORD_CHANGED',
    'user',
    userId,
    { method: 'forgot-password-otp' },
    requestMeta
  );
}

/**
 * Item 2: sent right after an employee account is created (single create
 * or bulk upload), so the new hire gets a real email with a link to set
 * their own password, instead of relying on HR to communicate a temp
 * password out-of-band. Reuses the same token mechanism as forgot-password
 * (password_reset_tokens), just with a longer expiry and welcome-toned
 * copy — the /reset-password page handles either link identically.
 */
async function sendWelcomeEmail(user) {
  const crypto = require('crypto');
  const passwordResetModel = require('../models/passwordResetModel');
  const emailService = require('./emailService');
  const { buildEmailHtml } = require('../utils/emailTemplate');

  const token = crypto.randomBytes(32).toString('hex');

  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000
  );

  await passwordResetModel.create(
    user.id,
    token,
    expiresAt
  );

  const setupLink =
    `${config.clientUrl}/reset-password?token=${token}`;

  const html = buildEmailHtml({
    title: 'Welcome to the team',
    greeting: `Hi ${user.first_name},`,
    bodyHtml: `<p>An account has been created for you. Click below to set your own password and get started — this link is valid for 7 days.</p>`,
    fields: {
      Email: user.email,
      'Employee Code': user.employee_code,
    },
    ctaLabel: 'Set your password',
    ctaLink: setupLink,
  });

  // Best-effort — a welcome email failing to send shouldn't block the
  // employee record from being created.
  try {
    await emailService.sendMail(
      user.email,
      'Welcome — set up your account',
      html
    );
  } catch (err) {
    const logger = require('../utils/logger');

    logger.error('Failed to send welcome email', {
      userId: user.id,
      error: err.message,
    });
  }
}

module.exports = {
  register,
  login,
  loginWithMicrosoftAccessToken,
  refresh,
  logout,
  changePassword,
  requestPasswordReset,
  resetPassword,
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPasswordWithOtp,
  sendWelcomeEmail,
};