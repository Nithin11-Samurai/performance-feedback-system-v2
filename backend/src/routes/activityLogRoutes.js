const express = require('express');
const router = express.Router();

const activityLogController = require('../controllers/activityLogController');
const { authenticate, requireSectionAccess } = require('../middleware/auth');

router.use(authenticate, requireSectionAccess('activity_log'));

router.get('/', activityLogController.getLogs);
router.get('/actions', activityLogController.getDistinctActions);

module.exports = router;
