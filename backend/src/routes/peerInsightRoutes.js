/**
 * Peer Insights routes. Most actions are Admin/HR-tier only; a handful
 * (my-assignments, draft/submit, my-summaries) are open to any
 * authenticated user but scoped to themselves inside the service layer.
 */
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const peerInsightController = require('../controllers/peerInsightController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { ADMIN_TIER_ROLES } = require('../config/constants');

router.use(authenticate);

const adminOnly = authorize(...ADMIN_TIER_ROLES);

// Any authenticated user can fetch the question schema (needed to render
// the submission form as a reviewer).
router.get('/feedback-form-schema', peerInsightController.getFeedbackFormSchema);

// --- Groups ---
router.post('/groups', adminOnly, [body('name').trim().notEmpty()], validate, peerInsightController.createGroup);
router.get('/groups', adminOnly, peerInsightController.listGroups);
router.get('/groups/:groupId', adminOnly, peerInsightController.getGroup);
router.delete('/groups/:groupId', adminOnly, peerInsightController.deleteGroup);
router.post('/groups/:groupId/members', adminOnly, [body('userId').isUUID()], validate, peerInsightController.addMember);
router.delete('/groups/:groupId/members/:userId', adminOnly, peerInsightController.removeMember);

// --- Rounds (Quick Action) ---
router.post('/groups/:groupId/rounds', adminOnly, peerInsightController.startRound);
router.get('/groups/:groupId/rounds', adminOnly, peerInsightController.listRoundsForGroup);
router.patch('/rounds/:roundId/close', adminOnly, peerInsightController.closeRound);
router.get('/rounds/:roundId/completion-summary', adminOnly, peerInsightController.getCompletionSummary);
router.get('/rounds/:roundId/subjects', adminOnly, peerInsightController.listSubjectsInRound);

// --- Reviewer-facing (any authenticated user, scoped to self in service) ---
router.get('/my-assignments', peerInsightController.listAllMyPendingAssignments);
router.get('/rounds/:roundId/my-assignments', peerInsightController.listMyAssignments);
router.patch('/feedback/:feedbackId/draft', peerInsightController.saveDraft);
router.patch('/feedback/:feedbackId/submit', peerInsightController.submitFeedback);

// --- HR curation ---
router.get('/rounds/:roundId/subjects/:subjectId/raw-feedback', adminOnly, peerInsightController.getRawFeedback);
router.get('/rounds/:roundId/subjects/:subjectId/category-breakdown', adminOnly, peerInsightController.getCategoryBreakdown);
router.post('/rounds/:roundId/subjects/:subjectId/ai-summary', adminOnly, peerInsightController.generateAiSummaryDraft);
router.put(
  '/rounds/:roundId/subjects/:subjectId/summary',
  adminOnly,
  [body('summaryText').trim().notEmpty()],
  validate,
  peerInsightController.saveSummary
);
// Self-or-admin (enforced in service) — deliberately NOT adminOnly here.
router.get('/rounds/:roundId/subjects/:subjectId/summary', peerInsightController.getSummary);
router.patch('/summaries/:summaryId/release', adminOnly, peerInsightController.releaseSummary);
router.patch('/summaries/:summaryId/unrelease', adminOnly, peerInsightController.unreleaseSummary);

// --- Employee-facing ---
router.get('/my-summaries', peerInsightController.listMyReleasedSummaries);

module.exports = router;
