import { api } from './api';

export async function listSkills(userId) {
  const { data } = await api.get(`/skills/${userId}`);
  return data.data.skills;
}

export async function upsertSkill(userId, payload) {
  const { data } = await api.post(`/skills/${userId}`, payload);
  return data.data.skill;
}

// --- Skill catalog (the list people pick from; managed in Settings) ---------

export async function listCatalog(includeInactive = false) {
  const { data } = await api.get('/skill-catalog', { params: includeInactive ? { includeInactive: true } : {} });
  return data.data.skills;
}

export async function listCustomSkills() {
  const { data } = await api.get('/skill-catalog/custom');
  return data.data.skills;
}

export async function createCatalogSkill({ name, category }) {
  const { data } = await api.post('/skill-catalog', { name, category });
  return data.data.skill;
}

export async function updateCatalogSkill(id, changes) {
  const { data } = await api.patch(`/skill-catalog/${id}`, changes);
  return data.data.skill;
}

export async function deleteSkill(userId, skillId) {
  await api.delete(`/skills/${userId}/${skillId}`);
}
