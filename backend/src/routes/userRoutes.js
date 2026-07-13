/**
 * User & profile management routes.
 * Fine-grained "who can do what" is enforced inside userService, since it
 * depends on relationships (is this user my direct report?) that a simple
 * role check can't express. Route-level `authorize()` only blocks the
 * clearly-impossible cases (e.g. a plain employee hitting admin actions).
 */
const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const bulkUploadController = require('../controllers/bulkUploadController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { uploadAvatar, uploadBulkEmployeeSheet } = require('../middleware/upload');
const { listUsersValidator, userIdParamValidator, updateUserValidator, bulkAssignValidator } = require('../validators/userValidators');
const { ROLES, ADMIN_TIER_ROLES } = require('../config/constants');

router.use(authenticate);

// --- Fixed-path routes must come before '/:userId' to avoid being shadowed ---

// Admin: full directory. Manager: their own direct reports.
router.get('/', listUsersValidator, validate, userController.listUsers);

// Dropdown helper for admin forms (assign department, filters, etc).
router.get('/meta/departments', authorize(ROLES.ADMIN, ROLES.MANAGER), userController.listDepartments);

router.get('/me/direct-reports', userController.getMyDirectReports);

// Feature 5: bulk manager (re)assignment — fixed path, admin only.
router.post('/bulk-assign-manager', authorize(...ADMIN_TIER_ROLES), bulkAssignValidator, validate, userController.bulkAssignManager);

router.get('/bulk-template/excel', authorize(...ADMIN_TIER_ROLES), bulkUploadController.downloadTemplate);
router.post('/bulk-upload', authorize(...ADMIN_TIER_ROLES), uploadBulkEmployeeSheet, bulkUploadController.bulkUpload);

// Feature 8: global search — fixed path, admin/manager only (enforced in service).
router.get('/search/global', userController.globalSearch);

// Item 5: Recently Deleted list — fixed path, HR Manager/Global Admin only.
router.get('/deleted', authorize(ROLES.HR_MANAGER, ROLES.GLOBAL_ADMIN), userController.listDeletedEmployees);

// --- Parameterized routes ---

router.get('/:userId/direct-reports', userIdParamValidator, validate, userController.getDirectReportsOf);

// Feature 7: employee timeline (visibility mirrors profile visibility).
router.get('/:userId/timeline', userIdParamValidator, validate, userController.getTimeline);

router.get('/:userId', userIdParamValidator, validate, userController.getUser);

router.patch('/:userId', updateUserValidator, validate, userController.updateUser);

router.patch(
  '/:userId/deactivate',
  authorize(...ADMIN_TIER_ROLES),
  userIdParamValidator,
  validate,
  userController.deactivateUser
);

router.patch(
  '/:userId/reactivate',
  authorize(...ADMIN_TIER_ROLES),
  userIdParamValidator,
  validate,
  userController.reactivateUser
);

// Item 5: soft delete + restore — narrower than Admin-tier, HR
// Manager/Global Admin only, per the request.
router.delete(
  '/:userId',
  authorize(ROLES.HR_MANAGER, ROLES.GLOBAL_ADMIN),
  userIdParamValidator,
  validate,
  userController.deleteEmployee
);

router.patch(
  '/:userId/restore',
  authorize(ROLES.HR_MANAGER, ROLES.GLOBAL_ADMIN),
  userIdParamValidator,
  validate,
  userController.restoreEmployee
);

router.post(
  '/:userId/avatar',
  userIdParamValidator,
  validate,
  uploadAvatar,
  userController.uploadAvatar
);

router.delete('/:userId/avatar', userIdParamValidator, validate, userController.removeAvatar);

module.exports = router;
