import { api } from './api';

export async function listNotes(employeeId, filters = {}) {
  const { data } = await api.get(`/notes/${employeeId}`, { params: filters });
  return data.data.notes;
}

export async function createNote(employeeId, fields, file) {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') form.append(key, value);
  });
  if (file) form.append('noteFile', file);

  const { data } = await api.post(`/notes/${employeeId}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data.note;
}

export async function updateNote(noteId, fields, file) {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') form.append(key, value);
  });
  if (file) form.append('noteFile', file);

  const { data } = await api.patch(`/notes/note/${noteId}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data.note;
}

export async function deleteNote(noteId) {
  await api.delete(`/notes/note/${noteId}`);
}

export function getNoteFileDownloadUrl(noteId) {
  // Auth header can't be attached to a plain <a href>, so downloads are
  // triggered via an authenticated blob fetch — see downloadNoteFile.
  return `/notes/note/${noteId}/file`;
}

export async function downloadNoteFile(noteId, fileName) {
  const response = await api.get(`/notes/note/${noteId}/file`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName || 'note-attachment');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
