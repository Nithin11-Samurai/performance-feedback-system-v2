/**
 * Claude service — thin wrapper around the Anthropic SDK.
 * Kept separate from aiSummaryService so the prompt-building/data-gathering
 * logic isn't tangled with the raw API call, and so this file is the only
 * place that needs to change if we ever swap models or SDK versions.
 */
const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config/env');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

let client = null;

function getClient() {
  if (!config.claude.apiKey) {
    return null;
  }
  if (!client) {
    client = new Anthropic({ apiKey: config.claude.apiKey });
  }
  return client;
}

/**
 * Builds the prompt from structured performance data and asks Claude to
 * synthesize it into an HR-ready summary. Kept as plain text in, plain
 * text out — the caller decides how to render/store it.
 *
 * @param {object} params
 * @param {object} params.employee - { first_name, last_name, job_title, department }
 * @param {object} params.cycle - { name, start_date, end_date }
 * @param {Array}  params.feedbackEntries - full feedback rows (self/manager/peer), submitted only
 * @param {Array}  params.skills - employee's skill records
 * @param {Array}  params.certifications - employee's certification records
 */
async function generatePerformanceSummary({ employee, cycle, feedbackEntries, skills, certifications }) {
  const anthropic = getClient();
  if (!anthropic) {
    throw AppError.badRequest(
      'AI summary generation is not configured. Set ANTHROPIC_API_KEY in the backend environment to enable this feature.'
    );
  }

  const prompt = buildPrompt({ employee, cycle, feedbackEntries, skills, certifications });

  try {
    const response = await anthropic.messages.create({
      model: config.claude.model,
      max_tokens: 1800,
      system:
        'You are an HR performance-review assistant. You write concise, balanced, evidence-based summaries ' +
        'for HR and managers preparing for a performance conversation. Ground every statement in the feedback ' +
        'provided — do not invent specifics that were not mentioned. Be constructive and professional. ' +
        'Never fabricate ratings, dates, or names beyond what is given. When asked for promotion readiness or ' +
        'training recommendations, treat these as observations to support a human decision-maker, not a ' +
        'final verdict — explicitly flag when the available feedback is too thin to support a confident ' +
        'recommendation, rather than overstating certainty. When writing the section addressed directly to the ' +
        'employee, be genuinely warm and human — celebrate real wins specifically and by name, and frame any ' +
        'growth areas as achievable next steps rather than shortcomings, without ever being saccharine or ' +
        'downplaying real, substantive feedback.',
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock) {
      throw AppError.internal('Claude returned no text content');
    }
    return textBlock.text.trim();
  }catch (err) {
  console.log("========== ANTHROPIC ERROR ==========");
  console.dir(err, { depth: null });
  console.log("status:", err.status);
  console.log("message:", err.message);
  console.log("body:", err.body);
  console.log("response:", err.response);
  console.log("=====================================");

  throw err;
}
}

function buildPrompt({ employee, cycle, feedbackEntries, skills, certifications }) {
  const employeeName = `${employee.first_name} ${employee.last_name}`;

  const feedbackByType = { self: [], manager: [], peer: [] };
  feedbackEntries.forEach((f) => {
    if (feedbackByType[f.type]) feedbackByType[f.type].push(f);
  });

  const formatEntry = (f, includeReviewer) => {
    const lines = [];
    if (includeReviewer) lines.push(`Reviewer: ${f.reviewer_first_name} ${f.reviewer_last_name} (${f.reviewer_role})`);
    if (f.rating) lines.push(`Rating: ${f.rating}/5`);
    if (f.strengths) lines.push(`Strengths noted: ${f.strengths}`);
    if (f.improvement_areas) lines.push(`Areas for improvement noted: ${f.improvement_areas}`);
    if (f.achievements) lines.push(`Achievements noted: ${f.achievements}`);
    if (f.goals) lines.push(`Goals noted: ${f.goals}`);
    if (f.comments) lines.push(`Comments: ${f.comments}`);
    return lines.join('\n');
  };

  const sections = [];

  sections.push(`Employee: ${employeeName}`);
  sections.push(`Role: ${employee.job_title || 'N/A'} | Department: ${employee.department || 'N/A'}`);
  sections.push(`Review cycle: ${cycle.name} (${cycle.start_date} to ${cycle.end_date})`);

  if (skills?.length) {
    sections.push(
      `\nSkills on file:\n${skills.map((s) => `- [${s.category}] ${s.skill_name}: ${s.proficiency} (${s.years_experience} yrs)`).join('\n')}`
    );
  }

  if (certifications?.length) {
    sections.push(
      `\nCertifications on file:\n${certifications.map((c) => `- ${c.name} (${c.issuing_organization || 'N/A'}${c.issue_date ? ', issued ' + c.issue_date : ''})`).join('\n')}`
    );
  }

  if (feedbackByType.self.length) {
    sections.push(`\n--- Self-review ---\n${feedbackByType.self.map((f) => formatEntry(f, false)).join('\n\n')}`);
  }
  if (feedbackByType.manager.length) {
    sections.push(`\n--- Manager feedback ---\n${feedbackByType.manager.map((f) => formatEntry(f, true)).join('\n\n')}`);
  }
  if (feedbackByType.peer.length) {
    sections.push(
      `\n--- Peer feedback (${feedbackByType.peer.length} reviewer(s)) ---\n${feedbackByType.peer
        .map((f) => formatEntry(f, false))
        .join('\n\n')}`
    );
  }

  sections.push(
    '\n\nBased ONLY on the information above, write a performance summary for HR with these sections:\n' +
      '1. Overall Assessment (2-3 sentences)\n' +
      '2. Key Strengths (bullet points, cite whether self/manager/peer noted it)\n' +
      '3. Areas for Growth / Weaknesses (bullet points)\n' +
      '4. Notable Patterns or Discrepancies (e.g. self-rating vs manager/peer rating gaps, consistent themes)\n' +
      '5. Promotion Readiness (one short paragraph — state clearly if there is insufficient evidence either way; ' +
      'never recommend a promotion based on a single data point)\n' +
      '6. Suggested Training or Development Areas (bullet points, tied directly to the growth areas above)\n' +
      '7. Overall Sentiment (one line: characterize whether the feedback collectively reads as positive, mixed, ' +
      'or concerning, and briefly say why)\n' +
      `8. A Note for ${employee.first_name} (Item 13 — written directly to ${employee.first_name}, second person, ` +
      'separate from the HR-facing sections above):\n' +
      `   - If the feedback is predominantly positive/strong, open by congratulating ${employee.first_name} by ` +
      'name and specifically naming what they should feel proud of, grounded in the actual feedback above.\n' +
      '   - If there are specific tool/skill gaps mentioned (e.g. a named Salesforce or Conga product/feature), ' +
      'suggest concrete next steps: point them to Salesforce Trailhead (trailhead.salesforce.com) for ' +
      'Salesforce-related gaps, or Conga University / Conga\'s official documentation for Conga-related gaps. ' +
      'Only reference these two resources for that purpose, and only when the gap is specifically about a ' +
      'Salesforce or Conga tool named in the feedback — do not invent a specific course URL or claim a specific ' +
      'course exists; point to the platform generally (e.g. "search Trailhead for Apex fundamentals modules").\n' +
      '   - Whether the feedback is strong or mixed, keep this note warm, encouraging, and forward-looking — ' +
      'never harsh, discouraging, or purely critical. Frame growth areas as an opportunity, not a deficiency.\n' +
      '   - 3-5 sentences. This is the one section meant to be shown directly to the employee, so write it that way.\n' +
      'Keep the total response under 550 words. Do not include any information not present above. If a section ' +
      'has no supporting evidence, say so explicitly rather than inventing content.'
  );

  return sections.join('\n');
}

/**
 * Item: AI-drafted curated summary for 360° Feedback. Unlike
 * generatePerformanceSummary (HR-facing, cites reviewer roles), this
 * writes directly to the employee and deliberately never mentions who
 * said what — the category breakdown passed in already has reviewer
 * names, but this function ignores them when building the prompt so the
 * output reads as "your peers" collectively, matching what HR is
 * curating for release.
 */
async function generatePeerInsightSummary({ employee, breakdown }) {
  const anthropic = getClient();
  if (!anthropic) {
    throw AppError.badRequest(
      'AI summary generation is not configured. Set ANTHROPIC_API_KEY in the backend environment to enable this feature.'
    );
  }

  const prompt = buildPeerInsightPrompt({ employee, breakdown });

  try {
    const response = await anthropic.messages.create({
      model: config.claude.model,
      max_tokens: 900,
      system:
        'You write curated 360-degree peer feedback summaries that HR will review, edit, and send directly ' +
        'to the employee. Write in second person, addressed to the employee by first name. Ground every ' +
        'statement in the feedback provided — never invent specifics, names, or examples not present in the ' +
        'data. NEVER mention or imply any individual reviewer\'s identity, even indirectly (no "one peer said", ' +
        'no distinguishing details that could identify who said what) — refer to feedback collectively as ' +
        '"your peers" or "the feedback". Be warm, specific, and constructive: name concrete strengths the ' +
        'data supports, and frame growth areas as actionable opportunities rather than criticism. Where ' +
        'responses are mixed or split, say so honestly rather than smoothing it over. Keep it concise.',
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock) {
      throw AppError.internal('Claude returned no text content');
    }
    return textBlock.text.trim();
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error('Claude API call failed (peer insight summary)', { error: err.message });
    throw AppError.internal('Failed to generate AI summary. Please try again shortly.');
  }
}

function buildPeerInsightPrompt({ employee, breakdown }) {
  const sections = [];
  sections.push(`Employee: ${employee.first_name} ${employee.last_name}`);
  sections.push(`Role: ${employee.job_title || 'N/A'} | Department: ${employee.department || 'N/A'}`);
  sections.push(`Number of peers who submitted feedback: ${breakdown.reviewerCount}`);
  if (breakdown.overallRatingAvg) {
    sections.push(`Average overall rating: ${breakdown.overallRatingAvg}/5`);
  }

  sections.push('\n--- Category breakdown (do not attribute any of this to a specific person) ---');
  breakdown.categories.forEach((cat) => {
    if (cat.responses.length === 0) return;
    const lines = [`\n${cat.label} — average: ${cat.avgScore}/5 (scale: Rarely=1 to Always=5)`];
    lines.push(`Question asked: ${cat.question}`);
    lines.push('Responses (anonymous):');
    cat.responses.forEach((r) => {
      lines.push(`- ${r.scoreLabel}${r.comment ? `: "${r.comment}"` : ''}`);
    });
    sections.push(lines.join('\n'));
  });

  if (breakdown.finalThoughts.length) {
    sections.push(`\n--- Final thoughts from peers (anonymous) ---\n${breakdown.finalThoughts.map((t) => `- "${t}"`).join('\n')}`);
  }

  sections.push(
    `\n\nWrite a curated 360° feedback summary addressed directly to ${employee.first_name}, based ONLY on ` +
      'the data above. Structure:\n' +
      '1. Open with 1-2 sentences naming a genuine strength the data supports.\n' +
      '2. A short paragraph on themes across categories — where peers consistently agree, and where responses ' +
      'were mixed (name the specific categories).\n' +
      "3. 1-3 concrete, actionable growth suggestions tied directly to the lower-scoring categories or comments above.\n" +
      '4. A brief, genuine closing note.\n' +
      'Keep it under 250 words. Do not use headers or bullet lists in the output — write it as flowing, ' +
      'natural prose HR could send as-is. Never mention category names verbatim like a checklist; weave them ' +
      'into natural sentences instead.'
  );

  return sections.join('\n');
}

module.exports = { generatePerformanceSummary, generatePeerInsightSummary };
