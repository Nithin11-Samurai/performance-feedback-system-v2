const { body, param } = require('express-validator');

const employeeIdParamValidator = [param('employeeId').isUUID().withMessage('employeeId must be a valid UUID')];

const noteIdParamValidator = [param('noteId').isUUID().withMessage('noteId must be a valid UUID')];

const createNoteValidator = [
  ...employeeIdParamValidator,
  body('meetingDate').isISO8601().withMessage('meetingDate is required and must be a valid date'),
  body('title').optional({ nullable: true }).trim().isLength({ max: 200 }),
  body('noteText').optional({ nullable: true }).trim().isLength({ max: 10000 }),
  body('discussion').optional({ nullable: true }).trim().isLength({ max: 10000 }),
  body('actionItems').optional({ nullable: true }).trim().isLength({ max: 5000 }),
  body('followUpDate').optional({ nullable: true }).isISO8601().withMessage('followUpDate must be a valid date'),
];

const updateNoteValidator = [
  ...noteIdParamValidator,
  body('meetingDate').optional().isISO8601().withMessage('meetingDate must be a valid date'),
  body('title').optional({ nullable: true }).trim().isLength({ max: 200 }),
  body('noteText').optional({ nullable: true }).trim().isLength({ max: 10000 }),
  body('discussion').optional({ nullable: true }).trim().isLength({ max: 10000 }),
  body('actionItems').optional({ nullable: true }).trim().isLength({ max: 5000 }),
  body('followUpDate').optional({ nullable: true }).isISO8601().withMessage('followUpDate must be a valid date'),
];

module.exports = { employeeIdParamValidator, noteIdParamValidator, createNoteValidator, updateNoteValidator };
