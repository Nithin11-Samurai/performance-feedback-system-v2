/**
 * Application-wide constants.
 * Keeping these in one file avoids "magic string" typos scattered across
 * controllers/validators (e.g. 'admin' vs 'Admin').
 */

const ROLES = Object.freeze({
  EMPLOYEE: 'employee',
  MANAGER: 'manager',
  ADMIN: 'admin', // legacy full-access role, kept permanently for backward compatibility
  GLOBAL_ADMIN: 'global_admin',
  SYSTEM_ADMIN: 'system_admin',
  HR_MANAGER: 'hr_manager',
});

const ALL_ROLES = Object.values(ROLES);

// Item 2: these four roles all get "admin-tier" access by default (full
// employee/cycle/analytics/notes management). 'admin' is kept so nothing
// that already worked before this role expansion breaks. Fine-grained
// per-user overrides on top of this default live in user_section_permissions
// (Item 10) — see permissionService.js.
const ADMIN_TIER_ROLES = [ROLES.ADMIN, ROLES.GLOBAL_ADMIN, ROLES.SYSTEM_ADMIN, ROLES.HR_MANAGER];

function isAdminTier(role) {
  return ADMIN_TIER_ROLES.includes(role);
}

// Roles permitted to view internal 1:1 notes and trigger full employee exports.
const HR_LIKE_ROLES = ADMIN_TIER_ROLES;

const REVIEW_CYCLE_STATUS = Object.freeze({
  DRAFT: 'draft',
  ACTIVE: 'active',
  CLOSED: 'closed',
});

const FEEDBACK_TYPE = Object.freeze({
  SELF: 'self',
  MANAGER: 'manager',
  PEER: 'peer',
  HR: 'hr',
  SKIP_LEVEL: 'skip_level',
  PROJECT_LEAD: 'project_lead',
  MENTOR: 'mentor',
  TEAM_LEAD: 'team_lead',
  MD: 'md',
});

// Reviewer types that require an explicit HR-created assignment (via
// peer_review_assignments) before that person can submit feedback. Self and
// manager are excluded: self is implicit (you review yourself), manager is
// implicit from the reporting hierarchy (manager_id). These assignments now
// live on the Employee Detail page (Employees -> select employee ->
// Reviewers tab), not the Review Cycle page.
const ASSIGNABLE_REVIEWER_TYPES = [
  FEEDBACK_TYPE.PEER,
  FEEDBACK_TYPE.HR,
  FEEDBACK_TYPE.SKIP_LEVEL,
  FEEDBACK_TYPE.PROJECT_LEAD,
  FEEDBACK_TYPE.MENTOR,
  FEEDBACK_TYPE.TEAM_LEAD,
  FEEDBACK_TYPE.MD,
];

const FEEDBACK_STATUS = Object.freeze({
  PENDING: 'pending',
  SUBMITTED: 'submitted',
});

const NOTIFICATION_TYPE = Object.freeze({
  REVIEW_ASSIGNED: 'review_assigned',
  REVIEW_SUBMITTED: 'review_submitted',
  CERTIFICATION_UPLOADED: 'certification_uploaded',
  SKILL_UPDATED: 'skill_updated',
  NOTE_UPLOADED: 'note_uploaded',
  CYCLE_CLOSING_SOON: 'cycle_closing_soon',
});

const SKILL_CATEGORIES = Object.freeze({
  SALESFORCE: 'salesforce',
  CONGA: 'conga',
  OTHER: 'other',
});

const PROFICIENCY_LEVELS = Object.freeze({
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
  EXPERT: 'expert',
});

/**
 * Item 2: the actual 360° Feedback question set, replacing the old
 * generic strengths/improvement-areas form for peer_insight_feedback
 * submissions specifically. Each category is a mandatory 1-5 Likert
 * score (see LIKERT_SCALE) plus an optional free-text comment.
 */
const FEEDBACK_CATEGORIES = Object.freeze([
  {
    key: 'self_awareness',
    label: 'Self-Awareness',
    question:
      'Does the team member use their strengths to handle tough situations, stay calm under pressure, and learn from the experience?',
  },
  {
    key: 'driving_result',
    label: 'Driving Result',
    question: 'Does the team member set goals, complete tasks on time, solve problems well, and try to keep improving their work?',
  },
  {
    key: 'leadership',
    label: 'Leadership',
    question: 'Does the team member support others, act responsibly, take initiative, and adapt to change?',
  },
  {
    key: 'communication',
    label: 'Communication',
    question:
      'Does the team member communicate clearly, give and receive feedback well, and promote open communication in the team?',
  },
  {
    key: 'teamwork',
    label: 'Teamwork',
    question: 'Does the team member support the team, share ideas, handle conflicts well, and appreciate others?',
  },
  {
    key: 'growth_development',
    label: 'Growth & Development',
    question:
      'What skills or habits can the team member improve to grow, work more efficiently, and have a bigger impact?',
  },
  {
    key: 'starc',
    label: "Samurai's World (STARC in Action)",
    question:
      'Do they take actions to support company initiatives and promote overall growth while upholding sincerity, trust, approachability, respect, and curiosity?',
  },
]);

const LIKERT_SCALE = Object.freeze([
  { value: 1, label: 'Rarely' },
  { value: 2, label: 'Sometimes' },
  { value: 3, label: 'Often' },
  { value: 4, label: 'Consistently' },
  { value: 5, label: 'Always' },
]);

module.exports = {
  ROLES,
  ALL_ROLES,
  ADMIN_TIER_ROLES,
  isAdminTier,
  HR_LIKE_ROLES,
  REVIEW_CYCLE_STATUS,
  FEEDBACK_TYPE,
  ASSIGNABLE_REVIEWER_TYPES,
  FEEDBACK_STATUS,
  NOTIFICATION_TYPE,
  SKILL_CATEGORIES,
  PROFICIENCY_LEVELS,
  FEEDBACK_CATEGORIES,
  LIKERT_SCALE,
};
