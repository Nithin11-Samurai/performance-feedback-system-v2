/**
 * Skills dashboard service: turns the raw queries into what the dashboard
 * shows, for whichever people are "in view":
 *   scope "all"     everyone (optionally one department)
 *   scope "team"    one manager's direct reports (default: the person asking)
 *   scope "person"  a single person, with their full skills and certifications
 *
 * Access is decided by the route (section "skills_certs_overview"), so
 * anyone who can open the page sees everyone's numbers, as with the existing
 * overview tabs.
 */
const model = require('../models/skillsDashboardModel');
const skillCatalogModel = require('../models/skillCatalogModel');
const userModel = require('../models/userModel');
const AppError = require('../utils/AppError');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIST_LIMIT = 100;

function resolveScope(requester, { scope = 'all', managerId, userId, department } = {}) {
  if (!['all', 'team', 'person'].includes(scope)) throw AppError.badRequest('scope must be all, team or person');
  if (managerId && !UUID_RE.test(managerId)) throw AppError.badRequest('managerId must be a valid UUID');
  if (userId && !UUID_RE.test(userId)) throw AppError.badRequest('userId must be a valid UUID');
  const dept = typeof department === 'string' && department.trim() ? department.trim() : null;

  if (scope === 'team') return { scope, department: dept, managerId: managerId || requester.id, userId: null };
  if (scope === 'person') {
    if (!userId) throw AppError.badRequest('userId is required to look at one person');
    return { scope, department: null, managerId: null, userId };
  }
  return { scope, department: dept, managerId: null, userId: null };
}

const fullName = (r) => `${r.first_name} ${r.last_name}`;

function buildSkillItem({ key, catalogId, name, category, inactive, isCustom, target, agg, employees, targetsApply }) {
  const trained = agg?.trained || 0;
  const inTraining = agg?.in_training || 0;
  const notTrained = agg?.not_trained || 0;
  const hasTarget = targetsApply && target !== null && target !== undefined;
  let targetStatus = 'no_target';
  if (hasTarget) targetStatus = trained > target ? 'ahead' : trained === target ? 'on_target' : 'lacking';
  return {
    key,
    catalogId: catalogId || null,
    name,
    category,
    inactive: !!inactive,
    isCustom: !!isCustom,
    trained,
    inTraining,
    notTrained,
    notRated: Math.max(employees - (trained + inTraining + notTrained), 0),
    coveragePct: employees ? Math.round((trained * 100) / employees) : 0,
    byProficiency: {
      beginner: agg?.p_beginner || 0,
      intermediate: agg?.p_intermediate || 0,
      advanced: agg?.p_advanced || 0,
      expert: agg?.p_expert || 0,
    },
    target: hasTarget ? target : null,
    gap: hasTarget ? target - trained : null,
    targetStatus,
  };
}

