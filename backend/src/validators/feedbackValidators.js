const { body, param } = require('express-validator');

const cycleIdParamValidator = [param('cycleId').isUUID().withMessage('cycleId must be a valid UUID')];

const subjectParamValidator = [
  ...cycleIdParamValidator,
  param('subjectId').isUUID().withMessage('subjectId must be a valid UUID'),
];

// Self-review: no numeric rating (an employee doesn't score themselves on
// the same 1-5 scale a manager uses) — just structured reflection text.
const selfFeedbackValidator = [
  ...cycleIdParamValidator,
  body('strengths').optional({ nullable: true }).trim().isLength({ max: 5000 }),
  body('improvementAreas').optional({ nullable: true }).trim().isLength({ max: 5000 }),
  body('comments').optional({ nullable: true }).trim().isLength({ max: 5000 }),
  body('achievements').optional({ nullable: true }).trim().isLength({ max: 5000 }),
  body('goals').optional({ nullable: true }).trim().isLength({ max: 5000 }),
];

// Manager & peer feedback: includes a 1-5 rating.
const ratedFeedbackValidator = [
  ...subjectParamValidator,
  body('rating').isInt({ min: 1, max: 5 }).withMessage('rating must be an integer between 1 and 5'),
  body('strengths').optional({ nullable: true }).trim().isLength({ max: 5000 }),
  body('improvementAreas').optional({ nullable: true }).trim().isLength({ max: 5000 }),
  body('comments').optional({ nullable: true }).trim().isLength({ max: 5000 }),
  body('achievements').optional({ nullable: true }).trim().isLength({ max: 5000 }),
  body('goals').optional({ nullable: true }).trim().isLength({ max: 5000 }),
];

const feedbackIdParamValidator = [param('feedbackId').isUUID().withMessage('feedbackId must be a valid UUID')];

module.exports = {
  cycleIdParamValidator,
  subjectParamValidator,
  selfFeedbackValidator,
  ratedFeedbackValidator,
  feedbackIdParamValidator,
};
