/**
 * Turns a raw 360 Feedback response (category + Likert level + optional
 * comment) into a natural sentence, so HR reads something meaningful
 * ("Sometimes draws on their strengths to stay calm under pressure...")
 * instead of a bare "Sometimes" badge next to a quoted fragment.
 *
 * Deterministic on purpose - this renders every time the breakdown loads,
 * so it shouldn't cost an AI call or add latency. The AI-generated HR
 * Curated Summary (a separate feature) is where the real synthesis
 * across all reviewers happens; this just makes each individual response
 * readable on its own.
 */
const CATEGORY_TEMPLATES = {
  self_awareness: (level) => `${level} draws on their strengths to stay calm under pressure and learn from tough situations.`,
  driving_result: (level) => `${level} sets clear goals, completes tasks on time, and looks for ways to improve their work.`,
  leadership: (level) => `${level} supports others, takes initiative, and adapts well when things change.`,
  communication: (level) => `${level} communicates clearly and helps keep feedback flowing openly across the team.`,
  teamwork: (level) => `${level} supports the team, shares ideas, and handles conflict constructively.`,
  growth_development: (level) => `${level} shows strong habits for growing their skills and increasing their impact.`,
  starc: (level) =>
    `${level} takes actions that support company initiatives while living out sincerity, trust, approachability, respect, and curiosity.`,
};

export function describeCategoryResponse(categoryKey, levelLabel, comment) {
  const template = CATEGORY_TEMPLATES[categoryKey];
  const sentence = template ? template(levelLabel) : `${levelLabel}.`;
  return comment ? `${sentence} They added: "${comment}"` : sentence;
}
