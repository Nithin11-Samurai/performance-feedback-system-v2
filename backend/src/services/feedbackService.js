/**
 * Feedback service.
 *
 * Submission rules:
 *   - Self:    an employee may only write a self-review about themself.
 *   - Manager: only the subject's DIRECT manager may write manager feedback.
 *   - Peer:    only someone explicitly assigned (peer_review_assignments)
 *              may write peer feedback for that subject in that cycle.
 * All three require the cycle to be 'active' — no submissions before it
 * opens or after it closes.
 *
 * Visibility rules (see listFeedbackForSubject):
 *   - Admin sees everything, full identities.
 *   - The subject sees their own self-review and manager feedback in full,
 *     but peer feedback with the reviewer's name masked (anonymous 360).
 *   - The subject's manager sees the self-review and peer feedback
 *     (anonymized) for their report, plus their own manager feedback.
 */
const feedbackModel = require('../models/feedbackModel');
const reviewCycleModel = require('../models/reviewCycleModel');
const userModel = require('../models/userModel');
const peerAssignmentModel = require('../models/peerAssignmentModel');
const notificationService = require('./notificationService');
const AppError = require('../utils/AppError');
const { FEEDBACK_TYPE, ASSIGNABLE_REVIEWER_TYPES, REVIEW_CYCLE_STATUS, ROLES, isAdminTier } = require('../config/constants');

async function assertCycleActive(cycleId) {
  const cycle = await reviewCycleModel.findById(cycleId);
  if (!cycle) throw AppError.notFound('Review cycle not found');
  if (cycle.status !== REVIEW_CYCLE_STATUS.ACTIVE) {
    throw AppError.badRequest(`This review cycle is '${cycle.status}'. Feedback can only be submitted while it is active.`);
  }
  return cycle;
}

async function saveDraft({ cycleId, subjectId, reviewerId, type, rating, strengths, improvementAreas, comments, achievements, goals }) {
  const result = await feedbackModel.upsertDraft({
    reviewCycleId: cycleId,
    subjectId,
    reviewerId,
    type,
    rating,
    strengths,
    improvementAreas,
    comments,
    achievements,
    goals,
  });
  if (result === null) {
    throw AppError.badRequest('This feedback has already been submitted and can no longer be edited');
  }
  return result;
}

// --- Self review ---

async function submitSelfReview(employeeUser, cycleId, payload) {
  await assertCycleActive(cycleId);
  return saveDraft({
    cycleId,
    subjectId: employeeUser.id,
    reviewerId: employeeUser.id,
    type: FEEDBACK_TYPE.SELF,
    rating: null,
    strengths: payload.strengths,
    improvementAreas: payload.improvementAreas,
    comments: payload.comments,
    achievements: payload.achievements,
    goals: payload.goals,
  });
}

// --- Manager review ---

async function submitManagerReview(managerUser, cycleId, subjectId, payload) {
  await assertCycleActive(cycleId);

  const subject = await userModel.findById(subjectId);
  if (!subject) throw AppError.notFound('Employee not found');
  if (subject.manager_id !== managerUser.id) {
    throw AppError.forbidden('You can only submit manager feedback for your own direct reports');
  }

  const feedback = await saveDraft({
    cycleId,
    subjectId,
    reviewerId: managerUser.id,
    type: FEEDBACK_TYPE.MANAGER,
    rating: payload.rating,
    strengths: payload.strengths,
    improvementAreas: payload.improvementAreas,
    comments: payload.comments,
    achievements: payload.achievements,
    goals: payload.goals,
  });

  return feedback;
}

// --- Peer (360) review ---

/**
 * Generic submission for any "assigned" reviewer type (peer, hr,
 * skip_level, project_lead, mentor — Feature 4). Each requires an explicit
 * HR-created assignment before that person can submit feedback for that
 * subject in that cycle.
 */
