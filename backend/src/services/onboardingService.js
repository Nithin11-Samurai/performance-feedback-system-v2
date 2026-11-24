/**
 * Onboarding service: where is this person in the first-login setup?
 *
 *   personal        contact number + emergency contact name and number filled in
 *   skills          at least one skill recorded (any status, including "not trained")
 *   certifications  at least one certification, OR they confirmed they have none
 *
 * Everything is derived from data, so people who already filled these in
 * (before this existed) are not asked again, and nobody is locked out by a
 * stored flag that got out of step with reality.
 */
const onboardingModel = require('../models/onboardingModel');
const AppError = require('../utils/AppError');

const filled = (value) => typeof value === 'string' && value.trim().length > 0;

async function getStatus(requesterUser) {
  const row = await onboardingModel.getRaw(requesterUser.id);
  if (!row) throw AppError.notFound('User not found');

  return {
    personalDone: filled(row.phone) && filled(row.emergency_contact_name) && filled(row.emergency_contact_phone),
    skillsDone: row.skill_count > 0,
    certificationsDone: row.cert_count > 0 || !!row.no_certifications_confirmed_at,
    noCertificationsConfirmed: !!row.no_certifications_confirmed_at,
    dismissed: !!row.onboarding_dismissed_at,
    skillCount: row.skill_count,
    certificationCount: row.cert_count,
    personal: {
      phone: row.phone || '',
      address: row.address || '',
      emergencyContactName: row.emergency_contact_name || '',
      emergencyContactPhone: row.emergency_contact_phone || '',
    },
  };
}

async function savePersonal(requesterUser, payload) {
  await onboardingModel.savePersonal(requesterUser.id, {
    phone: payload.phone.trim(),
    address: filled(payload.address) ? payload.address.trim() : null,
    emergencyContactName: payload.emergencyContactName.trim(),
    emergencyContactPhone: payload.emergencyContactPhone.trim(),
  });
  return getStatus(requesterUser);
}

async function setNoCertifications(requesterUser, none) {
  await onboardingModel.setNoCertifications(requesterUser.id, none);
  return getStatus(requesterUser);
}

/** "Finish later": stop auto-prompting at login. The reminder banner stays until everything is done. */
async function dismiss(requesterUser) {
  await onboardingModel.dismiss(requesterUser.id);
  return getStatus(requesterUser);
}

module.exports = { getStatus, savePersonal, setNoCertifications, dismiss };
