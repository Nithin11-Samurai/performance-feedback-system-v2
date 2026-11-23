/**
 * Skill catalog service. Anyone signed in can read the active list (the
 * My Skills picker needs it); only Admin-tier roles can change it, same as
 * the departments and job titles lists in Settings.
 *
 * Skills are never hard deleted: "removing" one hides it from the picker
 * (is_active = false) so employees who already have it keep their record.
 */
const skillCatalogModel = require('../models/skillCatalogModel');
const AppError = require('../utils/AppError');
const auditLog = require('../utils/auditLog');
const { isAdminTier, SKILL_CATEGORIES } = require('../config/constants');

function assertAdmin(requesterUser) {
  if (!isAdminTier(requesterUser.role)) {
    throw AppError.forbidden('Only HR/Admin can manage the skill list');
  }
}

function cleanName(name) {
  const value = String(name || '').trim().replace(/\s+/g, ' ');
  if (!value) throw AppError.badRequest('Skill name is required');
  if (value.length > 150) throw AppError.badRequest('Skill name must be 150 characters or fewer');
  return value;
}

function assertCategory(category) {
  if (!Object.values(SKILL_CATEGORIES).includes(category)) {
    throw AppError.badRequest(`category must be one of: ${Object.values(SKILL_CATEGORIES).join(', ')}`);
  }
}

async function listCatalog(requesterUser, { includeInactive = false } = {}) {
  // Inactive skills are only relevant to whoever manages the list.
  const wantInactive = includeInactive && isAdminTier(requesterUser.role);
  return skillCatalogModel.listAll({ includeInactive: wantInactive });
}

async function listCustomSkills(requesterUser) {
  assertAdmin(requesterUser);
  return skillCatalogModel.listCustomSkills();
}

async function createCatalogSkill(requesterUser, { name, category }) {
  assertAdmin(requesterUser);
  const skillName = cleanName(name);
  assertCategory(category);

  const existing = await skillCatalogModel.findByName(skillName);
  if (existing) {
    throw AppError.conflict(
      existing.is_active
        ? 'A skill with this name is already in the list'
        : 'This skill was removed earlier; restore it from the list instead'
    );
  }

  const created = await skillCatalogModel.create({ name: skillName, category, createdBy: requesterUser.id });
  // If employees had already typed this skill in themselves, attach them to it.
  await skillCatalogModel.linkCustomSkills(created.id, { name: created.name, category: created.category });
  await auditLog.record(requesterUser.id, 'CREATE_CATALOG_SKILL', 'skill_catalog', created.id, {
    name: created.name,
    category: created.category,
  });
  return created;
}

async function updateCatalogSkill(requesterUser, id, { name, category, isActive }) {
  assertAdmin(requesterUser);
  const current = await skillCatalogModel.findById(id);
  if (!current) throw AppError.notFound('Skill not found');

  const nextName = name === undefined ? undefined : cleanName(name);
  if (category !== undefined) assertCategory(category);

  if (nextName && nextName.toLowerCase() !== current.name.toLowerCase()) {
    const clash = await skillCatalogModel.findByName(nextName);
    if (clash && clash.id !== id) throw AppError.conflict('Another skill already has this name');
  }

  const updated = await skillCatalogModel.update(id, { name: nextName, category, isActive });

  if (updated.name !== current.name || updated.category !== current.category) {
    await skillCatalogModel.syncLinkedSkills(id, { name: updated.name, category: updated.category });
  }

  await auditLog.record(requesterUser.id, 'UPDATE_CATALOG_SKILL', 'skill_catalog', id, {
    from: { name: current.name, category: current.category, isActive: current.is_active },
    to: { name: updated.name, category: updated.category, isActive: updated.is_active },
  });
  return updated;
}

module.exports = { listCatalog, listCustomSkills, createCatalogSkill, updateCatalogSkill };
