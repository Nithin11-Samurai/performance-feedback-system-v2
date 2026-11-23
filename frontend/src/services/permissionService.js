import { api } from './api';

export async function listSections() {
  const { data } = await api.get('/permissions/sections');
  return data.data.sections;
}

// The signed-in user's own overrides, as { [sectionKey]: allowed }.
export async function listMyOverrides() {
  const { data } = await api.get('/permissions/me');
  const map = {};
  data.data.overrides.forEach((o) => {
    map[o.section_key] = !!o.allowed;
  });
  return map;
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
