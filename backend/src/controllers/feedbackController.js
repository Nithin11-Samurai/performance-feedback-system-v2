const asyncHandler = require('../utils/asyncHandler');
const feedbackService = require('../services/feedbackService');

// POST /api/feedback/self/:cycleId
const submitSelfReview = asyncHandler(async (req, res) => {
  const feedback = await feedbackService.submitSelfReview(req.user, req.params.cycleId, req.body);
  res.json({ success: true, message: 'Self-review draft saved', data: { feedback } });
});

// POST /api/feedback/manager/:cycleId/:subjectId
const submitManagerReview = asyncHandler(async (req, res) => {
  const feedback = await feedbackService.submitManagerReview(req.user, req.params.cycleId, req.params.subjectId, req.body);
  res.json({ success: true, message: 'Manager feedback draft saved', data: { feedback } });
});

// POST /api/feedback/peer/:cycleId/:subjectId
const submitPeerReview = asyncHandler(async (req, res) => {
  const feedback = await feedbackService.submitPeerReview(req.user, req.params.cycleId, req.params.subjectId, req.body);
  res.json({ success: true, message: 'Peer feedback draft saved', data: { feedback } });
});

// POST /api/feedback/:reviewerType/:cycleId/:subjectId
// Generic endpoint for the new reviewer types (Feature 4): hr, skip_level,
// project_lead, mentor. (peer/manager keep their existing dedicated routes
// above for backward compatibility with the existing frontend.)
const submitAssignedReview = asyncHandler(async (req, res) => {
  const feedback = await feedbackService.submitAssignedReview(
    req.user,
    req.params.cycleId,
    req.params.subjectId,
    req.params.reviewerType,
    req.body
  );
  res.json({ success: true, message: `${req.params.reviewerType.replace(/_/g, ' ')} feedback draft saved`, data: { feedback } });
});

// PATCH /api/feedback/:feedbackId/submit  (locks the draft)
const submitFeedback = asyncHandler(async (req, res) => {
  const feedback = await feedbackService.submitFeedback(req.user, req.params.feedbackId);
  res.json({ success: true, message: 'Feedback submitted successfully', data: { feedback } });
});

// GET /api/feedback/subject/:subjectId/:cycleId
const listFeedbackForSubject = asyncHandler(async (req, res) => {
  const feedback = await feedbackService.listFeedbackForSubject(req.user, req.params.subjectId, req.params.cycleId);
  res.json({ success: true, data: { feedback } });
});

// GET /api/feedback/subject/:subjectId/history  (all cycles, for Performance History tab)
const getFeedbackHistory = asyncHandler(async (req, res) => {
  const feedback = await feedbackService.listFullHistoryForSubject(req.user, req.params.subjectId);
  res.json({ success: true, data: { feedback } });
});

// PATCH /api/feedback/:feedbackId/notify-employee — "send individual feedback"
const notifyEmployeeAboutFeedback = asyncHandler(async (req, res) => {
  const result = await feedbackService.notifyEmployeeAboutFeedback(req.user, req.params.feedbackId);
  res.json({ success: true, message: 'Employee notified', data: result });
});

module.exports = {
  submitSelfReview,
  submitManagerReview,
  submitPeerReview,
  submitAssignedReview,
  submitFeedback,
  listFeedbackForSubject,
  getFeedbackHistory,
  notifyEmployeeAboutFeedback,
};
