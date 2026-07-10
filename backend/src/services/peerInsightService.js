/**
 * Peer Insights service (Item 9).
 *
 * Core rules:
 *  - Only Admin/HR-tier roles can create groups, start rounds, view raw
 *    (identified) feedback, write/release summaries.
 *  - A reviewer only ever sees their OWN assignments (who they need to
 *    review), never who else is reviewing whom.
 *  - A subject NEVER sees raw peer feedback or reviewer identities —
 *    only the HR-curated summary, and only after HR explicitly releases it.
 *  - The Quick Action (startRoundWithAssignments) auto-generates a full
 *    round-robin: every member reviews every other member in the group.
 */
const peerInsightModel = require('../models/peerInsightModel');
const userModel = require('../models/userModel');
const notificationService = require('./notificationService');
const claudeService = require('./claudeService');
const AppError = require('../utils/AppError');
const { isAdminTier, FEEDBACK_CATEGORIES, LIKERT_SCALE } = require('../config/constants');

function assertAdminTier(requesterUser) {
  if (!isAdminTier(requesterUser.role)) {
    throw AppError.forbidden('Only HR/Admin can manage 360° Feedback');
  }
}

// --- Project groups ---

async function createGroup(requesterUser, { name, description, memberIds }) {
  assertAdminTier(requesterUser);
  if (!name || !name.trim()) throw AppError.badRequest('Group name is required');

  const group = await peerInsightModel.createGroup({ name: name.trim(), description, createdBy: requesterUser.id });

  if (Array.isArray(memberIds)) {
    for (const userId of memberIds) {
      await peerInsightModel.addMember(group.id, userId);
    }
  }
  return group;
}

async function listGroups(requesterUser) {
  assertAdminTier(requesterUser);
  const groups = await peerInsightModel.listGroups();
  return Promise.all(
    groups.map(async (g) => ({ ...g, members: await peerInsightModel.listMembers(g.id) }))
  );
}

async function getGroup(requesterUser, groupId) {
  assertAdminTier(requesterUser);
  const group = await peerInsightModel.findGroupById(groupId);
  if (!group) throw AppError.notFound('Project group not found');
  const members = await peerInsightModel.listMembers(groupId);
  return { ...group, members };
}

async function addMember(requesterUser, groupId, userId) {
  assertAdminTier(requesterUser);
  const user = await userModel.findById(userId);
  if (!user) throw AppError.notFound('Employee not found');
  return peerInsightModel.addMember(groupId, userId);
}

async function removeMember(requesterUser, groupId, userId) {
  assertAdminTier(requesterUser);
  await peerInsightModel.removeMember(groupId, userId);
}

async function deleteGroup(requesterUser, groupId) {
  assertAdminTier(requesterUser);
  const removed = await peerInsightModel.deleteGroup(groupId);
  if (!removed) throw AppError.notFound('Project group not found');
}

// --- Rounds + Quick Action ---

/**
 * The "Quick Action" (Item 9): HR clicks one button, and every member of
 * the group is assigned to anonymously review every OTHER member. Runs
 * typically every 6 months, but HR triggers it manually rather than a
 * rigid automatic schedule (gives HR control over timing).
 */
async function startRoundWithAssignments(requesterUser, groupId, roundName) {
  assertAdminTier(requesterUser);

  const group = await peerInsightModel.findGroupById(groupId);
  if (!group) throw AppError.notFound('Project group not found');

  const members = await peerInsightModel.listMembers(groupId);
  if (members.length < 2) {
    throw AppError.badRequest('A project group needs at least 2 members to run a 360° Feedback round');
  }

  const round = await peerInsightModel.createRound({
    groupId,
    name: roundName || `${group.name} — 360° Feedback`,
    startedBy: requesterUser.id,
  });

  // Full round-robin: everyone reviews everyone else.
  const pairs = [];
  for (const subject of members) {
    for (const reviewer of members) {
      if (subject.id !== reviewer.id) {
        pairs.push({ subjectId: subject.id, reviewerId: reviewer.id });
      }
    }
  }
  await peerInsightModel.bulkCreateAssignments(round.id, pairs);

  // Notify each reviewer they have peer reviews to complete — WITHOUT
  // revealing who else is reviewing the same people, and without ever
  // telling the SUBJECT they're being reviewed (anonymity, Item 9).
  const reviewerIds = [...new Set(pairs.map((p) => p.reviewerId))];
  await Promise.all(
    reviewerIds.map(async (reviewerId) => {
      const reviewer = members.find((m) => m.id === reviewerId);
      await notificationService.notifyUser({
        userId: reviewerId,
        type: 'review_assigned',
        title: '360° Feedback requested',
        message: `You've been asked to anonymously review your teammates on "${group.name}". Your responses are never shared with them.`,
        link: '/peer-insights',
        email: reviewer?.email,
        recipientName: reviewer?.first_name,
      });
    })
  );

  return round;
}

