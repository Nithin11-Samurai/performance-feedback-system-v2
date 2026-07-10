/**
 * Review approval service.
 * Approving is Admin/HR-only. Viewing an approval (including its HR
 * comment) follows the same visibility rule as feedback itself: self,
 * direct manager, or Admin — this is meant to be seen, not hidden like
 * 1:1 notes.
 */
const reviewApprovalModel = require('../models/reviewApprovalModel');
const userModel = require('../models/userModel');
const reviewCycleModel = require('../models/reviewCycleModel');
const feedbackModel = require('../models/feedbackModel');
const notificationService = require('./notificationService');
const AppError = require('../utils/AppError');
const { ROLES, isAdminTier } = require('../config/constants');

async function assertCycleExists(cycleId) {
  const cycle = await reviewCycleModel.findById(cycleId);
  if (!cycle) throw AppError.notFound('Review cycle not found');
  return cycle;
}

function assertCanView(requesterUser, subject) {
  const isAdmin = isAdminTier(requesterUser.role);
  const isSelf = requesterUser.id === subject.id;
  const isDirectManager = subject.manager_id === requesterUser.id;
  if (!isAdmin && !isSelf && !isDirectManager) {
    throw AppError.forbidden('You do not have permission to view this approval');
  }
}

async function approveEmployee(adminUser, cycleId, subjectId, hrComments) {
  const cycle = await assertCycleExists(cycleId);
  const subject = await userModel.findById(subjectId);
  if (!subject) throw AppError.notFound('Employee not found');

  // Sanity check: there should be at least some feedback before HR signs off.
  const allFeedback = await feedbackModel.listForSubjectInCycle(subjectId, cycleId);
  if (allFeedback.length === 0) {
    throw AppError.badRequest('This employee has no feedback recorded in this cycle yet.');
  }

  const approval = await reviewApprovalModel.upsert({
    reviewCycleId: cycleId,
    subjectId,
    approvedBy: adminUser.id,
    hrComments,
  });

  // "Send collective feedback to employee" — let them know their
  // consolidated review for this cycle is ready to view.
  await notificationService.notifyUser({
    userId: subject.id,
    type: 'review_submitted',
    title: `Your feedback for "${cycle.name}" is ready`,
    message: hrComments
      ? `HR has shared your consolidated feedback for "${cycle.name}": ${hrComments}`
      : `HR has finalized and shared your consolidated feedback for "${cycle.name}". Head to Reviews to see it.`,
    link: `/reviews/${cycleId}`,
    email: subject.email,
    recipientName: subject.first_name,
  });

  return approval;
}

async function revokeApproval(cycleId, subjectId) {
  await assertCycleExists(cycleId);
  const removed = await reviewApprovalModel.remove(cycleId, subjectId);
  if (!removed) throw AppError.notFound('No approval found to revoke');
}

async function getApproval(requesterUser, cycleId, subjectId) {
  const subject = await userModel.findById(subjectId);
  if (!subject) throw AppError.notFound('Employee not found');
  assertCanView(requesterUser, subject);
  return reviewApprovalModel.find(cycleId, subjectId);
}

async function listApprovalsForCycle(cycleId) {
  await assertCycleExists(cycleId);
  return reviewApprovalModel.listForCycle(cycleId);
}

module.exports = { approveEmployee, revokeApproval, getApproval, listApprovalsForCycle };
