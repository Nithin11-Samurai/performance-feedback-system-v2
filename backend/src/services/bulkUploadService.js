/**
 * Bulk employee upload service (Item 5).
 * Parses an uploaded .xlsx spreadsheet (matching the template from
 * buildBulkEmployeeTemplateWorkbook) and creates one user per row.
 * Processes every row independently - one bad row doesn't stop the rest
 * from being created - and returns a per-row result so the admin can see
 * exactly what succeeded and what needs fixing.
 */
const crypto = require('crypto');
const ExcelJS = require('exceljs');
const userModel = require('../models/userModel');
const { hashPassword } = require('../utils/password');
const auditLog = require('../utils/auditLog');
const AppError = require('../utils/AppError');
const { ALL_ROLES, isAdminTier } = require('../config/constants');

const REQUIRED_HEADERS = ['Employee Code', 'First Name', 'Last Name', 'Email'];

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let pwd = 'A1';
  for (let i = 0; i < 10; i++) {
    pwd += chars[crypto.randomInt(chars.length)];
  }
  return pwd;
}

function normalizeHeader(h) {
  return String(h || '').trim();
}

async function parseWorkbookRows(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('The uploaded file has no sheets.');

  const headerRow = sheet.getRow(1);
  const headers = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber] = normalizeHeader(cell.value);
  });

  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    throw new Error(`Missing required column(s): ${missing.join(', ')}. Please use the provided template.`);
  }

  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = {};
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const header = headers[colNumber];
      if (header) values[header] = cell.value != null ? String(cell.value).trim() : '';
    });
    if (Object.values(values).some((v) => v)) {
      rows.push({ rowNumber, values });
    }
  });

  return rows;
}

async function bulkCreateUsers(requesterUser, fileBuffer) {
  if (!isAdminTier(requesterUser.role)) {
    throw AppError.forbidden('Only HR/Admin can bulk-upload employees');
  }

  const rows = await parseWorkbookRows(fileBuffer);
  if (rows.length === 0) {
    throw AppError.badRequest('No employee rows found in the uploaded file.');
  }

  const created = [];
  const errors = [];

  for (const { rowNumber, values } of rows) {
    try {
      const employeeCode = values['Employee Code'];
      const firstName = values['First Name'];
      const lastName = values['Last Name'];
      const email = values['Email'];
      const role = (values['Role'] || 'employee').toLowerCase();
      const jobTitle = values['Job Title'] || null;
      const department = values['Department'] || null;
      const dateOfJoining = values['Date of Joining (YYYY-MM-DD)'] || null;
      const managerEmployeeCode = values['Manager Employee Code (optional)'] || null;

      if (!employeeCode || !firstName || !lastName || !email) {
        throw new Error('Employee Code, First Name, Last Name, and Email are all required.');
      }
      if (!ALL_ROLES.includes(role)) {
        throw new Error(`Invalid role "${role}". Must be one of: ${ALL_ROLES.join(', ')}.`);
      }
      if (dateOfJoining && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfJoining)) {
        throw new Error(`Date of Joining "${dateOfJoining}" must be in YYYY-MM-DD format.`);
      }

      const existingEmail = await userModel.findByEmail(email);
      if (existingEmail) throw new Error(`Email "${email}" is already in use.`);
      const existingCode = await userModel.findByEmployeeCode(employeeCode);
      if (existingCode) throw new Error(`Employee Code "${employeeCode}" is already in use.`);

      let managerId = null;
      if (managerEmployeeCode) {
        const manager = await userModel.findByEmployeeCode(managerEmployeeCode);
        if (!manager) throw new Error(`Manager Employee Code "${managerEmployeeCode}" was not found.`);
        managerId = manager.id;
      }

      const tempPassword = generateTempPassword();
      const passwordHash = await hashPassword(tempPassword);

      const user = await userModel.create({
        employeeCode,
        firstName,
        lastName,
        email,
        passwordHash,
        role,
        jobTitle,
        department,
        managerId,
        dateOfJoining,
      });

      created.push({
        row: rowNumber,
        employeeCode: user.employee_code,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        tempPassword,
      });
    } catch (err) {
      errors.push({ row: rowNumber, message: err.message });
    }
  }

  await auditLog.record(requesterUser.id, 'BULK_CREATE_USERS', 'user', null, {
    createdCount: created.length,
    errorCount: errors.length,
  });

  return { created, errors };
}

module.exports = { bulkCreateUsers };
