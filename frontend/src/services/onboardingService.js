import { api } from './api';

export async function getStatus() {
  const { data } = await api.get('/onboarding/status');
  return data.data.status;
}

export async function savePersonal(payload) {
  const { data } = await api.put('/onboarding/personal', payload);
  return data.data.status;
}

export async function setNoCertifications(none) {
  const { data } = await api.post('/onboarding/no-certifications', { none });
  return data.data.status;
}

export async function dismiss() {
  const { data } = await api.post('/onboarding/dismiss');
  return data.data.status;
}
