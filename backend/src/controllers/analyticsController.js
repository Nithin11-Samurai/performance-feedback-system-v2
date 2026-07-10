const asyncHandler = require('../utils/asyncHandler');
const analyticsService = require('../services/analyticsService');
const {
  buildSkillsOverviewWorkbook,
  buildSkillEmployeesWorkbook,
  buildCertificationsOverviewWorkbook,
  buildCertificationEmployeesWorkbook,
} = require('../utils/excelGenerator');

// GET /api/analytics/overview
const getOverview = asyncHandler(async (req, res) => {
  const overview = await analyticsService.getOverview();
  res.json({ success: true, data: overview });
});

// GET /api/analytics/skills-overview
const getSkillsOverview = asyncHandler(async (req, res) => {
  const skills = await analyticsService.getSkillsOverview();
  res.json({ success: true, data: { skills } });
});

// GET /api/analytics/skills-overview/export/excel
const exportSkillsOverviewExcel = asyncHandler(async (req, res) => {
  const skills = await analyticsService.getSkillsOverview();
  const workbook = buildSkillsOverviewWorkbook(skills);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="Skills_Overview.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
});

// GET /api/analytics/skills-overview/:category/:skillName/employees
const getEmployeesForSkill = asyncHandler(async (req, res) => {
  const employees = await analyticsService.getEmployeesForSkill(req.params.category, req.params.skillName);
  res.json({ success: true, data: { employees } });
});

// GET /api/analytics/skills-overview/:category/:skillName/employees/export/excel
const exportSkillEmployeesExcel = asyncHandler(async (req, res) => {
  const employees = await analyticsService.getEmployeesForSkill(req.params.category, req.params.skillName);
  const workbook = buildSkillEmployeesWorkbook(req.params.skillName, employees);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.skillName.replace(/[^a-zA-Z0-9_-]/g, '_')}_Employees.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
});

// GET /api/analytics/certifications-overview
const getCertificationsOverview = asyncHandler(async (req, res) => {
  const certifications = await analyticsService.getCertificationsOverview();
  res.json({ success: true, data: { certifications } });
});

// GET /api/analytics/certifications-overview/export/excel
const exportCertificationsOverviewExcel = asyncHandler(async (req, res) => {
  const certifications = await analyticsService.getCertificationsOverview();
  const workbook = buildCertificationsOverviewWorkbook(certifications);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="Certifications_Overview.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
});

// GET /api/analytics/certifications-overview/:name/employees
const getEmployeesForCertification = asyncHandler(async (req, res) => {
  const employees = await analyticsService.getEmployeesForCertification(req.params.name);
  res.json({ success: true, data: { employees } });
});

// GET /api/analytics/certifications-overview/:name/employees/export/excel
const exportCertificationEmployeesExcel = asyncHandler(async (req, res) => {
  const employees = await analyticsService.getEmployeesForCertification(req.params.name);
  const workbook = buildCertificationEmployeesWorkbook(req.params.name, employees);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Employees.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
});

module.exports = {
  getOverview,
  getSkillsOverview,
  exportSkillsOverviewExcel,
  getEmployeesForSkill,
  exportSkillEmployeesExcel,
  getCertificationsOverview,
  exportCertificationsOverviewExcel,
  getEmployeesForCertification,
  exportCertificationEmployeesExcel,
};
