const express = require('express');
const router = express.Router();

const reviewCycleController = require('../controllers/reviewCycleController');
const reviewApprovalController = require('../controllers/reviewApprovalController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  cycleIdParamValidator,
  createCycleValidator,
  updateCycleValidator,
  listCyclesValidator,
  assignPeerValidator,
} = require('../validators/reviewCycleValidators');
const { ROLES, ADMIN_TIER_ROLES } = require('../config/constants');
const { param, body } = require('express-validator');

router.use(authenticate);

// Everyone can see the list/detail of cycles (they need to know what's
// active to submit feedback) — only Admin can create/modify/delete.
router.get('/', listCyclesValidator, validate, reviewCycleController.listCycles);
router.get('/:cycleId', cycleIdParamValidator, validate, reviewCycleController.getCycle);

router.post('/', authorize(...ADMIN_TIER_ROLES), createCycleValidator, validate, reviewCycleController.createCycle);
router.patch('/:cycleId', authorize(...ADMIN_TIER_ROLES), updateCycleValidator, validate, reviewCycleController.updateCycle);
router.delete('/:cycleId', authorize(...ADMIN_TIER_ROLES), cycleIdParamValidator, validate, reviewCycleController.deleteCycle);

// Peer assignments (admin-managed)
router.post(
  '/:cycleId/peer-assignments',
  authorize(...ADMIN_TIER_ROLES),
  assignPeerValidator,
  validate,
  reviewCycleController.assignPeerReviewer
);
router.get(
  '/:cycleId/peer-assignments',
  authorize(...ADMIN_TIER_ROLES),
  cycleIdParamValidator,
  validate,
  reviewCycleController.listAssignmentsForCycle
);
router.delete(
  '/peer-assignments/:assignmentId',
  authorize(...ADMIN_TIER_ROLES),
  reviewCycleController.removeAssignment
);

// Powers the Employee Detail page's Reviewers tab.
router.get(
  '/:cycleId/subjects/:subjectId/assignments',
  authorize(...ADMIN_TIER_ROLES),
  cycleIdParamValidator,
  validate,
  reviewCycleController.listAssignmentsForSubject
);

// Any authenticated user can see who THEY have been assigned to review.
router.get('/:cycleId/my-assignments', cycleIdParamValidator, validate, reviewCycleController.listMyAssignments);

// Admin dashboard: completion tracking for a cycle.
router.get(
  '/:cycleId/completion-summary',
  authorize(...ADMIN_TIER_ROLES),
  cycleIdParamValidator,
  validate,
  reviewCycleController.getCompletionSummary
);

// --- Phase 3: Approval Flow (HR sign-off per employee per cycle) ---

const subjectIdParamValidator = [
  ...cycleIdParamValidator,
  param('subjectId').isUUID().withMessage('subjectId must be a valid UUID'),
];

router.get(
  '/:cycleId/approvals',
  authorize(...ADMIN_TIER_ROLES),
  cycleIdParamValidator,
  validate,
  reviewApprovalController.listApprovalsForCycle
);

router.get('/:cycleId/approvals/:subjectId', subjectIdParamValidator, validate, reviewApprovalController.getApproval);

router.put(
  '/:cycleId/approvals/:subjectId',
  authorize(...ADMIN_TIER_ROLES),
  [...subjectIdParamValidator, body('hrComments').optional({ nullable: true }).trim().isLength({ max: 5000 })],
  validate,
  reviewApprovalController.approveEmployee
);

router.delete(
  '/:cycleId/approvals/:subjectId',
  authorize(...ADMIN_TIER_ROLES),
  subjectIdParamValidator,
  validate,
  reviewApprovalController.revokeApproval
);

module.exports = router;
