/**
 * Skill service.
 * Visibility mirrors userService.canViewProfile (self / direct manager /
 * Admin). Editing is stricter: only the employee themself or Admin/HR can
 * change skill data — a manager can see it, but shouldn't be able to type
 * over an employee's self-reported skill level.
 */
const skillModel = require('../models/skillModel');
const userModel = require('../models/userModel');
const userService = require('./userService');
const notificationService = require('./notificationService');
const AppError = require('../utils/AppError');
const { ROLES, isAdminTier } = require('../config/constants');

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

async function upsertSkill(requesterUser, targetUserId, payload) {
  const target = await assertTargetExists(targetUserId);
  assertCanEdit(requesterUser, targetUserId);

  const skill = await skillModel.upsert({
    userId: targetUserId,
    category: payload.category,
    skillName: payload.skillName,
    proficiency: payload.proficiency || 'beginner',
    yearsExperience: payload.yearsExperience,
    notes: payload.notes,
  });

  // Let HR know skills were updated, without spamming them for every admin
  // edit (only notify when an employee updates their own skill).
  if (requesterUser.id === targetUserId) {
    notificationService
      .notifyAdmins({
        type: 'skill_updated',
        title: 'Employee skill updated',
        message: `${target.first_name} ${target.last_name} updated their ${payload.category} skill: ${payload.skillName}.`,
        link: `/admin/employees/${targetUserId}`,
      })
      .catch(() => {}); // notification failures must never break the request
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
