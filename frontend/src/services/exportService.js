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

export async function exportEmployeePdf(userId, employeeName) {
  await downloadBlob(`/exports/employee/${userId}/pdf`, `${employeeName}_Performance_Report.pdf`);
}

export async function exportEmployeeExcel(userId, employeeName) {
  await downloadBlob(`/exports/employee/${userId}/excel`, `${employeeName}_Performance_Report.xlsx`);
}

export async function exportDepartmentPdf(department) {
  await downloadBlob(`/exports/department/${encodeURIComponent(department)}/pdf`, `${department}_Department_Report.pdf`);
}

export async function exportDepartmentExcel(department) {
  await downloadBlob(`/exports/department/${encodeURIComponent(department)}/excel`, `${department}_Department_Report.xlsx`);
}

export async function exportCyclePdf(cycleId, cycleName) {
  await downloadBlob(`/exports/cycle/${cycleId}/pdf`, `${cycleName}_Cycle_Report.pdf`);
}

export async function exportCycleExcel(cycleId, cycleName) {
  await downloadBlob(`/exports/cycle/${cycleId}/excel`, `${cycleName}_Cycle_Report.xlsx`);
}

export async function exportNotesPdf(employeeId, employeeName) {
  await downloadBlob(`/exports/notes/${employeeId}/pdf`, `${employeeName}_Internal_Notes.pdf`);
}

export async function exportNotesExcel(employeeId, employeeName) {
  await downloadBlob(`/exports/notes/${employeeId}/excel`, `${employeeName}_Internal_Notes.xlsx`);
}