async function submitAssignedReview(reviewerUser, cycleId, subjectId, reviewerType, payload) {
  await assertCycleActive(cycleId);

  if (!ASSIGNABLE_REVIEWER_TYPES.includes(reviewerType)) {
    throw AppError.badRequest(`Invalid reviewer type: ${reviewerType}`);
  }
  if (reviewerUser.id === subjectId) {
    throw AppError.badRequest('Use the self-review endpoint to review yourself');
  }

  const isAssigned = await peerAssignmentModel.exists(cycleId, subjectId, reviewerUser.id, reviewerType);
  if (!isAssigned) {
    throw AppError.forbidden(`You have not been assigned as a ${reviewerType.replace(/_/g, ' ')} reviewer for this employee in this cycle`);
  }

  return saveDraft({
    cycleId,
    subjectId,
    reviewerId: reviewerUser.id,
    type: reviewerType,
    rating: payload.rating,
    strengths: payload.strengths,
    improvementAreas: payload.improvementAreas,
    comments: payload.comments,
    achievements: payload.achievements,
    goals: payload.goals,
  });
}

// Backward-compatible wrapper — existing routes/frontend calling this
// directly keep working exactly as before.
async function submitPeerReview(reviewerUser, cycleId, subjectId, payload) {
  return submitAssignedReview(reviewerUser, cycleId, subjectId, FEEDBACK_TYPE.PEER, payload);
}

// --- Submit (lock) a draft ---

async function submitFeedback(requesterUser, feedbackId) {
  const feedback = await feedbackModel.findById(feedbackId);
  if (!feedback) throw AppError.notFound('Feedback not found');
  if (feedback.reviewer_id !== requesterUser.id && !isAdminTier(requesterUser.role)) {
    throw AppError.forbidden('You can only submit your own feedback');
  }

  const submitted = await feedbackModel.markSubmitted(feedbackId);
  if (!submitted) {
    throw AppError.badRequest('This feedback has already been submitted');
  }

  // Notify the subject when manager feedback lands (self/peer feedback
  // notifications are omitted here to avoid over-notifying; HR can see
  // everything from the dashboard regardless).
  if (submitted.type === FEEDBACK_TYPE.MANAGER) {
    const subject = await userModel.findById(submitted.subject_id);
    if (subject) {
      notificationService
        .notifyUser({
          userId: subject.id,
          type: 'review_submitted',
          title: 'Your manager has submitted feedback',
          message: 'New manager feedback is available for you to review.',
          link: `/reviews/${submitted.review_cycle_id}`,
          email: subject.email,
          recipientName: subject.first_name,
        })
        .catch(() => {});
    }
  }

  // Feature 2: "Review completed" — fires once every piece of feedback for
  // this subject in this cycle (self + manager + all assigned reviewers)
  // has been submitted, not just this one entry.
  checkAndNotifyReviewCompleted(submitted.subject_id, submitted.review_cycle_id).catch(() => {});

  return submitted;
}

/**
 * Checks whether all feedback for a subject+cycle is now submitted, and if
 * so, notifies the subject and all Admins that their review is complete.
 * Fire-and-forget — never blocks the actual submission.
 */
async function checkAndNotifyReviewCompleted(subjectId, cycleId) {
  const allFeedback = await feedbackModel.listForSubjectInCycle(subjectId, cycleId);
  if (allFeedback.length === 0) return;

  const allSubmitted = allFeedback.every((f) => f.status === 'submitted');
  if (!allSubmitted) return;

  const [subject, cycle] = await Promise.all([userModel.findById(subjectId), reviewCycleModel.findById(cycleId)]);
  if (!subject || !cycle) return;

  await notificationService.notifyUser({
    userId: subject.id,
    type: 'review_submitted',
    title: 'Your review is complete',
    message: `All feedback for you in the "${cycle.name}" cycle has now been submitted.`,
    link: `/reviews/${cycleId}`,
    email: subject.email,
    recipientName: subject.first_name,
    fields: { Employee: `${subject.first_name} ${subject.last_name}`, 'Review Cycle': cycle.name },
  });

  await notificationService.notifyAdmins({
    type: 'review_submitted',
    title: 'Employee review completed',
    message: `${subject.first_name} ${subject.last_name}'s review for "${cycle.name}" is now fully submitted and ready for HR review.`,
    link: `/admin/employees/${subjectId}`,
  });
}

// --- Visibility-aware retrieval ---

function anonymizePeerEntry(entry) {
  const { reviewer_id, reviewer_first_name, reviewer_last_name, ...rest } = entry;
  return { ...rest, reviewer_name: 'Anonymous peer' };
}

