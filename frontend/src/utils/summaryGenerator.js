/**
 * Deterministic (no AI, no API call, no cost) summary generation for
 * 360 Feedback - both the aggregate HR-facing summary and the
 * per-reviewer summaries shown in "full detail by reviewer". Both read
 * directly from real category scores/comments; nothing is invented.
 */

// Clause form (no leading subject/adverb) so these can be woven into
// flowing sentences rather than read as a flat "Category: Level" list.
const CATEGORY_CLAUSES = {
  self_awareness: 'draw on their strengths to stay calm under pressure and learn from tough situations',
  driving_result: 'set clear goals, complete tasks on time, and keep looking for ways to improve their work',
  leadership: 'support others, take initiative, and adapt well when things change',
  communication: 'communicate clearly and help keep feedback flowing openly across the team',
  teamwork: 'support the team, share ideas, and handle conflict constructively',
  growth_development: 'build strong habits for growing their skills and increasing their impact',
  starc: 'support company initiatives while living out sincerity, trust, approachability, respect, and curiosity',
};

const STRENGTH_THRESHOLD = 3.5;

function joinNaturally(items) {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function joinClauses(clauses) {
  // Joins verb-phrase clauses into one flowing sentence body, e.g.
  // "set clear goals, ...; support others, ...; and communicate clearly, ..."
  if (clauses.length === 0) return '';
  if (clauses.length === 1) return clauses[0];
  if (clauses.length === 2) return `${clauses[0]}, and ${clauses[1]}`;
  return `${clauses.slice(0, -1).join('; ')}; and ${clauses[clauses.length - 1]}`;
}

// Lowercases a category label for mid-sentence use, but preserves
// all-caps acronyms (e.g. "STARC") rather than mangling them to lowercase.
function toMidSentenceCase(label) {
  return label
    .split(' ')
    .map((word) => (/^[A-Z]{2,}$/.test(word.replace(/[()]/g, '')) ? word : word.toLowerCase()))
    .join(' ');
}

// ---------------------------------------------------------------------------
// Aggregate HR-facing summary (the "Generate Summary" button)
// ---------------------------------------------------------------------------

/**
 * @param {object} breakdown - { reviewerCount, overallRatingAvg, categories: [{key, label, avgScore, responses}], finalThoughts }
 * @param {string} employeeFirstName
 * @returns {string} flowing, professional draft - editable before release
 */
export function generateStructuredSummary(breakdown, employeeFirstName) {
  if (!breakdown || breakdown.reviewerCount === 0) return '';

  const name = employeeFirstName || 'This employee';
  const scored = breakdown.categories.filter((c) => c.avgScore !== null);
  const strengths = scored.filter((c) => c.avgScore >= STRENGTH_THRESHOLD).sort((a, b) => b.avgScore - a.avgScore);
  const growthAreas = scored.filter((c) => c.avgScore < STRENGTH_THRESHOLD).sort((a, b) => a.avgScore - b.avgScore);

  const paragraphs = [];

  paragraphs.push(
    `${name} received feedback from ${breakdown.reviewerCount} peer${breakdown.reviewerCount === 1 ? '' : 's'} this cycle` +
      (breakdown.overallRatingAvg ? `, with an overall rating of ${breakdown.overallRatingAvg}/5.` : '.')
  );

  if (strengths.length > 0) {
    const labels = joinNaturally(strengths.map((c) => toMidSentenceCase(c.label)));
    const clauses = joinClauses(strengths.map((c) => CATEGORY_CLAUSES[c.key] || toMidSentenceCase(c.label)));
    let para = `${name} stands out for ${labels}. Peers consistently noted that they ${clauses}.`;

    const strengthComments = strengths.flatMap((c) => c.responses.filter((r) => r.comment).map((r) => r.comment));
    if (strengthComments.length > 0) {
      para += ` As one peer put it: "${strengthComments[0]}"`;
    }
    paragraphs.push(para);
  }

  if (growthAreas.length > 0) {
    const labels = joinNaturally(growthAreas.map((c) => toMidSentenceCase(c.label)));
    const clauses = joinClauses(growthAreas.map((c) => CATEGORY_CLAUSES[c.key] || toMidSentenceCase(c.label)));
    let para = `There's also room to grow, particularly around ${labels}. Building on the strengths above, ${name} would benefit from focusing on how they ${clauses}.`;

    const growthComments = growthAreas.flatMap((c) => c.responses.filter((r) => r.comment).map((r) => r.comment));
    if (growthComments.length > 0) {
      para += ` A specific note from a peer: "${growthComments[0]}"`;
    }
    paragraphs.push(para);
  }

  if (breakdown.finalThoughts.length > 0) {
    const quotes = breakdown.finalThoughts.map((t) => `"${t}"`);
    paragraphs.push(`Overall, peers summed up their experience working with ${name} as ${joinNaturally(quotes)}.`);
  }

  return paragraphs.join('\n\n');
}

// ---------------------------------------------------------------------------
// Per-reviewer summary (the "full detail by reviewer" section)
// ---------------------------------------------------------------------------

/**
 * Turns ONE reviewer's raw category selections + final comment into a
 * short flowing paragraph, instead of a flat "Category: Level" list.
 *
 * @param {object} categoryScores - { [categoryKey]: { score: 1-5, comment } }
 * @param {Array} categories - the FEEDBACK_CATEGORIES schema (key, label)
 * @param {Array} likertScale - [{value, label}], e.g. {1:'Rarely'...5:'Always'}
 * @param {string|null} finalThoughtComment
 * @returns {string}
 */
export function generateReviewerSummary(categoryScores, categories, likertScale, finalThoughtComment) {
  const answered = categories
    .map((cat) => {
      const entry = categoryScores?.[cat.key];
      if (!entry?.score) return null;
      const levelLabel = likertScale.find((l) => l.value === entry.score)?.label || '';
      return { ...cat, score: entry.score, levelLabel, comment: entry.comment || null };
    })
    .filter(Boolean);

  if (answered.length === 0) return '';

  const strong = answered.filter((a) => a.score >= 4).sort((a, b) => b.score - a.score);
  const weak = answered.filter((a) => a.score <= 2).sort((a, b) => a.score - b.score);
  const middle = answered.filter((a) => a.score === 3);

  const sentences = [];

  if (strong.length > 0) {
    const clauses = joinClauses(strong.map((a) => CATEGORY_CLAUSES[a.key] || toMidSentenceCase(a.label)));
    sentences.push(`This reviewer felt the employee consistently ${clauses}.`);
  }

  if (weak.length > 0) {
    const labels = joinNaturally(weak.map((a) => toMidSentenceCase(a.label)));
    sentences.push(`They saw more room to grow around ${labels}.`);
  }

  if (middle.length > 0 && strong.length === 0 && weak.length === 0) {
    const clauses = joinClauses(middle.map((a) => CATEGORY_CLAUSES[a.key] || toMidSentenceCase(a.label)));
    sentences.push(`This reviewer felt the employee often ${clauses}.`);
  }

  const anyComment = answered.find((a) => a.comment)?.comment;
  if (anyComment) {
    sentences.push(`Specific note: "${anyComment}"`);
  }

  if (finalThoughtComment) {
    sentences.push(`Final thoughts: "${finalThoughtComment}"`);
  }

  return sentences.join(' ');
}
