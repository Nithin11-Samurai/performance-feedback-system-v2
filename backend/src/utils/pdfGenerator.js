/**
 * PDF report generator (pdfkit).
 * Streams directly to the HTTP response — no temp files on disk.
 */
const PDFDocument = require('pdfkit');

const COLORS = {
  heading: '#1f2937',
  subheading: '#374151',
  muted: '#6b7280',
  accent: '#2563eb',
  rule: '#e5e7eb',
};

function formatDate(d) {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function drawSectionHeading(doc, text) {
  doc.moveDown(0.8);
  doc.fillColor(COLORS.accent).fontSize(14).font('Helvetica-Bold').text(text);
  doc.moveTo(doc.x, doc.y + 2).lineTo(545, doc.y + 2).strokeColor(COLORS.rule).stroke();
  doc.moveDown(0.5);
  doc.fillColor(COLORS.subheading).font('Helvetica').fontSize(10);
}

function drawKeyValueRow(doc, label, value) {
  doc.font('Helvetica-Bold').fillColor(COLORS.muted).text(`${label}: `, { continued: true });
  doc.font('Helvetica').fillColor(COLORS.subheading).text(value || 'N/A');
}

/**
 * @param {import('http').ServerResponse} res - Express response to stream into
 * @param {object} report - output of exportService.compileEmployeeReport
 */
function generateEmployeePdf(res, report) {
  const { employee, manager, skills, certifications, notes, feedback, includesNotes, generatedAt } = report;

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(res);

  // --- Header ---
  doc.fillColor(COLORS.heading).fontSize(20).font('Helvetica-Bold').text(`${employee.first_name} ${employee.last_name}`);
  doc.fontSize(11).fillColor(COLORS.muted).font('Helvetica').text(`${employee.job_title || 'N/A'} · ${employee.department || 'N/A'}`);
  doc.moveDown(0.3);
  doc.fontSize(9).fillColor(COLORS.muted).text(`Report generated ${formatDate(generatedAt)}`);
  doc.moveTo(50, doc.y + 8).lineTo(545, doc.y + 8).strokeColor(COLORS.rule).stroke();

  // --- Profile ---
  drawSectionHeading(doc, 'Employee Profile');
  drawKeyValueRow(doc, 'Employee Code', employee.employee_code);
  drawKeyValueRow(doc, 'Email', employee.email);
  drawKeyValueRow(doc, 'Role', employee.role);
  drawKeyValueRow(doc, 'Department', employee.department);
  drawKeyValueRow(doc, 'Date of Joining', formatDate(employee.date_of_joining));
  drawKeyValueRow(doc, 'Manager', manager ? `${manager.first_name} ${manager.last_name}` : 'N/A');
  drawKeyValueRow(doc, 'Status', employee.is_active ? 'Active' : 'Deactivated');

  // --- Skills ---
  drawSectionHeading(doc, 'Skills');
  if (skills.length === 0) {
    doc.fillColor(COLORS.muted).text('No skills recorded.');
  } else {
    skills.forEach((s) => {
      doc
        .font('Helvetica-Bold')
        .fillColor(COLORS.subheading)
        .text(`${s.skill_name} `, { continued: true })
        .font('Helvetica')
        .fillColor(COLORS.muted)
        .text(`(${s.category}) — ${s.proficiency}, ${s.years_experience} yrs`);
    });
  }

  // --- Certifications ---
  drawSectionHeading(doc, 'Certifications');
  if (certifications.length === 0) {
    doc.fillColor(COLORS.muted).text('No certifications recorded.');
  } else {
    certifications.forEach((c) => {
      doc.font('Helvetica-Bold').fillColor(COLORS.subheading).text(c.name);
      doc
        .font('Helvetica')
        .fillColor(COLORS.muted)
        .text(
          `${c.issuing_organization || 'N/A'} · Issued ${formatDate(c.issue_date)}${
            c.expiry_date ? ' · Expires ' + formatDate(c.expiry_date) : ''
          }${c.credential_id ? ' · ID: ' + c.credential_id : ''}`
        );
      doc.moveDown(0.3);
    });
  }

  // --- Feedback history ---
  drawSectionHeading(doc, 'Feedback History');
  if (feedback.length === 0) {
    doc.fillColor(COLORS.muted).text('No submitted feedback on file.');
  } else {
    feedback.forEach((f) => {
      doc
        .font('Helvetica-Bold')
        .fillColor(COLORS.subheading)
        .text(`[${f.cycle_name}] ${f.type.toUpperCase()} review`, { continued: true })
        .font('Helvetica')
        .fillColor(COLORS.muted)
        .text(f.rating ? `  —  Rating: ${f.rating}/5  —  by ${f.reviewer_name}` : `  —  by ${f.reviewer_name}`);
      if (f.strengths) doc.font('Helvetica').fillColor(COLORS.subheading).text(`Strengths: ${f.strengths}`);
      if (f.improvement_areas) doc.text(`Areas for Improvement: ${f.improvement_areas}`);
      if (f.achievements) doc.text(`Achievements: ${f.achievements}`);
      if (f.goals) doc.text(`Goals: ${f.goals}`);
      if (f.comments) doc.text(`Comments: ${f.comments}`);
      doc.moveDown(0.5);
    });
  }

  // --- 1:1 Notes (Admin/HR export only) ---
  if (includesNotes) {
    drawSectionHeading(doc, '1:1 Meeting Notes (Internal — HR/Admin Only)');
    if (notes.length === 0) {
      doc.fillColor(COLORS.muted).text('No 1:1 notes on file.');
    } else {
      notes.forEach((n) => {
        doc
          .font('Helvetica-Bold')
          .fillColor(COLORS.subheading)
          .text(`${formatDate(n.meeting_date)}${n.title ? ' — ' + n.title : ''}`);
        doc
          .font('Helvetica')
          .fillColor(COLORS.muted)
          .text(`Logged by: ${n.uploaded_by_first_name || ''} ${n.uploaded_by_last_name || ''}`);
        if (n.note_text) doc.fillColor(COLORS.subheading).text(n.note_text);
        if (n.file_original_name) doc.fillColor(COLORS.muted).text(`Attachment: ${n.file_original_name}`);
        doc.moveDown(0.5);
      });
    }
  }

  doc.end();
}

/**
 * Department Report PDF (Phase 7).
 */
function generateDepartmentPdf(res, report) {
  const { department, headcount, avgRating, employeeRows, generatedAt } = report;
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(res);

  doc.fillColor(COLORS.heading).fontSize(20).font('Helvetica-Bold').text(`${department} — Department Report`);
  doc.fontSize(9).fillColor(COLORS.muted).font('Helvetica').text(`Generated ${formatDate(generatedAt)}`);
  doc.moveTo(50, doc.y + 8).lineTo(545, doc.y + 8).strokeColor(COLORS.rule).stroke();

  drawSectionHeading(doc, 'Summary');
  drawKeyValueRow(doc, 'Headcount', String(headcount));
  drawKeyValueRow(doc, 'Average Rating', avgRating != null ? `${avgRating}/5` : 'N/A');

  drawSectionHeading(doc, 'Employees');
  employeeRows.forEach((e) => {
    doc
      .font('Helvetica-Bold')
      .fillColor(COLORS.subheading)
      .text(`${e.name} `, { continued: true })
      .font('Helvetica')
      .fillColor(COLORS.muted)
      .text(
        `— ${e.jobTitle || 'N/A'} · Avg rating: ${e.avgRating != null ? e.avgRating + '/5' : 'N/A'} (${e.reviewCount} ratings)${
          e.isActive ? '' : ' · Inactive'
        }`
      );
  });

  doc.end();
}

/**
 * Review Cycle Report PDF (Phase 7).
 */
function generateCyclePdf(res, report) {
  const { cycle, byType, employeeRows, generatedAt } = report;
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(res);

  doc.fillColor(COLORS.heading).fontSize(20).font('Helvetica-Bold').text(`${cycle.name} — Review Cycle Report`);
  doc
    .fontSize(11)
    .fillColor(COLORS.muted)
    .font('Helvetica')
    .text(`${formatDate(cycle.start_date)} to ${formatDate(cycle.end_date)} · Status: ${cycle.status}`);
  doc.fontSize(9).text(`Generated ${formatDate(generatedAt)}`);
  doc.moveTo(50, doc.y + 8).lineTo(545, doc.y + 8).strokeColor(COLORS.rule).stroke();

  drawSectionHeading(doc, 'Completion by Type');
  Object.entries(byType).forEach(([type, counts]) => {
    const total = counts.submitted + counts.pending;
    drawKeyValueRow(doc, type[0].toUpperCase() + type.slice(1), `${counts.submitted}/${total} submitted`);
  });

  drawSectionHeading(doc, 'Employees Covered This Cycle');
  if (employeeRows.length === 0) {
    doc.fillColor(COLORS.muted).text('No employees have feedback recorded in this cycle yet.');
  } else {
    employeeRows.forEach((e) => {
      doc
        .font('Helvetica-Bold')
        .fillColor(COLORS.subheading)
        .text(`${e.name} `, { continued: true })
        .font('Helvetica')
        .fillColor(COLORS.muted)
        .text(
          `(${e.department || 'N/A'}) — ${e.submittedFeedback}/${e.totalFeedback} submitted, avg rating: ${
            e.avgRating != null ? e.avgRating + '/5' : 'N/A'
          }`
        );
    });
  }

  doc.end();
}

/**
 * Internal Notes report PDF (Item 6).
 */
function generateNotesPdf(res, report) {
  const { employee, notes, generatedAt } = report;
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(res);

  doc
    .fillColor(COLORS.heading)
    .fontSize(20)
    .font('Helvetica-Bold')
    .text(`${employee.first_name} ${employee.last_name} — Internal Notes`);
  doc
    .fontSize(11)
    .fillColor(COLORS.muted)
    .font('Helvetica')
    .text(`${employee.job_title || 'N/A'} · ${employee.department || 'N/A'}`);
  doc.fontSize(9).text(`Generated ${formatDate(generatedAt)} · Confidential — HR/Admin only`);
  doc.moveTo(50, doc.y + 8).lineTo(545, doc.y + 8).strokeColor(COLORS.rule).stroke();

  if (notes.length === 0) {
    doc.moveDown().fillColor(COLORS.muted).text('No internal notes recorded.');
  }

  notes.forEach((n) => {
    drawSectionHeading(doc, `${formatDate(n.meeting_date)}${n.title ? ' — ' + n.title : ''}`);
    doc.font('Helvetica').fillColor(COLORS.muted).fontSize(9).text(`Logged by ${n.uploaded_by_first_name} ${n.uploaded_by_last_name}`);
    doc.fontSize(10).fillColor(COLORS.subheading);
    if (n.discussion) doc.text(`Discussion: ${n.discussion}`);
    if (n.action_items) doc.text(`Action Items: ${n.action_items}`);
    if (!n.discussion && !n.action_items && n.note_text) doc.text(n.note_text);
    if (n.follow_up_date) doc.fillColor(COLORS.muted).fontSize(9).text(`Follow-up: ${formatDate(n.follow_up_date)}`);
    doc.moveDown(0.5);
  });

  doc.end();
}

module.exports = { generateEmployeePdf, generateDepartmentPdf, generateCyclePdf, generateNotesPdf };