async function getDashboard(requester, query = {}) {
  const p = resolveScope(requester, query);

  let personUser = null;
  if (p.scope === 'person') {
    personUser = await userModel.findById(p.userId);
    if (!personUser) throw AppError.notFound('User not found');
  }

  const [population, aggregates, inTraining, notTrained, certSummary, certAttention, catalog] = await Promise.all([
    model.getPopulation(p),
    model.getSkillAggregates(p),
    model.getInTraining(p, LIST_LIMIT),
    model.getNotTrained(p),
    model.getCertificationSummary(p),
    model.getCertificationAttention(p, LIST_LIMIT),
    skillCatalogModel.listAll({ includeInactive: true }),
  ]);

  const employees = population.length;
  // Company targets only make sense against the whole company.
  const targetsApply = p.scope === 'all' && !p.department;

  // ----- skills: every active catalog skill, plus anything people typed in themselves
  const aggByKey = new Map(aggregates.map((a) => [a.skill_key, a]));
  const skills = [];
  catalog.forEach((c) => {
    const agg = aggByKey.get(c.id);
    aggByKey.delete(c.id);
    if (!c.is_active && !agg) return;
    skills.push(
      buildSkillItem({ key: c.id, catalogId: c.id, name: c.name, category: c.category, inactive: !c.is_active, target: c.target_trained, agg, employees, targetsApply })
    );
  });
  aggByKey.forEach((agg) => {
    skills.push(
      buildSkillItem({ key: agg.skill_key, catalogId: agg.catalog_id, name: agg.name, category: agg.category, isCustom: !agg.catalog_id, agg, employees, targetsApply })
    );
  });

  const hasTargets = skills.some((s) => s.target !== null);
  const lacking = skills.filter((s) => s.targetStatus === 'lacking').sort((a, b) => b.gap - a.gap || a.name.localeCompare(b.name)).slice(0, 8);
  const ahead = skills.filter((s) => s.targetStatus === 'ahead').sort((a, b) => a.gap - b.gap || a.name.localeCompare(b.name)).slice(0, 8);
  const listed = skills.filter((s) => !s.inactive && !s.isCustom);
  const leastCovered = [...listed].sort((a, b) => a.trained - b.trained || a.name.localeCompare(b.name)).slice(0, 5);
  const mostCovered = [...listed].filter((s) => s.trained > 0).sort((a, b) => b.trained - a.trained || a.name.localeCompare(b.name)).slice(0, 5);

  // ----- who to push for training
  const lackingKeys = new Set(skills.filter((s) => s.targetStatus === 'lacking').map((s) => s.key));
  const basis = lackingKeys.size ? 'target' : 'not_trained';
  const byPerson = new Map();
  notTrained.forEach((r) => {
    if (basis === 'target' && !lackingKeys.has(r.skill_key)) return;
    if (!byPerson.has(r.user_id)) {
      byPerson.set(r.user_id, { userId: r.user_id, name: fullName(r), jobTitle: r.job_title, department: r.department, skills: [] });
    }
    byPerson.get(r.user_id).skills.push(r.skill_name);
  });
  const pushPeople = [...byPerson.values()]
    .map((x) => ({ ...x, skillCount: x.skills.length, skills: x.skills.sort().slice(0, 6) }))
    .sort((a, b) => b.skillCount - a.skillCount || a.name.localeCompare(b.name));

  // ----- profile completeness
  const completeness = {
    personalDone: population.filter((u) => u.personal_done).length,
    withSkills: population.filter((u) => u.has_skills).length,
    certificationsDone: population.filter((u) => u.certs_done).length,
    fullyComplete: population.filter((u) => u.personal_done && u.has_skills && u.certs_done).length,
  };
  const incompleteAll = population
    .map((u) => ({
      userId: u.id,
      name: fullName(u),
      jobTitle: u.job_title,
      department: u.department,
      missing: [!u.personal_done && 'personal information', !u.has_skills && 'skills', !u.certs_done && 'certifications'].filter(Boolean),
    }))
    .filter((u) => u.missing.length > 0)
    .sort((a, b) => b.missing.length - a.missing.length || a.name.localeCompare(b.name));
  const noSkillsAll = population.filter((u) => !u.has_skills).map((u) => ({ userId: u.id, name: fullName(u), jobTitle: u.job_title, department: u.department }));

  // ----- certifications
  const attention = certAttention.map((c) => ({
    id: c.id,
    name: c.name,
    issuer: c.issuing_organization,
    expiryDate: c.expiry_date,
    daysLeft: c.days_left,
    state: c.days_left < 0 ? 'expired' : 'expiring',
    userId: c.user_id,
    person: fullName(c),
    department: c.department,
  }));

  const result = {
    scope: p.scope,
    department: p.department,
    employees,
    targetsApply,
    hasTargets,
    completeness,
    totals: {
      trained: skills.reduce((n, s) => n + s.trained, 0),
      inTraining: skills.reduce((n, s) => n + s.inTraining, 0),
      notTrained: skills.reduce((n, s) => n + s.notTrained, 0),
    },
    skills,
    lacking,
    ahead,
    leastCovered,
    mostCovered,
    pushList: { basis, total: pushPeople.length, people: pushPeople.slice(0, 20) },
    inTraining: {
      total: inTraining.length,
      items: inTraining.map((r) => ({ userId: r.user_id, name: fullName(r), department: r.department, skill: r.skill_name, since: r.updated_at })),
    },
    noSkillsYet: { total: noSkillsAll.length, people: noSkillsAll.slice(0, LIST_LIMIT) },
    incomplete: { total: incompleteAll.length, people: incompleteAll.slice(0, LIST_LIMIT) },
    certifications: {
      total: certSummary.total,
      expired: certSummary.expired,
      expiring30: certSummary.expiring_30,
      expiring60: certSummary.expiring_60,
      expiring90: certSummary.expiring_90,
      attention,
    },
    person: null,
  };

  if (personUser) {
    const [personSkills, personCerts] = await Promise.all([model.getPersonSkills(p.userId), model.getPersonCertifications(p.userId)]);
    const row = population.find((u) => u.id === p.userId);
    result.person = {
      id: personUser.id,
      name: `${personUser.first_name} ${personUser.last_name}`,
      email: personUser.email,
      jobTitle: personUser.job_title,
      department: personUser.department,
      managerName: personUser.manager_first_name ? `${personUser.manager_first_name} ${personUser.manager_last_name}` : null,
      // A deactivated person isn't in the population, so say so instead of showing zeros as fact.
      inactive: !row,
      setup: row ? { personal: row.personal_done, skills: row.has_skills, certifications: row.certs_done } : null,
      skills: personSkills,
      certifications: personCerts,
    };
  }

  return result;
}

