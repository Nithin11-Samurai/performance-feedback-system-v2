const express = require('express');
const router = express.Router();

const feedbackController = require('../controllers/feedbackController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  cycleIdParamValidator,
  subjectParamValidator,
  selfFeedbackValidator,
  ratedFeedbackValidator,
  feedbackIdParamValidator,
} = require('../validators/feedbackValidators');
const { ADMIN_TIER_ROLES } = require('../config/constants');

const { param } = require('express-validator');

router.use(authenticate);

router.post('/self/:cycleId', selfFeedbackValidator, validate, feedbackController.submitSelfReview);
router.post('/manager/:cycleId/:subjectId', ratedFeedbackValidator, validate, feedbackController.submitManagerReview);
router.post('/peer/:cycleId/:subjectId', ratedFeedbackValidator, validate, feedbackController.submitPeerReview);

// Feature 4: generic route for the new reviewer types (hr, skip_level,
// project_lead, mentor). Registered AFTER the literal self/manager/peer
// routes above so those still take priority for those exact paths —
// Express matches routes in registration order, and only reviewerType
// values that aren't "self"/"manager"/"peer" fall through to this one.
router.post(
  '/:reviewerType(hr|skip_level|project_lead|mentor|team_lead|md)/:cycleId/:subjectId',
  ratedFeedbackValidator,
  validate,
  feedbackController.submitAssignedReview
);

router.patch('/:feedbackId/submit', feedbackIdParamValidator, validate, feedbackController.submitFeedback);

// "Send individual feedback to employee" (Item: collective vs individual sharing)
router.patch(
  '/:feedbackId/notify-employee',
  authorize(...ADMIN_TIER_ROLES),
  feedbackIdParamValidator,
  validate,
  feedbackController.notifyEmployeeAboutFeedback
);

// IMPORTANT: this must come BEFORE '/subject/:subjectId/:cycleId' below,
// otherwise Express would match "history" as the :cycleId param.
router.get(
  '/subject/:subjectId/history',
  [param('subjectId').isUUID().withMessage('subjectId must be a valid UUID')],
  validate,
  feedbackController.getFeedbackHistory
);

router.get(
  '/subject/:subjectId/:cycleId',
  [...subjectParamValidator],
  validate,
  feedbackController.listFeedbackForSubject
);

module.exports = router;
