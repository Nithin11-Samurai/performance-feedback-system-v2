import { api } from './api';

export async function listSections() {
  const { data } = await api.get('/permissions/sections');
  return data.data.sections;
}

export async function listForUser(userId) {
  const { data } = await api.get(`/permissions/users/${userId}`);
  return data.data.overrides;
}

export async function setOverride(userId, sectionKey, allowed) {
  const { data } = await api.put(`/permissions/users/${userId}`, { sectionKey, allowed });
  return data.data.override;
}

export async function removeOverride(userId, sectionKey) {
  await api.delete(`/permissions/users/${userId}/${sectionKey}`);
}
