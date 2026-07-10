const asyncHandler = require('../utils/asyncHandler');
const exportService = require('../services/exportService');
const { generateEmployeePdf, generateDepartmentPdf, generateCyclePdf, generateNotesPdf } = require('../utils/pdfGenerator');
const { buildEmployeeWorkbook, buildDepartmentWorkbook, buildCycleWorkbook, buildNotesWorkbook } = require('../utils/excelGenerator');

function safeFilenamePart(text) {
  return String(text).replace(/[^a-zA-Z0-9_-]/g, '_');
}

// GET /api/exports/employee/:userId/pdf
const exportEmployeePdf = asyncHandler(async (req, res) => {
  const report = await exportService.compileEmployeeReport(req.user, req.params.userId);

  const filename = `${safeFilenamePart(`${report.employee.first_name}_${report.employee.last_name}`)}_Performance_Report.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  generateEmployeePdf(res, report);
});

// GET /api/exports/employee/:userId/excel
const exportEmployeeExcel = asyncHandler(async (req, res) => {
  const report = await exportService.compileEmployeeReport(req.user, req.params.userId);
  const workbook = buildEmployeeWorkbook(report);

  const filename = `${safeFilenamePart(`${report.employee.first_name}_${report.employee.last_name}`)}_Performance_Report.xlsx`;
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  await workbook.xlsx.write(res);
  res.end();
});

// GET /api/exports/department/:department/pdf
const exportDepartmentPdf = asyncHandler(async (req, res) => {
  const report = await exportService.compileDepartmentReport(req.user, req.params.department);
  const filename = `${safeFilenamePart(report.department)}_Department_Report.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  generateDepartmentPdf(res, report);
});

// GET /api/exports/department/:department/excel
const exportDepartmentExcel = asyncHandler(async (req, res) => {
  const report = await exportService.compileDepartmentReport(req.user, req.params.department);
  const workbook = buildDepartmentWorkbook(report);
  const filename = `${safeFilenamePart(report.department)}_Department_Report.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
});

// GET /api/exports/cycle/:cycleId/pdf
const exportCyclePdf = asyncHandler(async (req, res) => {
  const report = await exportService.compileCycleReport(req.user, req.params.cycleId);
  const filename = `${safeFilenamePart(report.cycle.name)}_Cycle_Report.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  generateCyclePdf(res, report);
});

// GET /api/exports/cycle/:cycleId/excel
const exportCycleExcel = asyncHandler(async (req, res) => {
  const report = await exportService.compileCycleReport(req.user, req.params.cycleId);
  const workbook = buildCycleWorkbook(report);
  const filename = `${safeFilenamePart(report.cycle.name)}_Cycle_Report.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
});

// GET /api/exports/notes/:employeeId/pdf
const exportNotesPdf = asyncHandler(async (req, res) => {
  const report = await exportService.compileNotesReport(req.user, req.params.employeeId);
  const filename = `${safeFilenamePart(`${report.employee.first_name}_${report.employee.last_name}`)}_Internal_Notes.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  generateNotesPdf(res, report);
});

// GET /api/exports/notes/:employeeId/excel
const exportNotesExcel = asyncHandler(async (req, res) => {
  const report = await exportService.compileNotesReport(req.user, req.params.employeeId);
  const workbook = buildNotesWorkbook(report);
  const filename = `${safeFilenamePart(`${report.employee.first_name}_${report.employee.last_name}`)}_Internal_Notes.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
});

module.exports = {
  exportEmployeePdf,
  exportEmployeeExcel,
  exportDepartmentPdf,
  exportDepartmentExcel,
  exportCyclePdf,
  exportCycleExcel,
  exportNotesPdf,
  exportNotesExcel,
};
