const express = require('express');
const router = express.Router();

const certificationController = require('../controllers/certificationController');
const { authenticate, requireOwnFeature } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { uploadCertificate } = require('../middleware/upload');
const {
  userIdParamValidator,
  certIdParamValidator,
  createCertificationValidator,
  updateCertificationValidator,
} = require('../validators/certificationValidators');

router.use(authenticate);

router.get(
  '/:userId',
  requireOwnFeature('certifications'),
  userIdParamValidator,
  validate,
  certificationController.listCertifications
);

// multer (uploadCertificate) must run BEFORE express-validator, since it
// parses the multipart body into req.body/req.file.
router.post(
  '/:userId',
  requireOwnFeature('certifications'),
  uploadCertificate,
  createCertificationValidator,
  validate,
  certificationController.createCertification
);

router.patch(
  '/:userId/:certId',
  requireOwnFeature('certifications'),
  uploadCertificate,
  updateCertificationValidator,
  validate,
  certificationController.updateCertification
);

router.delete(
  '/:userId/:certId',
  requireOwnFeature('certifications'),
  certIdParamValidator,
  validate,
  certificationController.deleteCertification
);

module.exports = router;
