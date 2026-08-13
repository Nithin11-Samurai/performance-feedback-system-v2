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

async function updateGroup(requesterUser, groupId, { name, description }) {
  assertAdminTier(requesterUser);
  if (name !== undefined && !name.trim()) throw AppError.badRequest('Group name cannot be empty');
  const group = await peerInsightModel.updateGroup(groupId, { name: name?.trim(), description });
  if (!group) throw AppError.notFound('Project group not found');
  const members = await peerInsightModel.listMembers(groupId);
  return { ...group, members };
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

/**
 * Employee-facing: any member of a project can see who else is in it
 * (that's not secret - peers already know their own teammates), with
 * safe fields only (name, job title, department). This is NOT an
 * admin-tier check - it's "are you actually a member of this specific
 * group", so one employee can't browse an unrelated project's roster.
 * Never exposes review assignments, submission status, or anything
 * that would leak reviewer identity.
 */
async function getMyProjectDetail(requesterUser, groupId) {
  const group = await peerInsightModel.findGroupById(groupId);
  if (!group) throw AppError.notFound('Project not found');

  const members = await peerInsightModel.listMembers(groupId);
  const isMember = members.some((m) => m.id === requesterUser.id);
  if (!isMember) {
    throw AppError.forbidden("You can only view details for projects you're a member of.");
  }

  return { id: group.id, name: group.name, description: group.description, members };
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
async function startRoundWithAssignments(requesterUser, groupId, roundName, endDate) {
  assertAdminTier(requesterUser);

  const group = await peerInsightModel.findGroupById(groupId);
  if (!group) throw AppError.notFound('Project group not found');

  const members = await peerInsightModel.listMembers(groupId);
  if (members.length < 2) {
    throw AppError.badRequest('A project group needs at least 2 members to run a 360° Feedback round');
  }

  // Auto-name "Round N" when HR doesn't type a custom name, so rounds
  // stay distinguishable from each other without extra effort.
  let name = roundName?.trim();
  if (!name) {
    const existingCount = await peerInsightModel.countRoundsForGroup(groupId);
    name = `Round ${existingCount + 1}`;
  }

  const round = await peerInsightModel.createRound({
    groupId,
    name,
    startedBy: requesterUser.id,
    endDate,
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

async function reactivateRound(requesterUser, roundId) {
  assertAdminTier(requesterUser);
  const round = await peerInsightModel.reactivateRound(roundId);
  if (!round) throw AppError.notFound('Round not found');
  return round;
}

async function updateRound(requesterUser, roundId, { name, startedAt, endDate }) {
  assertAdminTier(requesterUser);
  const round = await peerInsightModel.updateRound(roundId, { name, startedAt, endDate });
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

/** Every reviewer<->subject pair in a round with names and status - for the "who's submitted, who's pending" hover detail. */
async function getRoundAssignmentDetail(requesterUser, roundId) {
  assertAdminTier(requesterUser);
  return peerInsightModel.listAssignmentsWithStatusForRound(roundId);
}

/**
 * Org-wide 360 Feedback rating distribution: every employee with at
 * least one submitted feedback, bucketed by their average overall
 * rating rounded to the nearest whole number (1-5). Powers the
 * collapsible dashboard on the main 360° Feedback page.
 */
/**
 * Org-wide rating distribution across every employee with submitted 360
 * feedback (any project, combined). Buckets by rounded average rating
 * (1-5) so HR can see, e.g., "6 employees averaging 4/5" and click
 * through to see exactly who.
 */
async function getRatingDistribution(requesterUser, groupId) {
  assertAdminTier(requesterUser);
  const rows = await peerInsightModel.getOrgWideRatingSummary(groupId);

  const buckets = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    employees: rows.filter((r) => Math.round(r.avg_rating) === rating),
  }));

  return {
    totalEmployees: rows.length,
    buckets: buckets.map((b) => ({ rating: b.rating, count: b.employees.length, employees: b.employees })),
  };
}

/** Every project with pending 360 feedback in its active round, for the Overview tab's pending-projects widget. */
async function getProjectsWithPendingFeedback(requesterUser) {
  assertAdminTier(requesterUser);
  return peerInsightModel.listActiveRoundsWithPending();
}

/** Org-wide average rating per month, for the Rating Trend chart. */
async function getRatingTrend(requesterUser, groupId) {
  assertAdminTier(requesterUser);
  return peerInsightModel.getMonthlyRatingTrend(groupId);
}

/** Top N employees by average rating, for the Top Rated Employees table. */
async function getTopRatedEmployees(requesterUser, limit = 5, groupId) {
  assertAdminTier(requesterUser);
  const rows = await peerInsightModel.getOrgWideRatingSummary(groupId);
  return rows.slice(0, limit);
}

/** HR nudges one specific pending reviewer - sends a notification + email, doesn't reveal WHO they're reviewing to anyone else. */
/** Reminds every distinct pending reviewer in a round at once, deduplicated so someone pending on 2+ subjects only gets one notification. */
async function remindAllPendingForRound(requesterUser, roundId) {
  assertAdminTier(requesterUser);
  const assignments = await peerInsightModel.listAssignmentsWithStatusForRound(roundId);
  const pending = assignments.filter((a) => a.status === 'pending');

  const seen = new Set();
  const reviewers = [];
  for (const a of pending) {
    if (seen.has(a.reviewer_id)) continue;
    seen.add(a.reviewer_id);
    reviewers.push({ id: a.reviewer_id, email: a.reviewer_email, first_name: a.reviewer_first_name, last_name: a.reviewer_last_name });
  }

  await Promise.all(
    reviewers.map((r) =>
      notificationService.notifyUser({
        userId: r.id,
        type: 'review_submitted',
        title: 'Reminder: 360° Feedback pending',
        message: 'You have anonymous peer reviews still waiting on you in 360° Feedback. It only takes a couple of minutes.',
        link: '/peer-insights',
        email: r.email,
        recipientName: r.first_name,
      })
    )
  );

  return { remindedCount: reviewers.length };
}

async function remindReviewer(requesterUser, feedbackId) {
  assertAdminTier(requesterUser);
  const feedback = await peerInsightModel.findFeedbackById(feedbackId);
  if (!feedback) throw AppError.notFound('Assignment not found');
  if (feedback.status === 'submitted') {
    throw AppError.badRequest('This reviewer has already submitted their feedback.');
  }

  const reviewer = await userModel.findById(feedback.reviewer_id);
  if (!reviewer) throw AppError.notFound('Reviewer not found');

  await notificationService.notifyUser({
    userId: reviewer.id,
    type: 'review_submitted',
    title: 'Reminder: 360° Feedback pending',
    message: 'You have an anonymous peer review still waiting on you in 360° Feedback. It only takes a couple of minutes.',
    link: '/peer-insights',
    email: reviewer.email,
    recipientName: reviewer.first_name,
  });

  return { reminded: true, reviewerName: `${reviewer.first_name} ${reviewer.last_name}` };
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

async function getMyCompletedReviewCount(requesterUser) {
  return peerInsightModel.countCompletedReviewsByReviewer(requesterUser.id);
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
/**
 * Shared aggregation logic - takes a list of already-submitted feedback
 * rows (each with category_scores, rating, comments) and produces the
 * same breakdown shape whether that list is scoped to one round (the
 * existing per-project view) or spans every round an employee is part
 * of (the new cross-project overall view below).
 */
function buildBreakdownFromFeedback(submitted) {
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

async function getCategoryBreakdown(requesterUser, roundId, subjectId) {
  assertAdminTier(requesterUser);
  const rawFeedback = await peerInsightModel.listRawFeedbackForSubject(roundId, subjectId);
  const submitted = rawFeedback.filter((f) => f.status === 'submitted');
  return buildBreakdownFromFeedback(submitted);
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

// --- Cross-project: search an employee across every group they're in,
// see each project's breakdown side by side, and curate one overall
// summary spanning all of it (Item: multi-project 360 search) ---

async function searchSubjectsWithFeedback(requesterUser, term) {
  assertAdminTier(requesterUser);
  if (!term || term.trim().length < 2) return [];
  return peerInsightModel.searchSubjectsWithFeedback(term.trim());
}

/**
 * @returns {{ subject, projects: Array<{roundId, roundName, groupId, groupName, breakdown}>, overall }}
 *   `overall` is the exact same shape as each project's breakdown, just
 *   built from every submitted feedback row across all of the
 *   employee's projects combined - the frontend's existing summary
 *   generator works on it completely unmodified.
 */
async function getCrossProjectBreakdown(requesterUser, subjectId) {
  assertAdminTier(requesterUser);
  const subject = await userModel.findById(subjectId);
  if (!subject) throw AppError.notFound('Employee not found');

  const [rounds, allFeedback] = await Promise.all([
    peerInsightModel.listRoundsForSubject(subjectId),
    peerInsightModel.listAllRawFeedbackForSubject(subjectId),
  ]);

  const projects = rounds.map((r) => {
    const feedbackForRound = allFeedback.filter((f) => f.round_id === r.round_id);
    return {
      roundId: r.round_id,
      roundName: r.round_name,
      groupId: r.group_id,
      groupName: r.group_name,
      breakdown: buildBreakdownFromFeedback(feedbackForRound),
    };
  });

  const overall = buildBreakdownFromFeedback(allFeedback);

  return { subject, projects, overall };
}

async function getOverallSummary(requesterUser, subjectId) {
  assertAdminTier(requesterUser);
  return peerInsightModel.findOverallSummary(subjectId);
}

async function saveOverallSummary(requesterUser, subjectId, summaryText) {
  assertAdminTier(requesterUser);
  if (!summaryText || !summaryText.trim()) {
    throw AppError.badRequest('Summary text cannot be empty.');
  }
  return peerInsightModel.upsertOverallSummary({ subjectId, summaryText, createdBy: requesterUser.id });
}

async function releaseOverallSummary(requesterUser, subjectId) {
  assertAdminTier(requesterUser);
  const summary = await peerInsightModel.findOverallSummary(subjectId);
  if (!summary) throw AppError.notFound('No overall summary saved yet for this employee.');

  const released = await peerInsightModel.releaseOverallSummary(subjectId, requesterUser.id);

  const subject = await userModel.findById(subjectId);
  if (subject) {
    await notificationService.notifyUser({
      userId: subject.id,
      type: 'review_submitted',
      title: 'Your 360° Feedback summary is ready',
      message: 'HR has shared an overall summary of your peer feedback across all your projects.',
      link: '/peer-insights',
      email: subject.email,
      recipientName: subject.first_name,
    });
  }
  return released;
}

async function unreleaseOverallSummary(requesterUser, subjectId) {
  assertAdminTier(requesterUser);
  const summary = await peerInsightModel.unreleaseOverallSummary(subjectId);
  if (!summary) throw AppError.notFound('Summary not found');
  return summary;
}

/** Employee-facing: their own released overall summary, if HR has released one. */
async function getMyReleasedOverallSummary(requesterUser) {
  return peerInsightModel.findReleasedOverallSummaryForEmployee(requesterUser.id);
}

module.exports = {
  createGroup,
  updateGroup,
  listGroups,
  getGroup,
  getMyProjectDetail,
  addMember,
  removeMember,
  deleteGroup,
  startRoundWithAssignments,
  listRoundsForGroup,
  closeRound,
  reactivateRound,
  updateRound,
  getCompletionSummary,
  listSubjectsInRound,
  getRoundAssignmentDetail,
  getRatingDistribution,
  getRatingTrend,
  getProjectsWithPendingFeedback,
  getTopRatedEmployees,
  remindReviewer,
  remindAllPendingForRound,
  listMyAssignments,
  listAllMyPendingAssignments,
  getMyCompletedReviewCount,
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
  searchSubjectsWithFeedback,
  getCrossProjectBreakdown,
  getOverallSummary,
  saveOverallSummary,
  releaseOverallSummary,
  unreleaseOverallSummary,
  getMyReleasedOverallSummary,
};
