import { api } from './api';

export async function listSkills(userId) {
  const { data } = await api.get(`/skills/${userId}`);
  return data.data.skills;
}

export async function upsertSkill(userId, payload) {
  const { data } = await api.post(`/skills/${userId}`, payload);
  return data.data.skill;
}

export async function deleteSkill(userId, skillId) {
  await api.delete(`/skills/${userId}/${skillId}`);
}
