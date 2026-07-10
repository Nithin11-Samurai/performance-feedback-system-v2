const { body, param } = require('express-validator');

const userIdParamValidator = [param('userId').isUUID().withMessage('userId must be a valid UUID')];

const certIdParamValidator = [
  ...userIdParamValidator,
  param('certId').isUUID().withMessage('certId must be a valid UUID'),
];

// Note: this validates req.body which, for multipart/form-data requests,
// is populated by multer before these checks run (see route ordering).
const createCertificationValidator = [
  ...userIdParamValidator,
  body('name').trim().notEmpty().withMessage('Certification name is required'),
  body('issuingOrganization').optional({ nullable: true }).trim(),
  body('issueDate').optional({ nullable: true }).isISO8601().withMessage('issueDate must be a valid date'),
  body('expiryDate').optional({ nullable: true }).isISO8601().withMessage('expiryDate must be a valid date'),
  body('credentialId').optional({ nullable: true }).trim(),
  body('credentialUrl').optional({ nullable: true }).trim().isURL().withMessage('credentialUrl must be a valid URL'),
];

const updateCertificationValidator = [
  ...certIdParamValidator,
  body('name').optional().trim().notEmpty().withMessage('Certification name cannot be empty'),
  body('issuingOrganization').optional({ nullable: true }).trim(),
  body('issueDate').optional({ nullable: true }).isISO8601().withMessage('issueDate must be a valid date'),
  body('expiryDate').optional({ nullable: true }).isISO8601().withMessage('expiryDate must be a valid date'),
  body('credentialId').optional({ nullable: true }).trim(),
  body('credentialUrl').optional({ nullable: true }).trim().isURL().withMessage('credentialUrl must be a valid URL'),
];

module.exports = {
  userIdParamValidator,
  certIdParamValidator,
  createCertificationValidator,
  updateCertificationValidator,
};
