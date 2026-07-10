import { api } from './api';

/**
 * Performance Review AI Summary (self/manager/peer feedback -> Claude
 * synthesis for HR). Backend: aiSummaryController.js -> aiSummaryService.js
 * -> claudeService.js (the single centralized Claude integration, also
 * used by the 360 Feedback AI summary in peerInsightService.js).
 */
export async function getAiSummary(subjectId, cycleId) {
  const { data } = await api.get(`/ai/summary/${subjectId}/${cycleId}`);
  return data.data.summary;
}

export async function generateAiSummary(subjectId, cycleId) {
  const { data } = await api.post(`/ai/summary/${subjectId}/${cycleId}`);
  return data.data.summary;
}
