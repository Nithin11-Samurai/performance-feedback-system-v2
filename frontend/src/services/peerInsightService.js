import { api } from './api';

// Item 2: the actual 360° Feedback question set.
export async function getFeedbackFormSchema() {
  const { data } = await api.get('/peer-insights/feedback-form-schema');
  return data.data; // { categories, likertScale }
}

// --- Groups ---
export async function createGroup(name, description, memberIds) {
  const { data } = await api.post('/peer-insights/groups', { name, description, memberIds });
  return data.data.group;
}

export async function listGroups() {
  const { data } = await api.get('/peer-insights/groups');
  return data.data.groups;
}

export async function getGroup(groupId) {
  const { data } = await api.get(`/peer-insights/groups/${groupId}`);
  return data.data.group; // includes .members
}

export async function deleteGroup(groupId) {
  await api.delete(`/peer-insights/groups/${groupId}`);
}

export async function addMember(groupId, userId) {
  await api.post(`/peer-insights/groups/${groupId}/members`, { userId });
}

export async function removeMember(groupId, userId) {
  await api.delete(`/peer-insights/groups/${groupId}/members/${userId}`);
}

// --- Rounds (Quick Action) ---
export async function startRound(groupId, roundName) {
  const { data } = await api.post(`/peer-insights/groups/${groupId}/rounds`, { name: roundName });
  return data.data.round;
}

export async function listRoundsForGroup(groupId) {
  const { data } = await api.get(`/peer-insights/groups/${groupId}/rounds`);
  return data.data.rounds;
}

export async function closeRound(roundId) {
  const { data } = await api.patch(`/peer-insights/rounds/${roundId}/close`);
  return data.data.round;
}

export async function getCompletionSummary(roundId) {
  const { data } = await api.get(`/peer-insights/rounds/${roundId}/completion-summary`);
  return data.data.summary;
}

export async function listSubjectsInRound(roundId) {
  const { data } = await api.get(`/peer-insights/rounds/${roundId}/subjects`);
  return data.data.subjects;
}

// --- Reviewer-facing ---
export async function listAllMyPendingAssignments() {
  const { data } = await api.get('/peer-insights/my-assignments');
  return data.data.assignments;
}

export async function listMyAssignments(roundId) {
  const { data } = await api.get(`/peer-insights/rounds/${roundId}/my-assignments`);
  return data.data.assignments;
}

export async function saveDraft(feedbackId, payload) {
  const { data } = await api.patch(`/peer-insights/feedback/${feedbackId}/draft`, payload);
  return data.data.feedback;
}

export async function submitFeedback(feedbackId) {
  const { data } = await api.patch(`/peer-insights/feedback/${feedbackId}/submit`);
  return data.data.feedback;
}

// --- HR curation ---
export async function getRawFeedback(roundId, subjectId) {
  const { data } = await api.get(`/peer-insights/rounds/${roundId}/subjects/${subjectId}/raw-feedback`);
  return data.data.feedback;
}

export async function getCategoryBreakdown(roundId, subjectId) {
  const { data } = await api.get(`/peer-insights/rounds/${roundId}/subjects/${subjectId}/category-breakdown`);
  return data.data.breakdown;
}

export async function generateAiSummaryDraft(roundId, subjectId) {
  const { data } = await api.post(`/peer-insights/rounds/${roundId}/subjects/${subjectId}/ai-summary`);
  return data.data.draft;
}

export async function saveSummary(roundId, subjectId, summaryText) {
  const { data } = await api.put(`/peer-insights/rounds/${roundId}/subjects/${subjectId}/summary`, { summaryText });
  return data.data.summary;
}

export async function getSummary(roundId, subjectId) {
  const { data } = await api.get(`/peer-insights/rounds/${roundId}/subjects/${subjectId}/summary`);
  return data.data.summary;
}

export async function releaseSummary(summaryId) {
  const { data } = await api.patch(`/peer-insights/summaries/${summaryId}/release`);
  return data.data.summary;
}

export async function unreleaseSummary(summaryId) {
  const { data } = await api.patch(`/peer-insights/summaries/${summaryId}/unrelease`);
  return data.data.summary;
}

// --- Employee-facing ---
export async function listMyReleasedSummaries() {
  const { data } = await api.get('/peer-insights/my-summaries');
  return data.data.summaries;
}
