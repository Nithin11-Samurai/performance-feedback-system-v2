const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const catalogController = require('../controllers/catalogController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { ADMIN_TIER_ROLES } = require('../config/constants');

router.use(authenticate);

// Everyone authenticated can read the lists (needed to populate dropdowns
// anywhere an employee's own department/title might be shown).
router.get('/departments', catalogController.listDepartments);
router.get('/job-titles', catalogController.listJobTitles);

// Only admin-tier roles can manage the lists (Item 3).
router.post(
  '/departments',
  authorize(...ADMIN_TIER_ROLES),
  [body('name').trim().notEmpty().withMessage('Department name is required')],
  validate,
  catalogController.createDepartment
);
router.delete('/departments/:id', authorize(...ADMIN_TIER_ROLES), catalogController.deleteDepartment);

router.post(
  '/job-titles',
  authorize(...ADMIN_TIER_ROLES),
  [body('title').trim().notEmpty().withMessage('Job title is required')],
  validate,
  catalogController.createJobTitle
);
router.delete('/job-titles/:id', authorize(...ADMIN_TIER_ROLES), catalogController.deleteJobTitle);

module.exports = router;
