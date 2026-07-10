const asyncHandler = require('../utils/asyncHandler');
const aiSummaryService = require('../services/aiSummaryService');

// GET /api/ai/summary/:subjectId/:cycleId  — returns cached summary, or null if none exists yet
const getSummary = asyncHandler(async (req, res) => {
  const summary = await aiSummaryService.getCachedSummary(req.user, req.params.subjectId, req.params.cycleId);
  res.json({ success: true, data: { summary } });
});

// POST /api/ai/summary/:subjectId/:cycleId  — generates (or regenerates) the summary
const generateSummary = asyncHandler(async (req, res) => {
  const summary = await aiSummaryService.generateSummary(req.user, req.params.subjectId, req.params.cycleId);
  res.json({ success: true, message: 'AI summary generated successfully', data: { summary } });
});

module.exports = { getSummary, generateSummary };
