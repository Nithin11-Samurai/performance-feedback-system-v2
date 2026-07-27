/**
 * Deterministic (no AI, no API call, no cost) structured summary
 * generator for 360 Feedback. Takes the exact same `breakdown` object
 * the category breakdown view already uses and produces a readable,
 * editable draft: what's going well, what needs attention, grounded
 * directly in the actual category averages and any real comments
 * reviewers left - nothing invented, nothing paraphrased by a model.
 *
 * HR reviews/edits this before releasing it to the employee, exactly
 * like the AI-generated version did - this just computes it locally
 * instead of calling out to Claude.
 */

const CATEGORY_TEMPLATES = {
  self_awareness: (adverb) =>
    `${adverb} draws on their strengths to stay calm under pressure and learn from tough situations`,
  driving_result: (adverb) =>
    `${adverb} sets clear goals, completes tasks on time, and looks for ways to improve their work`,
  leadership: (adverb) => `${adverb} supports others, takes initiative, and adapts well when things change`,
  communication: (adverb) =>
    `${adverb} communicates clearly and helps keep feedback flowing openly across the team`,
  teamwork: (adverb) => `${adverb} supports the team, shares ideas, and handles conflict constructively`,
  growth_development: (adverb) => `${adverb} shows strong habits for growing their skills and increasing their impact`,
  starc: (adverb) =>
    `${adverb} takes actions that support company initiatives while living out sincerity, trust, approachability, respect, and curiosity`,
};

const STRENGTH_THRESHOLD = 3.5;

function adverbFromScore(avgScore) {
  if (avgScore >= 4.5) return 'Always';
  if (avgScore >= 3.5) return 'Consistently';
  if (avgScore >= 2.5) return 'Often';
  if (avgScore >= 1.5) return 'Sometimes';
  return 'Rarely';
}

function categorySentence(cat) {
  const template = CATEGORY_TEMPLATES[cat.key];
  const adverb = adverbFromScore(cat.avgScore);
  const base = template ? template(adverb) : `${adverb} shows ${cat.label.toLowerCase()}`;

  const comments = cat.responses.filter((r) => r.comment).map((r) => r.comment);
  if (comments.length === 0) return `${base}.`;
  if (comments.length === 1) return `${base}. Specifically: "${comments[0]}"`;
  return `${base}. Reviewers specifically noted: ${comments.map((c) => `"${c}"`).join('; ')}`;
}

/**
 * @param {object} breakdown - same shape as getCategoryBreakdown returns:
 *   { reviewerCount, overallRatingAvg, categories: [{key, label, avgScore, responses}], finalThoughts }
 * @param {string} employeeFirstName
 * @returns {string} a structured, editable draft summary
 */
export function generateStructuredSummary(breakdown, employeeFirstName) {
  if (!breakdown || breakdown.reviewerCount === 0) {
    return '';
  }

  const name = employeeFirstName || 'This employee';
  const scored = breakdown.categories.filter((c) => c.avgScore !== null);
  const strengths = scored.filter((c) => c.avgScore >= STRENGTH_THRESHOLD).sort((a, b) => b.avgScore - a.avgScore);
  const growthAreas = scored.filter((c) => c.avgScore < STRENGTH_THRESHOLD).sort((a, b) => a.avgScore - b.avgScore);

  const sections = [];

  const overallLine = breakdown.overallRatingAvg
    ? `Based on feedback from ${breakdown.reviewerCount} peer${breakdown.reviewerCount === 1 ? '' : 's'}, ${name}'s overall rating averaged ${breakdown.overallRatingAvg}/5.`
    : `Based on feedback from ${breakdown.reviewerCount} peer${breakdown.reviewerCount === 1 ? '' : 's'}.`;
  sections.push(overallLine);

  if (strengths.length > 0) {
    const lines = strengths.map((cat) => `- ${cat.label}: ${categorySentence(cat)}`);
    sections.push(`What's going well:\n${lines.join('\n')}`);
  }

  if (growthAreas.length > 0) {
    const lines = growthAreas.map((cat) => `- ${cat.label}: ${categorySentence(cat)}`);
    sections.push(`Where to focus next:\n${lines.join('\n')}`);
  }

  if (breakdown.finalThoughts.length > 0) {
    const quotes = breakdown.finalThoughts.map((t) => `"${t}"`).join(' ');
    sections.push(`Additional comments from peers: ${quotes}`);
  }

  return sections.join('\n\n');
}
