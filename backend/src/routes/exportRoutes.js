const express = require('express');
const router = express.Router();
const { param } = require('express-validator');

const exportController = require('../controllers/exportController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { ROLES, ADMIN_TIER_ROLES } = require('../config/constants');

const userIdParamValidator = [param('userId').isUUID().withMessage('userId must be a valid UUID')];
const cycleIdParamValidator = [param('cycleId').isUUID().withMessage('cycleId must be a valid UUID')];

router.use(authenticate);

router.get('/employee/:userId/pdf', userIdParamValidator, validate, exportController.exportEmployeePdf);
router.get('/employee/:userId/excel', userIdParamValidator, validate, exportController.exportEmployeeExcel);

router.get('/department/:department/pdf', authorize(...ADMIN_TIER_ROLES), exportController.exportDepartmentPdf);
router.get('/department/:department/excel', authorize(...ADMIN_TIER_ROLES), exportController.exportDepartmentExcel);

router.get('/cycle/:cycleId/pdf', authorize(...ADMIN_TIER_ROLES), cycleIdParamValidator, validate, exportController.exportCyclePdf);
router.get('/cycle/:cycleId/excel', authorize(...ADMIN_TIER_ROLES), cycleIdParamValidator, validate, exportController.exportCycleExcel);

router.get('/notes/:employeeId/pdf', authorize(...ADMIN_TIER_ROLES), exportController.exportNotesPdf);
router.get('/notes/:employeeId/excel', authorize(...ADMIN_TIER_ROLES), exportController.exportNotesExcel);

module.exports = router;
