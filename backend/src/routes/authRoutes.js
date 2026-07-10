/**
 * Auth routes.
 *
 * NOTE on /register: in an enterprise HR tool, employees don't self-sign-up
 * — accounts are provisioned by Admin/HR. So this route requires an
 * authenticated Admin. The very first Admin account is created by the
 * `npm run seed` script instead (see src/config/seed.js).
 */
const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');
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
const { ROLES, ADMIN_TIER_ROLES } = require('../config/constants');

// Admin/HR only: provision a new employee/manager/admin account.
router.post(
  '/register',
  authenticate,
  authorize(...ADMIN_TIER_ROLES),
  registerValidator,
  validate,
  authController.register
);

router.post('/login', loginValidator, validate, authController.login);
router.post('/refresh', refreshValidator, validate, authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.post(
  '/change-password',
  authenticate,
  changePasswordValidator,
  validate,
  authController.changePassword
);

router.post('/forgot-password', forgotPasswordValidator, validate, authController.forgotPassword);
router.post('/reset-password', resetPasswordValidator, validate, authController.resetPassword);

// Item 5: OTP-based alternative
router.post('/forgot-password-otp', forgotPasswordOtpValidator, validate, authController.forgotPasswordOtp);
router.post('/verify-reset-otp', verifyResetOtpValidator, validate, authController.verifyResetOtp);
router.post('/reset-password-otp', resetPasswordOtpValidator, validate, authController.resetPasswordOtp);

module.exports = router;