async function listRoundsForGroup(requesterUser, groupId) {
  assertAdminTier(requesterUser);
  return peerInsightModel.listRoundsForGroup(groupId);
}

async function closeRound(requesterUser, roundId) {
  assertAdminTier(requesterUser);
  const round = await peerInsightModel.closeRound(roundId);
  if (!round) throw AppError.notFound('Round not found');
  return round;
}

async function getCompletionSummary(requesterUser, roundId) {
  assertAdminTier(requesterUser);
  return peerInsightModel.getCompletionSummary(roundId);
}

async function listSubjectsInRound(requesterUser, roundId) {
  assertAdminTier(requesterUser);
  return peerInsightModel.listSubjectsInRound(roundId);
}

// --- Reviewer-facing (anonymous submission) ---

/** What am I (the logged-in user) assigned to review, in this round? */
async function listMyAssignments(requesterUser, roundId) {
  return peerInsightModel.listAssignmentsForReviewer(roundId, requesterUser.id);
}

/** Every pending assignment across every active round — powers the
 *  employee-facing "My Peer Reviews" list without needing a round ID. */
async function listAllMyPendingAssignments(requesterUser) {
  return peerInsightModel.listAllPendingAssignmentsForReviewer(requesterUser.id);
}

async function saveDraft(requesterUser, feedbackId, payload) {
  const feedback = await peerInsightModel.findFeedbackById(feedbackId);
  if (!feedback) throw AppError.notFound('Assignment not found');
  if (feedback.reviewer_id !== requesterUser.id) {
    throw AppError.forbidden('You can only submit your own peer review');
  }
  const updated = await peerInsightModel.saveDraft(feedbackId, payload);
  if (!updated) throw AppError.badRequest('This feedback has already been submitted');
  return updated;
}

async function submitFeedback(requesterUser, feedbackId) {
  const feedback = await peerInsightModel.findFeedbackById(feedbackId);
  if (!feedback) throw AppError.notFound('Assignment not found');
  if (feedback.reviewer_id !== requesterUser.id) {
    throw AppError.forbidden('You can only submit your own peer review');
  }

  // Item 2: every category selection is mandatory, as is the Overall
  // Rating — comments stay optional. Enforced here too (not just in the
  // form) so a submission can't be forced through some other client.
  const scores = feedback.category_scores || {};
  const missing = FEEDBACK_CATEGORIES.filter((c) => {
    const v = scores[c.key]?.score;
    return !(Number.isInteger(v) && v >= 1 && v <= 5);
  });
  if (missing.length > 0) {
    throw AppError.badRequest(`Please answer: ${missing.map((c) => c.label).join(', ')}`);
  }
  if (!Number.isInteger(feedback.rating) || feedback.rating < 1 || feedback.rating > 5) {
    throw AppError.badRequest('Please give an Overall Rating before submitting.');
  }

  const updated = await peerInsightModel.markSubmitted(feedbackId);
  if (!updated) throw AppError.badRequest('This feedback has already been submitted');
  return updated;
}

// --- HR curation + release (raw feedback NEVER reaches the employee) ---

async function getRawFeedbackForSubject(requesterUser, roundId, subjectId) {
  assertAdminTier(requesterUser);
  return peerInsightModel.listRawFeedbackForSubject(roundId, subjectId);
}

/**
 * Aggregates raw feedback by category so HR can see the pattern across
 * all reviewers at a glance (e.g. "3 of 4 reviewers said Often or better
 * on Leadership") instead of reading a flat per-reviewer list and having
 * to mentally cross-reference it themselves.
 */
