/**
 * Excel report generator (ExcelJS).
 * One workbook, one sheet per data category, so HR can filter/sort in
 * Excel itself rather than reading a wall of text.
 */
const ExcelJS = require('exceljs');

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' } };

function styleHeaderRow(row) {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle' };
  });
}

function formatDate(d) {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * @param {object} report - output of exportService.compileEmployeeReport
 * @returns {ExcelJS.Workbook}
 */
function buildEmployeeWorkbook(report) {
  const { employee, manager, skills, certifications, notes, feedback, includesNotes } = report;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Performance Feedback System';
  workbook.created = new Date();

  // --- Profile sheet ---
  const profileSheet = workbook.addWorksheet('Profile');
  profileSheet.columns = [
    { header: 'Field', key: 'field', width: 22 },
    { header: 'Value', key: 'value', width: 50 },
  ];
  styleHeaderRow(profileSheet.getRow(1));
  profileSheet.addRows([
    { field: 'Full Name', value: `${employee.first_name} ${employee.last_name}` },
    { field: 'Employee Code', value: employee.employee_code },
    { field: 'Email', value: employee.email },
    { field: 'Role', value: employee.role },
    { field: 'Job Title', value: employee.job_title || 'N/A' },
    { field: 'Department', value: employee.department || 'N/A' },
    { field: 'Date of Joining', value: formatDate(employee.date_of_joining) },
    { field: 'Manager', value: manager ? `${manager.first_name} ${manager.last_name}` : 'N/A' },
    { field: 'Status', value: employee.is_active ? 'Active' : 'Deactivated' },
  ]);

  // --- Skills sheet ---
  const skillsSheet = workbook.addWorksheet('Skills');
  skillsSheet.columns = [
    { header: 'Category', key: 'category', width: 15 },
    { header: 'Skill', key: 'skill', width: 30 },
    { header: 'Proficiency', key: 'proficiency', width: 15 },
    { header: 'Years Experience', key: 'years', width: 18 },
    { header: 'Notes', key: 'notes', width: 40 },
  ];
  styleHeaderRow(skillsSheet.getRow(1));
  skills.forEach((s) =>
    skillsSheet.addRow({
      category: s.category,
      skill: s.skill_name,
      proficiency: s.proficiency,
      years: s.years_experience,
      notes: s.notes || '',
    })
  );

  // --- Certifications sheet ---
  const certSheet = workbook.addWorksheet('Certifications');
  certSheet.columns = [
    { header: 'Name', key: 'name', width: 35 },
    { header: 'Issuing Organization', key: 'org', width: 25 },
    { header: 'Issue Date', key: 'issueDate', width: 18 },
    { header: 'Expiry Date', key: 'expiryDate', width: 18 },
    { header: 'Credential ID', key: 'credentialId', width: 20 },
  ];
  styleHeaderRow(certSheet.getRow(1));
  certifications.forEach((c) =>
    certSheet.addRow({
      name: c.name,
      org: c.issuing_organization || 'N/A',
      issueDate: formatDate(c.issue_date),
      expiryDate: c.expiry_date ? formatDate(c.expiry_date) : 'N/A',
      credentialId: c.credential_id || 'N/A',
    })
  );

  // --- Feedback sheet ---
  const feedbackSheet = workbook.addWorksheet('Feedback History');
  feedbackSheet.columns = [
    { header: 'Cycle', key: 'cycle', width: 20 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Reviewer', key: 'reviewer', width: 22 },
    { header: 'Rating', key: 'rating', width: 10 },
    { header: 'Strengths', key: 'strengths', width: 35 },
    { header: 'Areas for Improvement', key: 'improvement', width: 35 },
    { header: 'Achievements', key: 'achievements', width: 35 },
    { header: 'Goals', key: 'goals', width: 35 },
    { header: 'Comments', key: 'comments', width: 35 },
  ];
  styleHeaderRow(feedbackSheet.getRow(1));
  feedback.forEach((f) =>
    feedbackSheet.addRow({
      cycle: f.cycle_name,
      type: f.type,
      reviewer: f.reviewer_name,
      rating: f.rating || 'N/A',
      strengths: f.strengths || '',
      improvement: f.improvement_areas || '',
      achievements: f.achievements || '',
      goals: f.goals || '',
      comments: f.comments || '',
    })
  );

  // --- 1:1 Notes sheet (Admin/HR export only) ---
  if (includesNotes) {
    const notesSheet = workbook.addWorksheet('1-on-1 Notes (Internal)');
    notesSheet.columns = [
      { header: 'Meeting Date', key: 'date', width: 18 },
      { header: 'Title', key: 'title', width: 25 },
      { header: 'Logged By', key: 'loggedBy', width: 22 },
      { header: 'Notes', key: 'notes', width: 50 },
      { header: 'Attachment', key: 'attachment', width: 25 },
    ];
    styleHeaderRow(notesSheet.getRow(1));
    notes.forEach((n) =>
      notesSheet.addRow({
        date: formatDate(n.meeting_date),
        title: n.title || '',
        loggedBy: `${n.uploaded_by_first_name || ''} ${n.uploaded_by_last_name || ''}`.trim(),
        notes: n.note_text || '',
        attachment: n.file_original_name || '',
      })
    );
  }

  return workbook;
}

/**
 * Department Report workbook (Phase 7).
 */
function buildDepartmentWorkbook(report) {
  const { department, headcount, avgRating, employeeRows } = report;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Performance Feedback System';
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Field', key: 'field', width: 22 },
    { header: 'Value', key: 'value', width: 30 },
  ];
  styleHeaderRow(summarySheet.getRow(1));
  summarySheet.addRows([
    { field: 'Department', value: department },
    { field: 'Headcount', value: headcount },
    { field: 'Average Rating', value: avgRating != null ? `${avgRating}/5` : 'N/A' },
  ]);

  const employeesSheet = workbook.addWorksheet('Employees');
  employeesSheet.columns = [
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Job Title', key: 'jobTitle', width: 25 },
    { header: 'Role', key: 'role', width: 12 },
    { header: 'Avg Rating', key: 'avgRating', width: 12 },
    { header: 'Review Count', key: 'reviewCount', width: 14 },
    { header: 'Status', key: 'status', width: 12 },
  ];
  styleHeaderRow(employeesSheet.getRow(1));
  employeeRows.forEach((e) =>
    employeesSheet.addRow({
      name: e.name,
      jobTitle: e.jobTitle || 'N/A',
      role: e.role,
      avgRating: e.avgRating != null ? e.avgRating : 'N/A',
      reviewCount: e.reviewCount,
      status: e.isActive ? 'Active' : 'Inactive',
    })
  );

  return workbook;
}

/**
 * Review Cycle Report workbook (Phase 7).
 */
function buildCycleWorkbook(report) {
  const { cycle, byType, employeeRows } = report;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Performance Feedback System';
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet('Cycle Summary');
  summarySheet.columns = [
    { header: 'Field', key: 'field', width: 22 },
    { header: 'Value', key: 'value', width: 30 },
  ];
  styleHeaderRow(summarySheet.getRow(1));
  summarySheet.addRows([
    { field: 'Cycle Name', value: cycle.name },
    { field: 'Status', value: cycle.status },
    { field: 'Start Date', value: formatDate(cycle.start_date) },
    { field: 'End Date', value: formatDate(cycle.end_date) },
    ...Object.entries(byType).map(([type, counts]) => ({
      field: `${type[0].toUpperCase() + type.slice(1)} Completion`,
      value: `${counts.submitted}/${counts.submitted + counts.pending}`,
    })),
  ]);

  const employeesSheet = workbook.addWorksheet('Employees');
  employeesSheet.columns = [
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Department', key: 'department', width: 20 },
    { header: 'Submitted', key: 'submitted', width: 12 },
    { header: 'Total', key: 'total', width: 10 },
    { header: 'Avg Rating', key: 'avgRating', width: 12 },
  ];
  styleHeaderRow(employeesSheet.getRow(1));
  employeeRows.forEach((e) =>
    employeesSheet.addRow({
      name: e.name,
      department: e.department || 'N/A',
      submitted: e.submittedFeedback,
      total: e.totalFeedback,
      avgRating: e.avgRating != null ? e.avgRating : 'N/A',
    })
  );

  return workbook;
}

/**
 * Internal Notes report workbook (Item 6).
 */
function buildNotesWorkbook(report) {
  const { employee, notes } = report;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Performance Feedback System';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Internal Notes');
  sheet.columns = [
    { header: 'Meeting Date', key: 'meetingDate', width: 14 },
    { header: 'Title', key: 'title', width: 22 },
    { header: 'Discussion', key: 'discussion', width: 40 },
    { header: 'Action Items', key: 'actionItems', width: 35 },
    { header: 'Follow-up Date', key: 'followUpDate', width: 14 },
    { header: 'Logged By', key: 'loggedBy', width: 22 },
  ];
  styleHeaderRow(sheet.getRow(1));
  notes.forEach((n) =>
    sheet.addRow({
      meetingDate: formatDate(n.meeting_date),
      title: n.title || '',
      discussion: n.discussion || n.note_text || '',
      actionItems: n.action_items || '',
      followUpDate: n.follow_up_date ? formatDate(n.follow_up_date) : '',
      loggedBy: `${n.uploaded_by_first_name} ${n.uploaded_by_last_name}`,
    })
  );

  return workbook;
}

