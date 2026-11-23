const asyncHandler = require('../utils/asyncHandler');
const onboardingService = require('../services/onboardingService');

// GET /api/onboarding/status
const getStatus = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { status: await onboardingService.getStatus(req.user) } });
});

// PUT /api/onboarding/personal
const savePersonal = asyncHandler(async (req, res) => {
  const status = await onboardingService.savePersonal(req.user, req.body);
  res.json({ success: true, message: 'Personal information saved', data: { status } });
});

// POST /api/onboarding/no-certifications   { none: true | false }
const setNoCertifications = asyncHandler(async (req, res) => {
  const status = await onboardingService.setNoCertifications(req.user, req.body.none);
  res.json({ success: true, data: { status } });
});

// POST /api/onboarding/dismiss
const dismiss = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { status: await onboardingService.dismiss(req.user) } });
});

module.exports = { getStatus, savePersonal, setNoCertifications, dismiss };
