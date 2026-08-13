const asyncHandler = require('../utils/asyncHandler');
const peerInsightService = require('../services/peerInsightService');
const { FEEDBACK_CATEGORIES, LIKERT_SCALE } = require('../config/constants');
const excelGenerator = require('../utils/excelGenerator');
const pdfGenerator = require('../utils/pdfGenerator');

// GET /api/peer-insights/feedback-form-schema — Item 2's question set,
// single source of truth shared with the submission form.
const getFeedbackFormSchema = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { categories: FEEDBACK_CATEGORIES, likertScale: LIKERT_SCALE } });
});

// --- Groups ---
const createGroup = asyncHandler(async (req, res) => {
  const group = await peerInsightService.createGroup(req.user, req.body);
  res.status(201).json({ success: true, message: 'Project group created', data: { group } });
});

const listGroups = asyncHandler(async (req, res) => {
  const groups = await peerInsightService.listGroups(req.user);
  res.json({ success: true, data: { groups } });
});

const getGroup = asyncHandler(async (req, res) => {
  const group = await peerInsightService.getGroup(req.user, req.params.groupId);
  res.json({ success: true, data: { group } });
});

const getMyProjectDetail = asyncHandler(async (req, res) => {
  const project = await peerInsightService.getMyProjectDetail(req.user, req.params.groupId);
  res.json({ success: true, data: { project } });
});

const addMember = asyncHandler(async (req, res) => {
  await peerInsightService.addMember(req.user, req.params.groupId, req.body.userId);
  res.json({ success: true, message: 'Member added' });
});

const removeMember = asyncHandler(async (req, res) => {
  await peerInsightService.removeMember(req.user, req.params.groupId, req.params.userId);
  res.json({ success: true, message: 'Member removed' });
});

const updateGroup = asyncHandler(async (req, res) => {
  const group = await peerInsightService.updateGroup(req.user, req.params.groupId, req.body);
  res.json({ success: true, message: 'Project group updated', data: { group } });
});

const deleteGroup = asyncHandler(async (req, res) => {
  await peerInsightService.deleteGroup(req.user, req.params.groupId);
  res.json({ success: true, message: 'Project group deleted' });
});

// --- Rounds (Quick Action) ---
const startRound = asyncHandler(async (req, res) => {
  const round = await peerInsightService.startRoundWithAssignments(
    req.user,
    req.params.groupId,
    req.body.name,
    req.body.endDate
  );
  res.status(201).json({ success: true, message: 'Peer Insights round started — reviewers notified', data: { round } });
});

const listRoundsForGroup = asyncHandler(async (req, res) => {
  const rounds = await peerInsightService.listRoundsForGroup(req.user, req.params.groupId);
  res.json({ success: true, data: { rounds } });
});

const closeRound = asyncHandler(async (req, res) => {
  const round = await peerInsightService.closeRound(req.user, req.params.roundId);
  res.json({ success: true, message: 'Round closed', data: { round } });
});

const reactivateRound = asyncHandler(async (req, res) => {
  const round = await peerInsightService.reactivateRound(req.user, req.params.roundId);
  res.json({ success: true, message: 'Round reactivated', data: { round } });
});

const updateRound = asyncHandler(async (req, res) => {
  const round = await peerInsightService.updateRound(req.user, req.params.roundId, req.body);
  res.json({ success: true, message: 'Round updated', data: { round } });
});

const getCompletionSummary = asyncHandler(async (req, res) => {
  const summary = await peerInsightService.getCompletionSummary(req.user, req.params.roundId);
  res.json({ success: true, data: { summary } });
});

const listSubjectsInRound = asyncHandler(async (req, res) => {
  const subjects = await peerInsightService.listSubjectsInRound(req.user, req.params.roundId);
  res.json({ success: true, data: { subjects } });
});

const getRoundAssignmentDetail = asyncHandler(async (req, res) => {
  const assignments = await peerInsightService.getRoundAssignmentDetail(req.user, req.params.roundId);
  res.json({ success: true, data: { assignments } });
});

