/**
 * Dashboard routes.
 *   /summary      -> Admin only (org-wide KPIs)
 *   /team-summary -> Manager only (their direct reports)
 *   /my-summary   -> any authenticated user (personal rating history)
 */
const express = require('express');
const router = express.Router();

const dashboardController = require('../controllers/dashboardController');
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES, ADMIN_TIER_ROLES } = require('../config/constants');

router.use(authenticate);

router.get('/summary', authorize(...ADMIN_TIER_ROLES), dashboardController.getSummary);
router.get('/team-summary', authorize(ROLES.MANAGER), dashboardController.getTeamSummary);
router.get('/my-summary', dashboardController.getMySummary);

module.exports = router;
