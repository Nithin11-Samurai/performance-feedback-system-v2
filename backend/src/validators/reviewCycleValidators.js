const { body, param, query } = require('express-validator');
const { REVIEW_CYCLE_STATUS } = require('../config/constants');

const cycleIdParamValidator = [param('cycleId').isUUID().withMessage('cycleId must be a valid UUID')];

const createCycleValidator = [
  body('name').trim().notEmpty().withMessage('Cycle name is required'),
  body('startDate').isISO8601().withMessage('startDate must be a valid date'),
  body('endDate').isISO8601().withMessage('endDate must be a valid date').custom((endDate, { req }) => {
    if (new Date(endDate) < new Date(req.body.startDate)) {
      throw new Error('endDate must be on or after startDate');
    }
    return true;
  }),
];

const updateCycleValidator = [
  ...cycleIdParamValidator,
  body('name').optional().trim().notEmpty(),
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601(),
  body('status')
    .optional()
    .isIn(Object.values(REVIEW_CYCLE_STATUS))
    .withMessage(`status must be one of: ${Object.values(REVIEW_CYCLE_STATUS).join(', ')}`),
];

const listCyclesValidator = [
  query('status').optional().isIn(Object.values(REVIEW_CYCLE_STATUS)),
];

const assignPeerValidator = [
  ...cycleIdParamValidator,
  body('subjectId').isUUID().withMessage('subjectId must be a valid UUID'),
  body('reviewerId').isUUID().withMessage('reviewerId must be a valid UUID').custom((reviewerId, { req }) => {
    if (reviewerId === req.body.subjectId) {
      throw new Error('A reviewer cannot be assigned to review themselves');
    }
    return true;
  }),
  body('reviewerType')
    .optional()
    .isIn(['peer', 'hr', 'skip_level', 'project_lead', 'mentor', 'team_lead', 'md'])
    .withMessage('reviewerType must be one of: peer, hr, skip_level, project_lead, mentor, team_lead, md'),
];

module.exports = {
  cycleIdParamValidator,
  createCycleValidator,
  updateCycleValidator,
  listCyclesValidator,
  assignPeerValidator,
};
