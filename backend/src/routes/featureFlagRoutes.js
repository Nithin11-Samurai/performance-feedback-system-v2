const express = require('express');
const router = express.Router();

const featureFlagController = require('../controllers/featureFlagController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Any authenticated user can read the flags (needed to decide their own
// nav visibility). Writing is gated inside the service to Admin-tier only.
router.get('/', featureFlagController.listFlags);
router.put('/:key', featureFlagController.updateFlag);

module.exports = router;
