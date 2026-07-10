const asyncHandler = require('../utils/asyncHandler');
const reviewApprovalService = require('../services/reviewApprovalService');

// PUT /api/review-cycles/:cycleId/approvals/:subjectId
const approveEmployee = asyncHandler(async (req, res) => {
  const approval = await reviewApprovalService.approveEmployee(
    req.user,
    req.params.cycleId,
    req.params.subjectId,
    req.body.hrComments
  );
  res.json({ success: true, message: 'Employee review approved', data: { approval } });
});

// DELETE /api/review-cycles/:cycleId/approvals/:subjectId
const revokeApproval = asyncHandler(async (req, res) => {
  await reviewApprovalService.revokeApproval(req.params.cycleId, req.params.subjectId);
  res.json({ success: true, message: 'Approval revoked' });
});

// GET /api/review-cycles/:cycleId/approvals/:subjectId
const getApproval = asyncHandler(async (req, res) => {
  const approval = await reviewApprovalService.getApproval(req.user, req.params.cycleId, req.params.subjectId);
  res.json({ success: true, data: { approval } });
});

// GET /api/review-cycles/:cycleId/approvals
const listApprovalsForCycle = asyncHandler(async (req, res) => {
  const approvals = await reviewApprovalService.listApprovalsForCycle(req.params.cycleId);
  res.json({ success: true, data: { approvals } });
});

module.exports = { approveEmployee, revokeApproval, getApproval, listApprovalsForCycle };