/**
 * Item 7: Skills Overview workbook - one row per skill with proficiency breakdown.
 */
function buildSkillsOverviewWorkbook(skills) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Performance Feedback System';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Skills Overview');
  sheet.columns = [
    { header: 'Category', key: 'category', width: 16 },
    { header: 'Skill', key: 'skillName', width: 28 },
    { header: 'Total Employees', key: 'total', width: 16 },
    { header: 'Beginner', key: 'beginner', width: 12 },
    { header: 'Intermediate', key: 'intermediate', width: 14 },
    { header: 'Advanced', key: 'advanced', width: 12 },
    { header: 'Expert', key: 'expert', width: 12 },
  ];
  styleHeaderRow(sheet.getRow(1));
  skills.forEach((s) =>
    sheet.addRow({
      category: s.category,
      skillName: s.skillName,
      total: s.total,
      beginner: s.byProficiency.beginner,
      intermediate: s.byProficiency.intermediate,
      advanced: s.byProficiency.advanced,
      expert: s.byProficiency.expert,
    })
  );
  return workbook;
}

/**
 * Item 7: per-skill drill-down workbook - every employee who has this skill.
 */
function buildSkillEmployeesWorkbook(skillName, employees) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Performance Feedback System';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(skillName.slice(0, 31));
  sheet.columns = [
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Job Title', key: 'jobTitle', width: 25 },
    { header: 'Department', key: 'department', width: 20 },
    { header: 'Proficiency', key: 'proficiency', width: 14 },
    { header: 'Years Experience', key: 'years', width: 16 },
  ];
  styleHeaderRow(sheet.getRow(1));
  employees.forEach((e) =>
    sheet.addRow({
      name: `${e.first_name} ${e.last_name}`,
      jobTitle: e.job_title || 'N/A',
      department: e.department || 'N/A',
      proficiency: e.proficiency,
      years: e.years_experience || 0,
    })
  );
  return workbook;
}

