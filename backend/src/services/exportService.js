/**
 * Export service.
 * Compiles a single employee's full profile — role, DOJ, skills,
 * certifications, 1:1 notes, and feedback history — into one place for
 * PDF/Excel generation.
 *
 * Access: Admin/HR or the employee's direct manager only (per requirements).
 * The 1:1 notes section is INCLUDED only for Admin/HR — a manager's export
 * never contains notes, matching the same rule enforced everywhere else in
 * the app. Peer feedback reviewer identity is anonymized for managers,
 * same as the in-app feedback view.
 */
const userModel = require('../models/userModel');
const skillModel = require('../models/skillModel');
const certificationModel = require('../models/certificationModel');
const noteModel = require('../models/noteModel');
const feedbackModel = require('../models/feedbackModel');
const AppError = require('../utils/AppError');
const { ROLES, FEEDBACK_TYPE, isAdminTier } = require('../config/constants');

function assertCanExport(requesterUser, targetUser) {
  const isAdmin = isAdminTier(requesterUser.role);
  const isDirectManager = targetUser.manager_id === requesterUser.id;
  if (!isAdmin && !isDirectManager) {
    throw AppError.forbidden('Only HR/Admin or this employee\'s direct manager can export their report');
  }
  return { isAdmin };
}

function anonymizeIfPeer(entry, isAdmin) {
  if (isAdmin || entry.type !== FEEDBACK_TYPE.PEER) {
    return { ...entry, reviewer_name: `${entry.reviewer_first_name} ${entry.reviewer_last_name}` };
  }
  return { ...entry, reviewer_name: 'Anonymous peer' };
}

async function compileEmployeeReport(requesterUser, targetUserId) {
  const target = await userModel.findById(targetUserId);
  if (!target) throw AppError.notFound('Employee not found');

  const { isAdmin } = assertCanExport(requesterUser, target);

  const manager = target.manager_id ? await userModel.findById(target.manager_id) : null;

  const [skills, certifications, feedbackHistory] = await Promise.all([
    skillModel.listByUser(targetUserId),
    certificationModel.listByUser(targetUserId),
    feedbackModel.listAllForSubject(targetUserId), // submitted-only, all cycles
  ]);

  // 1:1 notes are Admin/HR-only, full stop — never compiled for a manager's export.
  const notes = isAdmin ? await noteModel.listByEmployee(targetUserId) : [];

  const feedback = feedbackHistory.map((f) => anonymizeIfPeer(f, isAdmin));

  return {
    employee: target,
    manager,
    skills,
    certifications,
    notes,
    feedback,
    includesNotes: isAdmin,
    generatedAt: new Date(),
  };
}

/**
 * Department Report (Phase 7) — Admin/HR only. Aggregate view of everyone
 * in a department: headcount, average rating, and a per-employee summary
 * row. Does not include 1:1 notes or full feedback text (that stays in
 * the per-employee report) — this is a roll-up, not a detail dump.
 */
async function compileDepartmentReport(requesterUser, department) {
  if (!isAdminTier(requesterUser.role)) {
    throw AppError.forbidden('Only HR/Admin can export department reports');
  }

  const employees = await userModel.listAll({ department, limit: 1000, offset: 0 });
  if (employees.length === 0) {
    throw AppError.notFound(`No employees found in department "${department}"`);
  }

  const analyticsModel = require('../models/analyticsModel');
  const deptAnalytics = await analyticsModel.getDepartmentAnalytics();
  const thisDept = deptAnalytics.find((d) => d.department === department) || null;

  // Per-employee average rating (submitted manager+peer ratings, all cycles).
  const employeeRows = await Promise.all(
    employees.map(async (emp) => {
      const feedback = await feedbackModel.listAllForSubject(emp.id);
      const ratings = feedback.filter((f) => f.rating !== null).map((f) => f.rating);
      const avgRating = ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100 : null;
      return {
        id: emp.id,
        name: `${emp.first_name} ${emp.last_name}`,
        jobTitle: emp.job_title,
        role: emp.role,
        avgRating,
        reviewCount: ratings.length,
        isActive: emp.is_active,
      };
    })
  );

  return {
    department,
    headcount: employees.length,
    avgRating: thisDept ? thisDept.avg_rating : null,
    employeeRows,
    generatedAt: new Date(),
  };
}

/**
 * Review Cycle Report (Phase 7) — Admin/HR only. Whole-cycle roll-up:
 * completion breakdown by type, average rating, and per-employee status.
 */
async function compileCycleReport(requesterUser, cycleId) {
  if (!isAdminTier(requesterUser.role)) {
    throw AppError.forbidden('Only HR/Admin can export review cycle reports');
  }

  const reviewCycleModel = require('../models/reviewCycleModel');
  const cycle = await reviewCycleModel.findById(cycleId);
  if (!cycle) throw AppError.notFound('Review cycle not found');

  const completionSummary = await feedbackModel.completionSummaryForCycle(cycleId);

  const byType = { self: { submitted: 0, pending: 0 }, manager: { submitted: 0, pending: 0 }, peer: { submitted: 0, pending: 0 } };
  completionSummary.forEach((row) => {
    if (byType[row.type]) byType[row.type][row.status] = row.count;
  });

  // Per-subject rollup: who's covered, and their average rating this cycle.
  const { query } = require('../config/db');
  const subjectsResult = await query(
    `SELECT DISTINCT f.subject_id, u.first_name, u.last_name, u.department
     FROM feedback f JOIN users u ON u.id = f.subject_id
     WHERE f.review_cycle_id = $1`,
    [cycleId]
  );

  const employeeRows = await Promise.all(
    subjectsResult.rows.map(async (row) => {
      const feedback = await feedbackModel.listForSubjectInCycle(row.subject_id, cycleId);
      const submitted = feedback.filter((f) => f.status === 'submitted');
      const ratings = submitted.filter((f) => f.rating !== null).map((f) => f.rating);
      const avgRating = ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100 : null;
      return {
        name: `${row.first_name} ${row.last_name}`,
        department: row.department,
        totalFeedback: feedback.length,
        submittedFeedback: submitted.length,
        avgRating,
      };
    })
  );

  return {
    cycle,
    byType,
    employeeRows,
    generatedAt: new Date(),
  };
}

/**
 * Internal Notes report (Item 6) — Admin/HR-tier only, obviously, given
 * these notes are never visible to the employee or their manager anywhere
 * else in the app either.
 */
async function compileNotesReport(requesterUser, employeeId) {
  if (!isAdminTier(requesterUser.role)) {
    throw AppError.forbidden('Only HR/Admin can export Internal Notes');
  }
  const employee = await userModel.findById(employeeId);
  if (!employee) throw AppError.notFound('Employee not found');

  const notes = await noteModel.listByEmployee(employeeId);

  return { employee, notes, generatedAt: new Date() };
}

module.exports = { compileEmployeeReport, compileDepartmentReport, compileCycleReport, compileNotesReport };
