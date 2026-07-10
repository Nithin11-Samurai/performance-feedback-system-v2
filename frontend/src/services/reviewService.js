import { api } from './api';

// --- Review cycles ---
export async function listCycles(status) {
  const { data } = await api.get('/review-cycles', { params: status ? { status } : {} });
  return data.data.cycles;
}

export async function getCycle(cycleId) {
  const { data } = await api.get(`/review-cycles/${cycleId}`);
  return data.data.cycle;
}

export async function createCycle(payload) {
  const { data } = await api.post('/review-cycles', payload);
  return data.data.cycle;
}

export async function updateCycle(cycleId, payload) {
  const { data } = await api.patch(`/review-cycles/${cycleId}`, payload);
  return data.data.cycle;
}

export async function deleteCycle(cycleId) {
  await api.delete(`/review-cycles/${cycleId}`);
}

export async function assignPeerReviewer(cycleId, subjectId, reviewerId, reviewerType = 'peer') {
  const { data } = await api.post(`/review-cycles/${cycleId}/peer-assignments`, { subjectId, reviewerId, reviewerType });
  return data.data.assignment;
}

export async function listAssignmentsForCycle(cycleId) {
  const { data } = await api.get(`/review-cycles/${cycleId}/peer-assignments`);
  return data.data.assignments;
}

// Powers the Employee Detail page's Reviewers tab.
export async function listAssignmentsForSubject(cycleId, subjectId) {
  const { data } = await api.get(`/review-cycles/${cycleId}/subjects/${subjectId}/assignments`);
  return data.data.assignments;
}

export async function listMyAssignments(cycleId) {
  const { data } = await api.get(`/review-cycles/${cycleId}/my-assignments`);
  return data.data.assignments;
}

export async function removeAssignment(assignmentId) {
  await api.delete(`/review-cycles/peer-assignments/${assignmentId}`);
}

export async function getCompletionSummary(cycleId) {
  const { data } = await api.get(`/review-cycles/${cycleId}/completion-summary`);
  return data.data.summary;
}

// --- Approval Flow (Phase 3) ---
export async function listApprovalsForCycle(cycleId) {
  const { data } = await api.get(`/review-cycles/${cycleId}/approvals`);
  return data.data.approvals;
}

export async function getApproval(cycleId, subjectId) {
  const { data } = await api.get(`/review-cycles/${cycleId}/approvals/${subjectId}`);
  return data.data.approval;
}

export async function approveEmployee(cycleId, subjectId, hrComments) {
  const { data } = await api.put(`/review-cycles/${cycleId}/approvals/${subjectId}`, { hrComments });
  return data.data.approval;
}

export async function revokeApproval(cycleId, subjectId) {
  await api.delete(`/review-cycles/${cycleId}/approvals/${subjectId}`);
}

// --- Feedback ---
export async function submitSelfReview(cycleId, payload) {
  const { data } = await api.post(`/feedback/self/${cycleId}`, payload);
  return data.data.feedback;
}

export async function submitManagerReview(cycleId, subjectId, payload) {
  const { data } = await api.post(`/feedback/manager/${cycleId}/${subjectId}`, payload);
  return data.data.feedback;
}

export async function submitPeerReview(cycleId, subjectId, payload) {
  const { data } = await api.post(`/feedback/peer/${cycleId}/${subjectId}`, payload);
  return data.data.feedback;
}

// Feature 4: generic submission for hr/skip_level/project_lead/mentor
export async function submitAssignedReview(reviewerType, cycleId, subjectId, payload) {
  const { data } = await api.post(`/feedback/${reviewerType}/${cycleId}/${subjectId}`, payload);
  return data.data.feedback;
}

export async function lockFeedback(feedbackId) {
  const { data } = await api.patch(`/feedback/${feedbackId}/submit`);
  return data.data.feedback;
}

// "Send individual feedback to employee"
export async function notifyEmployeeAboutFeedback(feedbackId) {
  const { data } = await api.patch(`/feedback/${feedbackId}/notify-employee`);
  return data;
}

export async function listFeedbackForSubject(subjectId, cycleId) {
  const { data } = await api.get(`/feedback/subject/${subjectId}/${cycleId}`);
  return data.data.feedback;
}

/**
 * All submitted feedback across every cycle — powers the "Performance
 * History" tab on the employee profile page.
 */
export async function getFeedbackHistory(subjectId) {
  const { data } = await api.get(`/feedback/subject/${subjectId}/history`);
  return data.data.feedback;
}