/**
 * Item 7: Certifications Overview workbook - one row per certification name.
 */
function buildCertificationsOverviewWorkbook(certifications) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Performance Feedback System';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Certifications Overview');
  sheet.columns = [
    { header: 'Certification', key: 'name', width: 32 },
    { header: 'Holders', key: 'holderCount', width: 12 },
    { header: 'Expired', key: 'expiredCount', width: 12 },
  ];
  styleHeaderRow(sheet.getRow(1));
  certifications.forEach((c) =>
    sheet.addRow({ name: c.name, holderCount: c.holder_count, expiredCount: c.expired_count })
  );
  return workbook;
}

/**
 * Item 7: per-certification drill-down workbook - every employee who holds it.
 */
function buildCertificationEmployeesWorkbook(certName, employees) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Performance Feedback System';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(certName.slice(0, 31));
  sheet.columns = [
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Job Title', key: 'jobTitle', width: 25 },
    { header: 'Department', key: 'department', width: 20 },
    { header: 'Issue Date', key: 'issueDate', width: 14 },
    { header: 'Expiry Date', key: 'expiryDate', width: 14 },
    { header: 'Credential ID', key: 'credentialId', width: 20 },
    { header: 'Credential URL', key: 'credentialUrl', width: 30 },
  ];
  styleHeaderRow(sheet.getRow(1));
  employees.forEach((e) =>
    sheet.addRow({
      name: `${e.first_name} ${e.last_name}`,
      jobTitle: e.job_title || 'N/A',
      department: e.department || 'N/A',
      issueDate: e.issue_date ? formatDate(e.issue_date) : '',
      expiryDate: e.expiry_date ? formatDate(e.expiry_date) : '',
      credentialId: e.credential_id || '',
      credentialUrl: e.credential_url || '',
    })
  );
  return workbook;
}

