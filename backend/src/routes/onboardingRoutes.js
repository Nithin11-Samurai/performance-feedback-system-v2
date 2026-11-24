const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const onboardingController = require('../controllers/onboardingController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

// Only ever about the signed-in user themselves, so no role checks are needed.
router.use(authenticate);

const PHONE = /^[0-9+()\-.\s]{7,30}$/;

router.get('/status', onboardingController.getStatus);

router.put(
  '/personal',
  [
    body('phone').trim().matches(PHONE).withMessage('Enter a valid phone number (digits, spaces, + ( ) - .)'),
    body('emergencyContactName').trim().isLength({ min: 2, max: 150 }).withMessage('Enter the emergency contact\'s name'),
    body('emergencyContactPhone')
      .trim()
      .matches(PHONE)
      .withMessage('Enter a valid emergency contact phone number'),
    body('address').optional({ nullable: true }).isString().isLength({ max: 500 }).withMessage('Address is too long'),
  ],
  validate,
  onboardingController.savePersonal
);

router.post('/no-certifications', [body('none').isBoolean().withMessage('none must be true or false')], validate, onboardingController.setNoCertifications);
router.post('/dismiss', onboardingController.dismiss);

module.exports = router;
