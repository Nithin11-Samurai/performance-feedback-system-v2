const express = require('express');
const router = express.Router();

const aiSummaryController = require('../controllers/aiSummaryController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { summaryParamsValidator } = require('../validators/aiSummaryValidators');

router.use(authenticate);

router.get('/summary/:subjectId/:cycleId', summaryParamsValidator, validate, aiSummaryController.getSummary);
router.post('/summary/:subjectId/:cycleId', summaryParamsValidator, validate, aiSummaryController.generateSummary);

module.exports = router;
