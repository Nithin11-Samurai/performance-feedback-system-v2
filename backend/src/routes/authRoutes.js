const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const {
  authenticate,
  authorize,
} = require('../middleware/auth');

const validate = require('../middleware/validate');

const {
  registerValidator,
  loginValidator,
  refreshValidator,
  changePasswordValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  forgotPasswordOtpValidator,
  verifyResetOtpValidator,
  resetPasswordOtpValidator,
} = require('../validators/authValidators');

const { ADMIN_TIER_ROLES } = require('../config/constants');

// Admin/HR only: provision a new employee/manager/admin account.
router.post(
  '/register',
  authenticate,
  authorize(...ADMIN_TIER_ROLES),
  registerValidator,
  validate,
  authController.register
);

// Email/password login
router.post(
  '/login',
  loginValidator,
  validate,
  authController.login
);

// Microsoft SSO login
router.post(
  '/microsoft',
  authController.loginWithMicrosoft
);

// Refresh JWT
router.post(
  '/refresh',
  refreshValidator,
  validate,
  authController.refresh
);

// Logout
router.post(
  '/logout',
  authenticate,
  authController.logout
);

// Current user
router.get(
  '/me',
  authenticate,
  authController.me
);

// Change password
router.post(
  '/change-password',
  authenticate,
  changePasswordValidator,
  validate,
  authController.changePassword
);

// Forgot password
router.post(
  '/forgot-password',
  forgotPasswordValidator,
  validate,
  authController.forgotPassword
);

// Reset password
router.post(
  '/reset-password',
  resetPasswordValidator,
  validate,
  authController.resetPassword
);

// OTP password reset
router.post(
  '/forgot-password-otp',
  forgotPasswordOtpValidator,
  validate,
  authController.forgotPasswordOtp
);

router.post(
  '/verify-reset-otp',
  verifyResetOtpValidator,
  validate,
  authController.verifyResetOtp
);

router.post(
  '/reset-password-otp',
  resetPasswordOtpValidator,
  validate,
  authController.resetPasswordOtp
);

module.exports = router;