/**
 * Item 5: Bulk Employee Upload template. One header row with the exact
 * columns bulkCreateUsers expects, plus a filled-in example row so it's
 * obvious what format each column wants. No password column — a secure
 * temporary password is generated server-side per user and returned in
 * the upload results instead of ever living in a spreadsheet.
 */
function buildBulkEmployeeTemplateWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Performance Feedback System';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Employees');
  sheet.columns = [
    { header: 'Employee Code', key: 'employeeCode', width: 16 },
    { header: 'First Name', key: 'firstName', width: 18 },
    { header: 'Last Name', key: 'lastName', width: 18 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Role', key: 'role', width: 14 },
    { header: 'Job Title', key: 'jobTitle', width: 24 },
    { header: 'Department', key: 'department', width: 20 },
    { header: 'Date of Joining (YYYY-MM-DD)', key: 'dateOfJoining', width: 24 },
    { header: 'Manager Employee Code (optional)', key: 'managerEmployeeCode', width: 28 },
  ];
  styleHeaderRow(sheet.getRow(1));
  sheet.addRow({
    employeeCode: 'EMP-1001',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane.doe@example.com',
    role: 'employee',
    jobTitle: 'Software Engineer',
    department: 'Engineering',
    dateOfJoining: '2026-01-15',
    managerEmployeeCode: 'EMP-0002',
  });

  const notesSheet = workbook.addWorksheet('Instructions');
  notesSheet.columns = [{ header: 'Instructions', key: 'note', width: 90 }];
  styleHeaderRow(notesSheet.getRow(1));
  [
    'Fill in one row per employee on the "Employees" sheet, then upload this file back in.',
    'Employee Code and Email must be unique — the upload will reject rows that clash with an existing employee.',
    'Role must be one of: employee, manager, hr_manager, system_admin, global_admin, admin.',
    'Date of Joining must be in YYYY-MM-DD format, or left blank.',
    'Manager Employee Code is optional — leave blank if this employee has no manager yet, or fill it in with an existing employee\'s code to link them.',
    'Do not include a password column — a secure temporary password is generated automatically for each new employee and shown to you after upload, so you can share it with them directly.',
    'Do not rename the column headers on the Employees sheet — the upload matches columns by header name.',
  ].forEach((note) => notesSheet.addRow({ note }));

  return workbook;
}

module.exports = {
  buildEmployeeWorkbook,
  buildDepartmentWorkbook,
  buildCycleWorkbook,
  buildNotesWorkbook,
  buildSkillsOverviewWorkbook,
  buildSkillEmployeesWorkbook,
  buildCertificationsOverviewWorkbook,
  buildCertificationEmployeesWorkbook,
  buildBulkEmployeeTemplateWorkbook,
};
