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
        // `total` and `byProficiency` count TRAINED employees only, so they
        // keep meaning "who has this skill"; the other statuses are separate.
        total: 0,
        inTraining: 0,
        notTrained: 0,
        byProficiency: { beginner: 0, intermediate: 0, advanced: 0, expert: 0 },
      });
    }
    const entry = bySkill.get(key);
    if (r.training_status === 'in_training') {
      entry.inTraining += r.employee_count;
    } else if (r.training_status === 'not_trained') {
      entry.notTrained += r.employee_count;
    } else {
      entry.total += r.employee_count;
      entry.byProficiency[r.proficiency] = (entry.byProficiency[r.proficiency] || 0) + r.employee_count;
    }
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
