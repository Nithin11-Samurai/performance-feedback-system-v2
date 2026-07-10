/**
 * Review cycle service.
 * Cycle CRUD and status transitions are Admin/HR-only. Peer assignment
 * management lives here too since it's conceptually part of running a cycle.
 */
const reviewCycleModel = require('../models/reviewCycleModel');
const peerAssignmentModel = require('../models/peerAssignmentModel');
const feedbackModel = require('../models/feedbackModel');
const userModel = require('../models/userModel');
const notificationService = require('./notificationService');
const AppError = require('../utils/AppError');
const { REVIEW_CYCLE_STATUS, FEEDBACK_TYPE, ASSIGNABLE_REVIEWER_TYPES } = require('../config/constants');

const VALID_TRANSITIONS = {
  [REVIEW_CYCLE_STATUS.DRAFT]: [REVIEW_CYCLE_STATUS.ACTIVE],
  [REVIEW_CYCLE_STATUS.ACTIVE]: [REVIEW_CYCLE_STATUS.CLOSED],
  [REVIEW_CYCLE_STATUS.CLOSED]: [], // closed cycles are final
};

async function listCycles(filters) {
  return reviewCycleModel.list(filters);
}

async function getCycle(cycleId) {
  const cycle = await reviewCycleModel.findById(cycleId);
  if (!cycle) throw AppError.notFound('Review cycle not found');
  return cycle;
}

async function createCycle(adminUser, payload) {
  return reviewCycleModel.create({
    name: payload.name,
    startDate: payload.startDate,
    endDate: payload.endDate,
    createdBy: adminUser.id,
  });
}

async function updateCycle(cycleId, payload) {
  const cycle = await getCycle(cycleId);

  const fields = {};
  if (payload.name !== undefined) fields.name = payload.name;
  if (payload.startDate !== undefined) fields.start_date = payload.startDate;
  if (payload.endDate !== undefined) fields.end_date = payload.endDate;

  if (payload.status !== undefined && payload.status !== cycle.status) {
    const allowedNext = VALID_TRANSITIONS[cycle.status] || [];
    if (!allowedNext.includes(payload.status)) {
      throw AppError.badRequest(
        `Cannot transition cycle from '${cycle.status}' to '${payload.status}'. Allowed: ${allowedNext.join(', ') || 'none'}`
      );
    }
    fields.status = payload.status;
  }

  const updated = await reviewCycleModel.update(cycleId, fields);

  // Notify everyone with an active-cycle nudge once it goes live.
  if (fields.status === REVIEW_CYCLE_STATUS.ACTIVE) {
    notifyCycleActivated(updated).catch(() => {});
  }
  // Feature 2: "Review cycle completed" — notify everyone who
  // participated once HR closes the cycle.
  if (fields.status === REVIEW_CYCLE_STATUS.CLOSED) {
    notifyCycleClosed(updated).catch(() => {});
  }

  return updated;
}

async function notifyCycleActivated(cycle) {
  // In a real system this would be scoped/paginated; fine for typical
  // company sizes as a straightforward "notify everyone" broadcast.
  const { query } = require('../config/db');
  const result = await query('SELECT id, email, first_name FROM users WHERE is_active = TRUE');
  await Promise.all(
    result.rows.map((u) =>
      notificationService.notifyUser({
        userId: u.id,
        type: 'review_assigned',
        title: `Review cycle "${cycle.name}" is now open`,
        message: `The review cycle "${cycle.name}" is active from ${cycle.start_date} to ${cycle.end_date}. Please complete your reviews before it closes.`,
        link: `/reviews/${cycle.id}`,
        email: u.email,
        recipientName: u.first_name,
        fields: { 'Review Type': 'Review cycle opened', 'Due Date': new Date(cycle.end_date).toLocaleDateString() },
      })
    )
  );
}

