const express = require('express');
const router = express.Router();

const analyticsController = require('../controllers/analyticsController');
const { authenticate, requireSectionAccess } = require('../middleware/auth');

router.use(authenticate);

router.get('/overview', requireSectionAccess('analytics'), analyticsController.getOverview);

router.get('/skills-overview', requireSectionAccess('skills_certs_overview'), analyticsController.getSkillsOverview);
router.get('/skills-overview/export/excel', requireSectionAccess('skills_certs_overview'), analyticsController.exportSkillsOverviewExcel);
router.get('/skills-overview/:category/:skillName/employees', requireSectionAccess('skills_certs_overview'), analyticsController.getEmployeesForSkill);
router.get(
  '/skills-overview/:category/:skillName/employees/export/excel',
  requireSectionAccess('skills_certs_overview'),
  analyticsController.exportSkillEmployeesExcel
);

router.get('/certifications-overview', requireSectionAccess('skills_certs_overview'), analyticsController.getCertificationsOverview);
router.get(
  '/certifications-overview/export/excel',
  requireSectionAccess('skills_certs_overview'),
  analyticsController.exportCertificationsOverviewExcel
);
router.get(
  '/certifications-overview/:name/employees',
  requireSectionAccess('skills_certs_overview'),
  analyticsController.getEmployeesForCertification
);
router.get(
  '/certifications-overview/:name/employees/export/excel',
  requireSectionAccess('skills_certs_overview'),
  analyticsController.exportCertificationEmployeesExcel
);

module.exports = router;
