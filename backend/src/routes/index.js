/**
 * Root API router.
 * Feature routers are mounted here as they're built in upcoming steps:
 *   /api/auth            -> authentication [DONE - Step 2]
 *   /api/users           -> user/profile management [DONE - Step 3]
 *   /api/skills          -> Salesforce/Conga skills [DONE - Step 4]
 *   /api/certifications  -> certifications + file upload [DONE - Step 4]
 *   /api/notes           -> 1:1 meeting notes, Admin/HR only [DONE - Step 4]
 *   /api/notifications   -> in-app notifications [DONE - Step 4]
 *   /api/review-cycles   -> cycle management + peer assignments [DONE - Step 5]
 *   /api/feedback        -> self/manager/peer feedback [DONE - Step 5]
 *   /api/ai              -> Claude-generated summaries [DONE - Step 6]
 *   /api/exports         -> PDF/Excel export [DONE - Step 7]
 *   /api/dashboard       -> admin KPI dashboard aggregates [ADDED - UI redesign Phase 1]
 *   /api/analytics       -> org-wide analytics (dept/top performers/skill gaps/trends) [ADDED - Phase 5]
 *   /api/activity-logs   -> enterprise audit log viewer [ADDED - Feature 9]
 *   /api/catalog         -> department/job title managed lists [ADDED - Item 3]
 *   /api/peer-insights   -> anonymous 360 feedback via project groups [ADDED - Item 9]
 *   /api/permissions     -> per-user section access overrides [ADDED - Item 10]
 */
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ success: true, message: 'Performance Feedback System API is running.' });
});

router.use('/auth', require('./authRoutes'));
router.use('/users', require('./userRoutes'));
router.use('/skills', require('./skillRoutes'));
router.use('/certifications', require('./certificationRoutes'));
router.use('/notes', require('./noteRoutes'));
router.use('/notifications', require('./notificationRoutes'));
router.use('/review-cycles', require('./reviewCycleRoutes'));
router.use('/feedback', require('./feedbackRoutes'));
router.use('/ai', require('./aiRoutes'));
router.use('/exports', require('./exportRoutes'));
router.use('/dashboard', require('./dashboardRoutes'));
router.use('/analytics', require('./analyticsRoutes'));
router.use('/activity-logs', require('./activityLogRoutes'));
router.use('/catalog', require('./catalogRoutes'));
router.use('/peer-insights', require('./peerInsightRoutes'));
router.use('/permissions', require('./sectionPermissionRoutes'));

module.exports = router;