async function notifyCycleClosed(cycle) {
  // Notify everyone who actually has at least one feedback row in this
  // cycle (subject or reviewer), not the whole company — more targeted
  // than the activation broadcast.
  const { query } = require('../config/db');
  const result = await query(
    `SELECT DISTINCT u.id, u.email, u.first_name
     FROM users u
     WHERE u.id IN (
       SELECT subject_id FROM feedback WHERE review_cycle_id = $1
       UNION
       SELECT reviewer_id FROM feedback WHERE review_cycle_id = $1
     ) AND u.is_active = TRUE`,
    [cycle.id]
  );
  await Promise.all(
    result.rows.map((u) =>
      notificationService.notifyUser({
        userId: u.id,
        type: 'cycle_closing_soon',
        title: `Review cycle "${cycle.name}" has closed`,
        message: `The "${cycle.name}" review cycle is now closed. No further feedback can be submitted for it.`,
        link: `/reviews/${cycle.id}`,
        email: u.email,
        recipientName: u.first_name,
      })
    )
  );
}

async function deleteCycle(cycleId) {
  const cycle = await getCycle(cycleId);
  if (cycle.status !== REVIEW_CYCLE_STATUS.DRAFT) {
    throw AppError.badRequest('Only draft cycles can be deleted. Close or archive active/closed cycles instead.');
  }
  await reviewCycleModel.remove(cycleId);
}

// --- Peer assignments ---

async function assignPeerReviewer(adminUser, cycleId, subjectId, reviewerId, reviewerType = FEEDBACK_TYPE.PEER) {
  await getCycle(cycleId); // ensures cycle exists
  const subject = await userModel.findById(subjectId);
  const reviewer = await userModel.findById(reviewerId);
  if (!subject) throw AppError.notFound('Subject (employee being reviewed) not found');
  if (!reviewer) throw AppError.notFound('Reviewer not found');

  if (!ASSIGNABLE_REVIEWER_TYPES.includes(reviewerType)) {
    throw AppError.badRequest(`reviewerType must be one of: ${ASSIGNABLE_REVIEWER_TYPES.join(', ')}`);
  }

  const alreadyAssigned = await peerAssignmentModel.exists(cycleId, subjectId, reviewerId, reviewerType);
  if (alreadyAssigned) {
    throw AppError.conflict('This reviewer is already assigned this reviewer type for this employee and cycle');
  }

  const assignment = await peerAssignmentModel.create({
    reviewCycleId: cycleId,
    subjectId,
    reviewerId,
    reviewerType,
    assignedBy: adminUser.id,
  });

  const typeLabel = reviewerType.replace(/_/g, ' ');
  notificationService
    .notifyUser({
      userId: reviewerId,
      type: 'review_assigned',
      title: `You have been asked to give ${typeLabel} feedback`,
      message: `You've been assigned as a ${typeLabel} reviewer for ${subject.first_name} ${subject.last_name}.`,
      link: `/reviews/${cycleId}/${reviewerType}/${subjectId}`,
      email: reviewer.email,
      recipientName: reviewer.first_name,
    })
    .catch(() => {});

  return assignment;
}

async function listAssignmentsForCycle(cycleId) {
  await getCycle(cycleId);
  return peerAssignmentModel.listForCycle(cycleId);
}

async function listMyAssignments(reviewerId, cycleId) {
  await getCycle(cycleId);
  return peerAssignmentModel.listAssignmentsForReviewer(cycleId, reviewerId);
}

// Powers the Reviewers tab on the Employee Detail page: every named
// (non-anonymous) reviewer assigned to a specific employee in a cycle.
async function listAssignmentsForSubject(cycleId, subjectId) {
  await getCycle(cycleId);
  return peerAssignmentModel.listAssignmentsForSubject(cycleId, subjectId);
}

async function removeAssignment(assignmentId) {
  const removed = await peerAssignmentModel.remove(assignmentId);
  if (!removed) throw AppError.notFound('Assignment not found');
}

async function getCompletionSummary(cycleId) {
  await getCycle(cycleId);
  return feedbackModel.completionSummaryForCycle(cycleId);
}

module.exports = {
  listCycles,
  getCycle,
  createCycle,
  updateCycle,
  deleteCycle,
  assignPeerReviewer,
  listAssignmentsForCycle,
  listMyAssignments,
  listAssignmentsForSubject,
  removeAssignment,
  getCompletionSummary,
};
