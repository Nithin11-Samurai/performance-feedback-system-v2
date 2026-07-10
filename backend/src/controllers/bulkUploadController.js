const asyncHandler = require('../utils/asyncHandler');
const bulkUploadService = require('../services/bulkUploadService');
const { buildBulkEmployeeTemplateWorkbook } = require('../utils/excelGenerator');

// GET /api/users/bulk-template/excel
const downloadTemplate = asyncHandler(async (req, res) => {
  const workbook = buildBulkEmployeeTemplateWorkbook();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="Employee_Bulk_Upload_Template.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
});

// POST /api/users/bulk-upload  (multipart, field: file)
const bulkUpload = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file was uploaded.' });
  }
  const result = await bulkUploadService.bulkCreateUsers(req.user, req.file.buffer);
  res.json({
    success: true,
    message: `${result.created.length} employee(s) created${result.errors.length ? `, ${result.errors.length} row(s) had errors` : ''}.`,
    data: result,
  });
});

module.exports = { downloadTemplate, bulkUpload };
