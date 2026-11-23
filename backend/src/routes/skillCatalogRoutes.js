const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');

const skillCatalogController = require('../controllers/skillCatalogController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { ADMIN_TIER_ROLES, SKILL_CATEGORIES } = require('../config/constants');

router.use(authenticate);

// Any signed-in user can read the active list (My Skills needs it).
router.get('/', skillCatalogController.listCatalog);

// Managing the list is Admin-tier only, same as departments / job titles.
router.get('/custom', authorize(...ADMIN_TIER_ROLES), skillCatalogController.listCustomSkills);

router.post(
  '/',
  authorize(...ADMIN_TIER_ROLES),
  [
    body('name').trim().notEmpty().withMessage('Skill name is required').isLength({ max: 150 }),
    body('category').isIn(Object.values(SKILL_CATEGORIES)).withMessage('Invalid category'),
  ],
  validate,
  skillCatalogController.createCatalogSkill
);

router.patch(
  '/:id',
  authorize(...ADMIN_TIER_ROLES),
  [
    param('id').isUUID().withMessage('id must be a valid UUID'),
    body('name').optional().trim().notEmpty().isLength({ max: 150 }),
    body('category').optional().isIn(Object.values(SKILL_CATEGORIES)).withMessage('Invalid category'),
    body('isActive').optional().isBoolean(),
  ],
  validate,
  skillCatalogController.updateCatalogSkill
);

module.exports = router;