/** One skill, everyone in view grouped by where they stand on it. */
async function getSkillPeople(requester, query = {}) {
  const p = resolveScope(requester, query);
  const { skillKey } = query;
  if (!skillKey || typeof skillKey !== 'string') throw AppError.badRequest('skillKey is required');

  let catalogId = null;
  let skillName;
  let category = null;
  let target = null;
  if (skillKey.startsWith('custom:')) {
    skillName = skillKey.slice('custom:'.length);
    if (!skillName) throw AppError.badRequest('skillKey is not valid');
  } else {
    if (!UUID_RE.test(skillKey)) throw AppError.badRequest('skillKey is not valid');
    const entry = await skillCatalogModel.findById(skillKey);
    if (!entry) throw AppError.notFound('Skill not found');
    catalogId = entry.id;
    skillName = entry.name;
    category = entry.category;
    target = entry.target_trained;
  }

  const rows = await model.getSkillPeople(p, { catalogId, nameLower: skillName.toLowerCase() });

  // A person with two records for the same skill counts once, at their best status.
  const rank = { trained: 3, in_training: 2, not_trained: 1 };
  const best = new Map();
  rows.forEach((r) => {
    const current = best.get(r.user_id);
    if (!current || (rank[r.training_status] || 0) > (rank[current.training_status] || 0)) best.set(r.user_id, r);
  });

  const groups = { trained: [], inTraining: [], notTrained: [], notRated: [] };
  best.forEach((r) => {
    const person = {
      userId: r.user_id,
      name: fullName(r),
      jobTitle: r.job_title,
      department: r.department,
      proficiency: r.training_status === 'trained' || r.training_status === 'in_training' ? r.proficiency : null,
      yearsExperience: r.training_status === 'not_trained' ? null : r.years_experience,
      updatedAt: r.updated_at,
    };
    if (r.training_status === 'trained') groups.trained.push(person);
    else if (r.training_status === 'in_training') groups.inTraining.push(person);
    else if (r.training_status === 'not_trained') groups.notTrained.push(person);
    else groups.notRated.push(person);
  });

  return {
    skill: { key: skillKey, name: skillName, category, target },
    employees: best.size,
    counts: {
      trained: groups.trained.length,
      inTraining: groups.inTraining.length,
      notTrained: groups.notTrained.length,
      notRated: groups.notRated.length,
    },
    groups,
  };
}

async function searchPeople(term) {
  const value = String(term || '').trim();
  if (value.length < 2) return [];
  const rows = await model.searchPeople(value, 15);
  return rows.map((r) => ({ id: r.id, name: fullName(r), email: r.email, jobTitle: r.job_title, department: r.department }));
}

async function listManagers() {
  const rows = await model.listManagers();
  return rows.map((r) => ({ id: r.id, name: fullName(r), teamSize: r.team_size }));
}

module.exports = { getDashboard, getSkillPeople, searchPeople, listManagers };
