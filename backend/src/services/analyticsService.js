const analyticsModel = require('../models/analyticsModel');

async function getOverview() {
  const [departmentAnalytics, topPerformers, skillGapAnalysis, certificationStats, cycleTrends] = await Promise.all([
    analyticsModel.getDepartmentAnalytics(),
    analyticsModel.getTopPerformers(5),
    analyticsModel.getSkillGapAnalysis(),
    analyticsModel.getCertificationStats(),
    analyticsModel.getCycleTrends(),
  ]);

  return { departmentAnalytics, topPerformers, skillGapAnalysis, certificationStats, cycleTrends };
}

/**
 * Item 7: aggregates the raw per-proficiency skill rows into a friendlier
 * shape: one entry per skill, with a `byProficiency` breakdown and a total.
 */
async function getSkillsOverview() {
  const rows = await analyticsModel.getSkillsOverview();
  const bySkill = new Map();

  rows.forEach((r) => {
    const key = `${r.category}::${r.skill_name}`;
    if (!bySkill.has(key)) {
      bySkill.set(key, {
        category: r.category,
        skillName: r.skill_name,
        total: 0,
        byProficiency: { beginner: 0, intermediate: 0, advanced: 0, expert: 0 },
      });
    }
    const entry = bySkill.get(key);
    entry.total += r.employee_count;
    entry.byProficiency[r.proficiency] = r.employee_count;
  });

  return Array.from(bySkill.values()).sort((a, b) => b.total - a.total);
}

async function getEmployeesForSkill(category, skillName) {
  return analyticsModel.getEmployeesForSkill(category, skillName);
}

async function getCertificationsOverview() {
  return analyticsModel.getCertificationsOverview();
}

async function getEmployeesForCertification(name) {
  return analyticsModel.getEmployeesForCertification(name);
}

module.exports = {
  getOverview,
  getSkillsOverview,
  getEmployeesForSkill,
  getCertificationsOverview,
  getEmployeesForCertification,
};
