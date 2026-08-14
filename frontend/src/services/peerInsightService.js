import { api } from './api';

async function downloadBlob(url, filename) {
  const response = await api.get(url, { responseType: 'blob' });
  const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export async function getRatingDistribution(groupId) {
  const { data } = await api.get('/peer-insights/rating-distribution', { params: groupId ? { groupId } : {} });
  return data.data.distribution;
}

export async function getRatingTrend(groupId) {
  const { data } = await api.get('/peer-insights/rating-trend', { params: groupId ? { groupId } : {} });
  return data.data.trend;
}

export async function getProjectsWithPendingFeedback() {
  const { data } = await api.get('/peer-insights/projects-with-pending');
  return data.data.projects;
}

export async function getFeedbackCompletionStats(groupId) {
  const { data } = await api.get('/peer-insights/feedback-completion-stats', { params: groupId ? { groupId } : {} });
  return data.data.stats;
}

export async function getTopRatedEmployees(limit = 5, groupId) {
  const { data } = await api.get('/peer-insights/top-rated-employees', { params: groupId ? { limit, groupId } : { limit } });
  return data.data.employees;
}

export async function exportRatingDistributionExcel(groupId) {
  const url = groupId
    ? `/peer-insights/rating-distribution/export/excel?groupId=${groupId}`
    : '/peer-insights/rating-distribution/export/excel';
  await downloadBlob(url, groupId ? '360-rating-distribution-project.xlsx' : '360-rating-distribution.xlsx');
}

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

export async function getMyProjectDetail(groupId) {
  const { data } = await api.get(`/peer-insights/my-groups/${groupId}`);
  return data.data.project; // includes .members with job_title/department, safe for employees
}

export async function updateGroup(groupId, { name, description }) {
  const { data } = await api.patch(`/peer-insights/groups/${groupId}`, { name, description });
  return data.data.group;
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
export async function startRound(groupId, roundName, endDate) {
  const { data } = await api.post(`/peer-insights/groups/${groupId}/rounds`, { name: roundName, endDate });
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

export async function reactivateRound(roundId) {
  const { data } = await api.patch(`/peer-insights/rounds/${roundId}/reactivate`);
  return data.data.round;
}

export async function updateRound(roundId, { name, startedAt, endDate }) {
  const { data } = await api.patch(`/peer-insights/rounds/${roundId}`, { name, startedAt, endDate });
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

export async function getRoundAssignmentDetail(roundId) {
  const { data } = await api.get(`/peer-insights/rounds/${roundId}/assignments-detail`);
  return data.data.assignments;
}

export async function remindReviewer(feedbackId) {
  const { data } = await api.patch(`/peer-insights/feedback/${feedbackId}/remind`);
  return data;
}

export async function remindAllPendingForRound(roundId) {
  const { data } = await api.patch(`/peer-insights/rounds/${roundId}/remind-all`);
  return data;
}

// --- Reviewer-facing ---
export async function listAllMyPendingAssignments() {
  const { data } = await api.get('/peer-insights/my-assignments');
  return data.data.assignments;
}

export async function getMyCompletedReviewCount() {
  const { data } = await api.get('/peer-insights/my-completed-count');
  return data.data.count;
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

export async function getMyReleasedOverallSummary() {
  const { data } = await api.get('/peer-insights/my-overall-summary');
  return data.data.summary;
}

// --- Cross-project (search an employee across every group they're in) ---
export async function searchSubjects(term) {
  const { data } = await api.get('/peer-insights/employees/search', { params: { q: term } });
  return data.data.employees;
}

export async function getCrossProjectBreakdown(subjectId) {
  const { data } = await api.get(`/peer-insights/employees/${subjectId}/cross-project`);
  return data.data; // { subject, projects, overall }
}

export async function getOverallSummary(subjectId) {
  const { data } = await api.get(`/peer-insights/employees/${subjectId}/overall-summary`);
  return data.data.summary;
}

export async function saveOverallSummary(subjectId, summaryText) {
  const { data } = await api.patch(`/peer-insights/employees/${subjectId}/overall-summary`, { summaryText });
  return data.data.summary;
}

export async function releaseOverallSummary(subjectId) {
  const { data } = await api.patch(`/peer-insights/employees/${subjectId}/overall-summary/release`);
  return data.data.summary;
}

export async function unreleaseOverallSummary(subjectId) {
  const { data } = await api.patch(`/peer-insights/employees/${subjectId}/overall-summary/unrelease`);
  return data.data.summary;
}
