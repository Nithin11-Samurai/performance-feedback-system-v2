import { api } from './api';

export async function listCertifications(userId) {
  const { data } = await api.get(`/certifications/${userId}`);
  return data.data.certifications;
}

/**
 * @param {string} userId
 * @param {object} fields - { name, issuingOrganization, issueDate, expiryDate, credentialId }
 * @param {File|null} file - the certificate image/PDF
 */
export async function createCertification(userId, fields, file) {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') form.append(key, value);
  });
  if (file) form.append('certificateFile', file);

  const { data } = await api.post(`/certifications/${userId}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data.certification;
}

export async function updateCertification(userId, certId, fields, file) {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') form.append(key, value);
  });
  if (file) form.append('certificateFile', file);

  const { data } = await api.patch(`/certifications/${userId}/${certId}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data.certification;
}

export async function deleteCertification(userId, certId) {
  await api.delete(`/certifications/${userId}/${certId}`);
}
