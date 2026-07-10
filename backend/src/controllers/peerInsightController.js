const asyncHandler = require('../utils/asyncHandler');
const peerInsightService = require('../services/peerInsightService');
const { FEEDBACK_CATEGORIES, LIKERT_SCALE } = require('../config/constants');

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

const addMember = asyncHandler(async (req, res) => {
  await peerInsightService.addMember(req.user, req.params.groupId, req.body.userId);
  res.json({ success: true, message: 'Member added' });
});

const removeMember = asyncHandler(async (req, res) => {
  await peerInsightService.removeMember(req.user, req.params.groupId, req.params.userId);
  res.json({ success: true, message: 'Member removed' });
});

const deleteGroup = asyncHandler(async (req, res) => {
  await peerInsightService.deleteGroup(req.user, req.params.groupId);
  res.json({ success: true, message: 'Project group deleted' });
});

// --- Rounds (Quick Action) ---
const startRound = asyncHandler(async (req, res) => {
  const round = await peerInsightService.startRoundWithAssignments(req.user, req.params.groupId, req.body.name);
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

const getCompletionSummary = asyncHandler(async (req, res) => {
  const summary = await peerInsightService.getCompletionSummary(req.user, req.params.roundId);
  res.json({ success: true, data: { summary } });
});

const listSubjectsInRound = asyncHandler(async (req, res) => {
  const subjects = await peerInsightService.listSubjectsInRound(req.user, req.params.roundId);
  res.json({ success: true, data: { subjects } });
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

module.exports = {
  getFeedbackFormSchema,
  createGroup,
  listGroups,
  getGroup,
  addMember,
  removeMember,
  deleteGroup,
  startRound,
  listRoundsForGroup,
  closeRound,
  getCompletionSummary,
  listSubjectsInRound,
  listMyAssignments,
  listAllMyPendingAssignments,
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
};
