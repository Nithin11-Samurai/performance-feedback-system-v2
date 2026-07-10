const express = require('express');
const router = express.Router();

const certificationController = require('../controllers/certificationController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { uploadCertificate } = require('../middleware/upload');
const {
  userIdParamValidator,
  certIdParamValidator,
  createCertificationValidator,
  updateCertificationValidator,
} = require('../validators/certificationValidators');

router.use(authenticate);

router.get('/:userId', userIdParamValidator, validate, certificationController.listCertifications);

// multer (uploadCertificate) must run BEFORE express-validator, since it
// parses the multipart body into req.body/req.file.
router.post(
  '/:userId',
  uploadCertificate,
  createCertificationValidator,
  validate,
  certificationController.createCertification
);

router.patch(
  '/:userId/:certId',
  uploadCertificate,
  updateCertificationValidator,
  validate,
  certificationController.updateCertification
);

router.delete('/:userId/:certId', certIdParamValidator, validate, certificationController.deleteCertification);

module.exports = router;