async function getCategoryBreakdown(requesterUser, roundId, subjectId) {
  assertAdminTier(requesterUser);
  const rawFeedback = await peerInsightModel.listRawFeedbackForSubject(roundId, subjectId);
  const submitted = rawFeedback.filter((f) => f.status === 'submitted');

  const categories = FEEDBACK_CATEGORIES.map((cat) => {
    const responses = submitted
      .filter((f) => f.category_scores?.[cat.key]?.score)
      .map((f) => ({
        reviewerName: `${f.reviewer_first_name} ${f.reviewer_last_name}`,
        score: f.category_scores[cat.key].score,
        scoreLabel: LIKERT_SCALE.find((l) => l.value === f.category_scores[cat.key].score)?.label,
        comment: f.category_scores[cat.key].comment || null,
      }));
    const avgScore = responses.length ? responses.reduce((sum, r) => sum + r.score, 0) / responses.length : null;
    return { ...cat, avgScore: avgScore ? Math.round(avgScore * 10) / 10 : null, responses };
  });

  const ratings = submitted.filter((f) => Number.isInteger(f.rating)).map((f) => f.rating);
  const overallRatingAvg = ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null;

  const finalThoughts = submitted.filter((f) => f.comments).map((f) => f.comments);

  return { reviewerCount: submitted.length, overallRatingAvg, categories, finalThoughts };
}

/**
 * AI-generated draft for the HR Curated Summary box — HR reviews and
 * edits before saving/releasing, this never gets shown to the employee
 * on its own. Reviewer identities are deliberately left out of the
 * prompt (even though HR sees them on-screen) so the generated text
 * reads as "your peers" collectively, matching what the employee will
 * eventually see.
 */
async function generateAiSummaryDraft(requesterUser, roundId, subjectId) {
  assertAdminTier(requesterUser);
  const [subject, breakdown] = await Promise.all([
    userModel.findById(subjectId),
    getCategoryBreakdown(requesterUser, roundId, subjectId),
  ]);
  if (!subject) throw AppError.notFound('Employee not found');
  if (breakdown.reviewerCount === 0) {
    throw AppError.badRequest('No submitted feedback yet for this employee — nothing to summarize.');
  }

  return claudeService.generatePeerInsightSummary({ employee: subject, breakdown });
}

async function saveSummary(requesterUser, roundId, subjectId, summaryText) {
  assertAdminTier(requesterUser);
  if (!summaryText || !summaryText.trim()) throw AppError.badRequest('Summary text is required');
  return peerInsightModel.upsertSummary({ roundId, subjectId, summaryText: summaryText.trim(), createdBy: requesterUser.id });
}

async function getSummary(requesterUser, roundId, subjectId) {
  const summary = await peerInsightModel.findSummary(roundId, subjectId);
  if (!summary) return null;

  // The subject may only see it once released; HR always sees it.
  if (!isAdminTier(requesterUser.role) && requesterUser.id !== subjectId) {
    throw AppError.forbidden('You do not have permission to view this summary');
  }
  if (requesterUser.id === subjectId && !isAdminTier(requesterUser.role) && !summary.released_to_employee) {
    return null; // not released yet — behave as if it doesn't exist
  }
  return summary;
}

async function releaseSummary(requesterUser, summaryId) {
  assertAdminTier(requesterUser);
  const summary = await peerInsightModel.releaseSummary(summaryId, requesterUser.id);
  if (!summary) throw AppError.notFound('Summary not found');

  const subject = await userModel.findById(summary.subject_id);
  if (subject) {
    await notificationService.notifyUser({
      userId: subject.id,
      type: 'review_submitted',
      title: 'Your 360° Feedback summary is ready',
      message: 'HR has shared a summary of your peer feedback with you.',
      link: '/peer-insights',
      email: subject.email,
      recipientName: subject.first_name,
    });
  }
  return summary;
}

/**
 * "Revert" a released summary — pulls it back so the employee no longer
 * sees it, without deleting the underlying text. HR can then edit and
 * re-release with fresh content (Item 6).
 */
async function unreleaseSummary(requesterUser, summaryId) {
  assertAdminTier(requesterUser);
  const summary = await peerInsightModel.unreleaseSummary(summaryId);
  if (!summary) throw AppError.notFound('Summary not found');
  return summary;
}

/** Employee-facing: only their own released summaries, ever. */
async function listMyReleasedSummaries(requesterUser) {
  return peerInsightModel.listReleasedSummariesForEmployee(requesterUser.id);
}

module.exports = {
  createGroup,
  listGroups,
  getGroup,
  addMember,
  removeMember,
  deleteGroup,
  startRoundWithAssignments,
  listRoundsForGroup,
  closeRound,
  getCompletionSummary,
  listSubjectsInRound,
  listMyAssignments,
  listAllMyPendingAssignments,
  saveDraft,
  submitFeedback,
  getRawFeedbackForSubject,
  getCategoryBreakdown,
  generateAiSummaryDraft,
  saveSummary,
  getSummary,
  releaseSummary,
  unreleaseSummary,
  listMyReleasedSummaries,
};
