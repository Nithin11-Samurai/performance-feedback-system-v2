/**
 * express-validator chains for user/profile management routes.
 */
const { body, query, param } = require('express-validator');
const { ALL_ROLES } = require('../config/constants');

const listUsersValidator = [
  query('role').optional().isIn(ALL_ROLES).withMessage(`role must be one of: ${ALL_ROLES.join(', ')}`),
  query('department').optional().trim(),
  query('search').optional().trim(),
  query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('limit must be between 1 and 200'),
  query('offset').optional().isInt({ min: 0 }).withMessage('offset must be a non-negative integer'),
];

const userIdParamValidator = [param('userId').isUUID().withMessage('userId must be a valid UUID')];

// Full profile update — fields here are only accepted from Admin/HR (enforced
// in the controller); a plain employee hitting this route can only ever
// change avatar_url + personal-contact fields, regardless of what they send
// (see userController.js / userService.js).
const updateUserValidator = [
  ...userIdParamValidator,
  body('employeeCode').optional().trim().notEmpty().withMessage('employeeCode cannot be empty'),
  body('firstName').optional().trim().notEmpty().withMessage('firstName cannot be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('lastName cannot be empty'),
  body('email').optional().trim().isEmail().withMessage('email must be valid').normalizeEmail(),
  body('jobTitle').optional({ nullable: true }).trim(),
  body('department').optional({ nullable: true }).trim(),
  body('managerId').optional({ nullable: true }).isUUID().withMessage('managerId must be a valid UUID'),
  body('dateOfJoining').optional({ nullable: true }).isISO8601().withMessage('dateOfJoining must be a valid date'),
  body('role').optional().isIn(ALL_ROLES).withMessage(`role must be one of: ${ALL_ROLES.join(', ')}`),
  body('isActive').optional().isBoolean().withMessage('isActive must be true or false'),
  body('avatarUrl').optional({ nullable: true }).isURL().withMessage('avatarUrl must be a valid URL'),
  // Feature 6: personal-contact fields, self-editable.
  body('phone').optional({ nullable: true }).trim().isLength({ max: 30 }),
  body('address').optional({ nullable: true }).trim().isLength({ max: 2000 }),
  body('emergencyContactName').optional({ nullable: true }).trim().isLength({ max: 150 }),
  body('emergencyContactPhone').optional({ nullable: true }).trim().isLength({ max: 30 }),
];

// Feature 5: bulk manager assignment.
const bulkAssignValidator = [
  body('employeeIds').isArray({ min: 1 }).withMessage('employeeIds must be a non-empty array'),
  body('employeeIds.*').isUUID().withMessage('Each employeeId must be a valid UUID'),
  body('managerId').optional({ nullable: true }).isUUID().withMessage('managerId must be a valid UUID'),
];

module.exports = { listUsersValidator, userIdParamValidator, updateUserValidator, bulkAssignValidator };
