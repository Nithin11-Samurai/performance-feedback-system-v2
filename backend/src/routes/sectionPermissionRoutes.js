const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const sectionPermissionController = require('../controllers/sectionPermissionController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { ADMIN_TIER_ROLES } = require('../config/constants');

router.use(authenticate, authorize(...ADMIN_TIER_ROLES));

router.get('/sections', sectionPermissionController.listSections);
router.get('/users/:userId', sectionPermissionController.listForUser);
router.put(
  '/users/:userId',
  [body('sectionKey').notEmpty(), body('allowed').isBoolean()],
  validate,
  sectionPermissionController.setOverride
);
router.delete('/users/:userId/:sectionKey', sectionPermissionController.removeOverride);

module.exports = router;