async function listFeedbackForSubject(requesterUser, subjectId, cycleId) {
  const subject = await userModel.findById(subjectId);
  if (!subject) throw AppError.notFound('Employee not found');

  const isAdmin = isAdminTier(requesterUser.role);
  const isSelf = requesterUser.id === subjectId;
  const isDirectManager = subject.manager_id === requesterUser.id;

  if (!isAdmin && !isSelf && !isDirectManager) {
    throw AppError.forbidden('You do not have permission to view this feedback');
  }

  const rows = await feedbackModel.listForSubjectInCycle(subjectId, cycleId);

  // Only ever show SUBMITTED feedback to non-admins — drafts are private
  // to the reviewer until they finalize.
  const visibleRows = isAdmin ? rows : rows.filter((r) => r.status === 'submitted' || r.reviewer_id === requesterUser.id);

  if (isAdmin) {
    return visibleRows.map((r) => ({ ...r, reviewer_name: `${r.reviewer_first_name} ${r.reviewer_last_name}` }));
  }

  return visibleRows.map((r) => {
    const withName = { ...r, reviewer_name: `${r.reviewer_first_name} ${r.reviewer_last_name}` };
    if (r.type === FEEDBACK_TYPE.PEER && r.reviewer_id !== requesterUser.id) {
      return anonymizePeerEntry(withName);
    }
    return withName;
  });
}

/**
 * Full submitted-feedback history across ALL cycles for a subject — powers
 * the "Performance History" tab on the employee profile page. Reuses
 * feedbackModel.listAllForSubject (already built for the PDF/Excel export
 * in exportService) and applies the exact same visibility/anonymization
 * rules as listFeedbackForSubject.
 */
async function listFullHistoryForSubject(requesterUser, subjectId) {
  const subject = await userModel.findById(subjectId);
  if (!subject) throw AppError.notFound('Employee not found');

  const isAdmin = isAdminTier(requesterUser.role);
  const isSelf = requesterUser.id === subjectId;
  const isDirectManager = subject.manager_id === requesterUser.id;

  if (!isAdmin && !isSelf && !isDirectManager) {
    throw AppError.forbidden('You do not have permission to view this feedback');
  }

  const rows = await feedbackModel.listAllForSubject(subjectId); // submitted-only already

  return rows.map((r) => {
    const withName = { ...r, reviewer_name: `${r.reviewer_first_name} ${r.reviewer_last_name}` };
    if (!isAdmin && r.type === FEEDBACK_TYPE.PEER && r.reviewer_id !== requesterUser.id) {
      return anonymizePeerEntry(withName);
    }
    return withName;
  });
}

/**
 * "Send individual feedback to employee" — HR/Admin explicitly notifies
 * the subject about one specific piece of already-submitted feedback,
 * rather than waiting for them to notice it in Reviews on their own.
 * Only makes sense for feedback the subject is actually allowed to see
 * (submitted, and not an anonymized peer entry from someone else).
 */
async function notifyEmployeeAboutFeedback(adminUser, feedbackId) {
  if (!isAdminTier(adminUser.role)) {
    throw AppError.forbidden('Only HR/Admin can send individual feedback notifications');
  }

  const feedback = await feedbackModel.findById(feedbackId);
  if (!feedback) throw AppError.notFound('Feedback not found');
  if (feedback.status !== 'submitted') {
    throw AppError.badRequest('This feedback has not been submitted yet — nothing to send.');
  }

  const [subject, cycle] = await Promise.all([
    userModel.findById(feedback.subject_id),
    reviewCycleModel.findById(feedback.review_cycle_id),
  ]);
  if (!subject || !cycle) throw AppError.notFound('Employee or cycle not found');

  const typeLabel = feedback.type.replace(/_/g, ' ');

  await notificationService.notifyUser({
    userId: subject.id,
    type: 'review_submitted',
    title: `New ${typeLabel} feedback shared with you`,
    message: `HR has flagged a piece of ${typeLabel} feedback from your "${cycle.name}" review for you to check out.`,
    link: `/reviews/${feedback.review_cycle_id}`,
    email: subject.email,
    recipientName: subject.first_name,
  });

  return { sent: true };
}

module.exports = {
  submitSelfReview,
  submitManagerReview,
  submitPeerReview,
  submitAssignedReview,
  submitFeedback,
  listFeedbackForSubject,
  listFullHistoryForSubject,
  notifyEmployeeAboutFeedback,
};
