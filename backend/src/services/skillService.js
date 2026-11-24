/**
 * Skill service.
 * Visibility mirrors userService.canViewProfile (self / direct manager /
 * Admin). Editing is stricter: only the employee themself or Admin/HR can
 * change skill data — a manager can see it, but shouldn't be able to type
 * over an employee's self-reported skill level.
 */
const skillModel = require('../models/skillModel');
const skillCatalogModel = require('../models/skillCatalogModel');
const userModel = require('../models/userModel');
const userService = require('./userService');
const notificationService = require('./notificationService');
const AppError = require('../utils/AppError');
const { ROLES, isAdminTier, TRAINING_STATUS } = require('../config/constants');

async function assertTargetExists(userId) {
  const user = await userModel.findById(userId);
  if (!user) throw AppError.notFound('User not found');
  return user;
}

async function listSkills(requesterUser, targetUserId) {
  const target = await assertTargetExists(targetUserId);
  if (!userService.canViewProfile(requesterUser, target)) {
    throw AppError.forbidden('You do not have permission to view these skills');
  }
  return skillModel.listByUser(targetUserId);
}

function assertCanEdit(requesterUser, targetUserId) {
  const isSelf = requesterUser.id === targetUserId;
  const isAdmin = isAdminTier(requesterUser.role);
  if (!isSelf && !isAdmin) {
    throw AppError.forbidden('Only the employee themself or HR can update this skill');
  }
}

/**
 * Work out which skill a request is about. The catalog is the source of
 * truth for name and category whenever the skill is in it — whether the
 * person picked it, or typed a name that happens to match one — so the same
 * skill is never recorded under two spellings or categories.
 */
async function resolveSkillIdentity(payload) {
  if (payload.catalogId) {
    const entry = await skillCatalogModel.findById(payload.catalogId);
    if (!entry || !entry.is_active) throw AppError.badRequest('That skill is not in the list');
    return { catalogId: entry.id, category: entry.category, skillName: entry.name };
  }

  const name = String(payload.skillName).trim().replace(/\s+/g, ' ');
  const match = await skillCatalogModel.findByName(name);
  if (match && match.is_active) {
    return { catalogId: match.id, category: match.category, skillName: match.name };
  }
  return { catalogId: null, category: payload.category, skillName: name };
}

async function upsertSkill(requesterUser, targetUserId, payload) {
  const target = await assertTargetExists(targetUserId);
  assertCanEdit(requesterUser, targetUserId);

  const identity = await resolveSkillIdentity(payload);
  const trainingStatus = payload.trainingStatus || TRAINING_STATUS.TRAINED;
  const notTrained = trainingStatus === TRAINING_STATUS.NOT_TRAINED;

  const skill = await skillModel.upsert({
    userId: targetUserId,
    catalogId: identity.catalogId,
    category: identity.category,
    skillName: identity.skillName,
    trainingStatus,
    proficiency: payload.proficiency || 'beginner',
    // Someone who is not trained has no years of experience to record.
    yearsExperience: notTrained ? 0 : payload.yearsExperience,
    notes: payload.notes,
  });

  // Let HR know skills were updated, without spamming them for every admin
  // edit (only notify when an employee updates their own skill).
  // With a pick-from-the-list page, one person can update many skills in a
  // few minutes; announce the first change and stay quiet for 30 minutes so
  // HR's inbox isn't flooded (one notification + email per skill, per admin).
  if (requesterUser.id === targetUserId) {
    const link = `/admin/employees/${targetUserId}`;
    const alreadyAnnounced = await skillModel.recentSkillNotificationExists(link, 30).catch(() => false);
    if (!alreadyAnnounced) {
      notificationService
        .notifyAdmins({
          type: 'skill_updated',
          title: 'Employee skills updated',
          message: `${target.first_name} ${target.last_name} updated their skills (latest: ${identity.skillName}).`,
          link,
        })
        .catch(() => {}); // notification failures must never break the request
    }
  }

  return skill;
}

async function deleteSkill(requesterUser, targetUserId, skillId) {
  await assertTargetExists(targetUserId);
  assertCanEdit(requesterUser, targetUserId);

  const skill = await skillModel.findById(skillId);
  if (!skill || skill.user_id !== targetUserId) {
    throw AppError.notFound('Skill not found');
  }

  await skillModel.remove(skillId, targetUserId);
}

module.exports = { listSkills, upsertSkill, deleteSkill };
