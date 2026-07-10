const { param } = require('express-validator');

const summaryParamsValidator = [
  param('subjectId').isUUID().withMessage('subjectId must be a valid UUID'),
  param('cycleId').isUUID().withMessage('cycleId must be a valid UUID'),
];

module.exports = { summaryParamsValidator };