const remindReviewer = asyncHandler(async (req, res) => {
  const result = await peerInsightService.remindReviewer(req.user, req.params.feedbackId);
  res.json({ success: true, message: `Reminder sent to ${result.reviewerName}`, data: result });
});

const remindAllPendingForRound = asyncHandler(async (req, res) => {
  const result = await peerInsightService.remindAllPendingForRound(req.user, req.params.roundId);
  res.json({
    success: true,
    message: result.remindedCount > 0 ? `Reminded ${result.remindedCount} reviewer${result.remindedCount === 1 ? '' : 's'}` : 'No pending reviewers to remind',
    data: result,
  });
});

const getRatingDistribution = asyncHandler(async (req, res) => {
  const distribution = await peerInsightService.getRatingDistribution(req.user, req.query.groupId || undefined);
  res.json({ success: true, data: { distribution } });
});

const getRatingTrend = asyncHandler(async (req, res) => {
  const trend = await peerInsightService.getRatingTrend(req.user, req.query.groupId || undefined);
  res.json({ success: true, data: { trend } });
});

const getProjectsWithPendingFeedback = asyncHandler(async (req, res) => {
  const projects = await peerInsightService.getProjectsWithPendingFeedback(req.user);
  res.json({ success: true, data: { projects } });
});

const getTopRatedEmployees = asyncHandler(async (req, res) => {
  const employees = await peerInsightService.getTopRatedEmployees(req.user, Number(req.query.limit) || 5, req.query.groupId || undefined);
  res.json({ success: true, data: { employees } });
});

