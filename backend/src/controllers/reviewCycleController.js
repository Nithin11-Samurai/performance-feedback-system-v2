const asyncHandler = require('../utils/asyncHandler');
const reviewCycleService = require('../services/reviewCycleService');

const listCycles = asyncHandler(async (req, res) => {
  const cycles = await reviewCycleService.listCycles({ status: req.query.status });
  res.json({ success: true, data: { cycles } });
});

const getCycle = asyncHandler(async (req, res) => {
  const cycle = await reviewCycleService.getCycle(req.params.cycleId);
  res.json({ success: true, data: { cycle } });
});

const createCycle = asyncHandler(async (req, res) => {
  const cycle = await reviewCycleService.createCycle(req.user, req.body);
  res.status(201).json({ success: true, message: 'Review cycle created', data: { cycle } });
});

const updateCycle = asyncHandler(async (req, res) => {
  const cycle = await reviewCycleService.updateCycle(req.params.cycleId, req.body);
  res.json({ success: true, message: 'Review cycle updated', data: { cycle } });
});

const deleteCycle = asyncHandler(async (req, res) => {
  await reviewCycleService.deleteCycle(req.params.cycleId);
  res.json({ success: true, message: 'Review cycle deleted' });
});

const assignPeerReviewer = asyncHandler(async (req, res) => {
  const assignment = await reviewCycleService.assignPeerReviewer(
    req.user,
    req.params.cycleId,
    req.body.subjectId,
    req.body.reviewerId,
    req.body.reviewerType
  );
  res.status(201).json({ success: true, message: 'Reviewer assigned', data: { assignment } });
});

const listAssignmentsForCycle = asyncHandler(async (req, res) => {
  const assignments = await reviewCycleService.listAssignmentsForCycle(req.params.cycleId);
  res.json({ success: true, data: { assignments } });
});

const listMyAssignments = asyncHandler(async (req, res) => {
  const assignments = await reviewCycleService.listMyAssignments(req.user.id, req.params.cycleId);
  res.json({ success: true, data: { assignments } });
});

// Powers the Employee Detail page's Reviewers tab.
const listAssignmentsForSubject = asyncHandler(async (req, res) => {
  const assignments = await reviewCycleService.listAssignmentsForSubject(req.params.cycleId, req.params.subjectId);
  res.json({ success: true, data: { assignments } });
});

const removeAssignment = asyncHandler(async (req, res) => {
  await reviewCycleService.removeAssignment(req.params.assignmentId);
  res.json({ success: true, message: 'Peer assignment removed' });
});

const getCompletionSummary = asyncHandler(async (req, res) => {
  const summary = await reviewCycleService.getCompletionSummary(req.params.cycleId);
  res.json({ success: true, data: { summary } });
});

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
