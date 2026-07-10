/**
 * express-validator chains for auth routes.
 * Kept separate from routes/controllers so validation rules are easy to
 * find, review, and unit test in isolation.
 */
const { body } = require('express-validator');
const { ALL_ROLES } = require('../config/constants');

const registerValidator = [
  body('employeeCode').trim().notEmpty().withMessage('Employee code is required'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
  body('role').isIn(ALL_ROLES).withMessage(`Role must be one of: ${ALL_ROLES.join(', ')}`),
  body('jobTitle').optional().trim(),
  body('department').optional().trim(),
  body('managerId').optional({ nullable: true }).isUUID().withMessage('managerId must be a valid UUID'),
  body('dateOfJoining').optional({ nullable: true }).isISO8601().withMessage('dateOfJoining must be a valid date'),
];

const loginValidator = [
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const refreshValidator = [
  body('refreshToken').notEmpty().withMessage('refreshToken is required'),
];

const changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/\d/)
    .withMessage('New password must contain at least one number'),
];

const forgotPasswordValidator = [
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
];

const resetPasswordValidator = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/\d/)
    .withMessage('New password must contain at least one number'),
];

// Item 5: OTP flow validators
const forgotPasswordOtpValidator = [
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
];

const verifyResetOtpValidator = [
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('Code must be 6 digits').isNumeric(),
];

const resetPasswordOtpValidator = [
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('Code must be 6 digits').isNumeric(),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/\d/)
    .withMessage('New password must contain at least one number'),
];

module.exports = {
  registerValidator,
  loginValidator,
  refreshValidator,
  changePasswordValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  forgotPasswordOtpValidator,
  verifyResetOtpValidator,
  resetPasswordOtpValidator,
};