const exportRatingDistributionExcel = asyncHandler(async (req, res) => {
  const groupId = req.query.groupId || undefined;
  const distribution = await peerInsightService.getRatingDistribution(req.user, groupId);
  const workbook = excelGenerator.buildRatingDistributionWorkbook(distribution);
  const filename = groupId ? `360-rating-distribution-project.xlsx` : `360-rating-distribution.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
});

const exportRatingDistributionPdf = asyncHandler(async (req, res) => {
  const distribution = await peerInsightService.getRatingDistribution(req.user);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="360-rating-distribution.pdf"');
  pdfGenerator.generateRatingDistributionPdf(res, distribution);
});

// --- Reviewer-facing ---
const listMyAssignments = asyncHandler(async (req, res) => {
  const assignments = await peerInsightService.listMyAssignments(req.user, req.params.roundId);
  res.json({ success: true, data: { assignments } });
});

const listAllMyPendingAssignments = asyncHandler(async (req, res) => {
  const assignments = await peerInsightService.listAllMyPendingAssignments(req.user);
  res.json({ success: true, data: { assignments } });
});

const getMyCompletedReviewCount = asyncHandler(async (req, res) => {
  const count = await peerInsightService.getMyCompletedReviewCount(req.user);
  res.json({ success: true, data: { count } });
});

const saveDraft = asyncHandler(async (req, res) => {
  const feedback = await peerInsightService.saveDraft(req.user, req.params.feedbackId, req.body);
  res.json({ success: true, message: 'Draft saved', data: { feedback } });
});

const submitFeedback = asyncHandler(async (req, res) => {
  const feedback = await peerInsightService.submitFeedback(req.user, req.params.feedbackId);
  res.json({ success: true, message: 'Peer feedback submitted anonymously', data: { feedback } });
});

// --- HR curation ---
const getRawFeedback = asyncHandler(async (req, res) => {
  const feedback = await peerInsightService.getRawFeedbackForSubject(req.user, req.params.roundId, req.params.subjectId);
  res.json({ success: true, data: { feedback } });
});

const getCategoryBreakdown = asyncHandler(async (req, res) => {
  const breakdown = await peerInsightService.getCategoryBreakdown(req.user, req.params.roundId, req.params.subjectId);
  res.json({ success: true, data: { breakdown } });
});

const generateAiSummaryDraft = asyncHandler(async (req, res) => {
  const draft = await peerInsightService.generateAiSummaryDraft(req.user, req.params.roundId, req.params.subjectId);
  res.json({ success: true, data: { draft } });
});

const saveSummary = asyncHandler(async (req, res) => {
  const summary = await peerInsightService.saveSummary(req.user, req.params.roundId, req.params.subjectId, req.body.summaryText);
  res.json({ success: true, message: 'Summary saved', data: { summary } });
});

const getSummary = asyncHandler(async (req, res) => {
  const summary = await peerInsightService.getSummary(req.user, req.params.roundId, req.params.subjectId);
  res.json({ success: true, data: { summary } });
});

const releaseSummary = asyncHandler(async (req, res) => {
  const summary = await peerInsightService.releaseSummary(req.user, req.params.summaryId);
  res.json({ success: true, message: 'Summary released to employee', data: { summary } });
});

const unreleaseSummary = asyncHandler(async (req, res) => {
  const summary = await peerInsightService.unreleaseSummary(req.user, req.params.summaryId);
  res.json({ success: true, message: 'Summary reverted — no longer visible to the employee', data: { summary } });
});

const listMyReleasedSummaries = asyncHandler(async (req, res) => {
  const summaries = await peerInsightService.listMyReleasedSummaries(req.user);
  res.json({ success: true, data: { summaries } });
});

// --- Cross-project ---

const searchSubjects = asyncHandler(async (req, res) => {
  const employees = await peerInsightService.searchSubjectsWithFeedback(req.user, req.query.q);
  res.json({ success: true, data: { employees } });
});

const getCrossProjectBreakdown = asyncHandler(async (req, res) => {
  const result = await peerInsightService.getCrossProjectBreakdown(req.user, req.params.subjectId);
  res.json({ success: true, data: result });
});

const getOverallSummary = asyncHandler(async (req, res) => {
  const summary = await peerInsightService.getOverallSummary(req.user, req.params.subjectId);
  res.json({ success: true, data: { summary } });
});

const saveOverallSummary = asyncHandler(async (req, res) => {
  const summary = await peerInsightService.saveOverallSummary(req.user, req.params.subjectId, req.body.summaryText);
  res.json({ success: true, message: 'Overall summary saved', data: { summary } });
});

const releaseOverallSummary = asyncHandler(async (req, res) => {
  const summary = await peerInsightService.releaseOverallSummary(req.user, req.params.subjectId);
  res.json({ success: true, message: 'Overall summary released to employee', data: { summary } });
});

const unreleaseOverallSummary = asyncHandler(async (req, res) => {
  const summary = await peerInsightService.unreleaseOverallSummary(req.user, req.params.subjectId);
  res.json({ success: true, message: 'Overall summary reverted — no longer visible to the employee', data: { summary } });
});

const getMyReleasedOverallSummary = asyncHandler(async (req, res) => {
  const summary = await peerInsightService.getMyReleasedOverallSummary(req.user);
  res.json({ success: true, data: { summary } });
});

module.exports = {
  getFeedbackFormSchema,
  createGroup,
  listGroups,
  getGroup,
  getMyProjectDetail,
  addMember,
  removeMember,
  updateGroup,
  deleteGroup,
  startRound,
  listRoundsForGroup,
  closeRound,
  reactivateRound,
  updateRound,
  getCompletionSummary,
  listSubjectsInRound,
  getRoundAssignmentDetail,
  remindReviewer,
  remindAllPendingForRound,
  getRatingDistribution,
  getRatingTrend,
  getProjectsWithPendingFeedback,
  getTopRatedEmployees,
  exportRatingDistributionExcel,
  exportRatingDistributionPdf,
  listMyAssignments,
  listAllMyPendingAssignments,
  getMyCompletedReviewCount,
  saveDraft,
  submitFeedback,
  getRawFeedback,
  getCategoryBreakdown,
  generateAiSummaryDraft,
  saveSummary,
  getSummary,
  releaseSummary,
  unreleaseSummary,
  listMyReleasedSummaries,
  searchSubjects,
  getCrossProjectBreakdown,
  getOverallSummary,
  saveOverallSummary,
  releaseOverallSummary,
  unreleaseOverallSummary,
  getMyReleasedOverallSummary,
};
