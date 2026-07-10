/**
 * AI summary service.
 * Orchestrates: gather feedback + skills + certifications -> build prompt ->
 * call Claude -> cache in ai_summaries. Regeneration is explicit (a fresh
 * API call costs money and takes a few seconds, so we never silently
 * regenerate on every page view).
 */
const aiSummaryModel = require('../models/aiSummaryModel');
const feedbackModel = require('../models/feedbackModel');
const skillModel = require('../models/skillModel');
const certificationModel = require('../models/certificationModel');
const userModel = require('../models/userModel');
const reviewCycleModel = require('../models/reviewCycleModel');
const claudeService = require('./claudeService');
const AppError = require('../utils/AppError');
const config = require('../config/env');
const { ROLES, isAdminTier } = require('../config/constants');

function assertCanGenerate(requesterUser, subject) {
  const isAdmin = isAdminTier(requesterUser.role);
  const isDirectManager = subject.manager_id === requesterUser.id;
  if (!isAdmin && !isDirectManager) {
    throw AppError.forbidden('Only HR/Admin or the employee\'s direct manager can generate an AI summary');
  }
}

function assertCanView(requesterUser, subject) {
  const isAdmin = isAdminTier(requesterUser.role);
  const isSelf = requesterUser.id === subject.id;
  const isDirectManager = subject.manager_id === requesterUser.id;
  if (!isAdmin && !isSelf && !isDirectManager) {
    throw AppError.forbidden('You do not have permission to view this summary');
  }
}

async function getCachedSummary(requesterUser, subjectId, cycleId) {
  const subject = await userModel.findById(subjectId);
  if (!subject) throw AppError.notFound('Employee not found');
  assertCanView(requesterUser, subject);

  const summary = await aiSummaryModel.find(subjectId, cycleId);
  return summary; // null if never generated
}

async function generateSummary(requesterUser, subjectId, cycleId) {
  const subject = await userModel.findById(subjectId);
  if (!subject) throw AppError.notFound('Employee not found');
  assertCanGenerate(requesterUser, subject);

  const cycle = await reviewCycleModel.findById(cycleId);
  if (!cycle) throw AppError.notFound('Review cycle not found');

  const [feedbackEntries, skills, certifications] = await Promise.all([
    feedbackModel.listForSubjectInCycle(subjectId, cycleId),
    skillModel.listByUser(subjectId),
    certificationModel.listByUser(subjectId),
  ]);

  const submittedFeedback = feedbackEntries.filter((f) => f.status === 'submitted');

  if (submittedFeedback.length === 0) {
    throw AppError.badRequest('No submitted feedback exists yet for this employee in this cycle — nothing to summarize.');
  }

  const summaryText = await claudeService.generatePerformanceSummary({
    employee: subject,
    cycle,
    feedbackEntries: submittedFeedback,
    skills,
    certifications,
  });

  const saved = await aiSummaryModel.upsert({
    subjectId,
    reviewCycleId: cycleId,
    summaryText,
    generatedBy: requesterUser.id,
    modelUsed: config.claude.model,
  });

  return saved;
}

module.exports = { getCachedSummary, generateSummary };
