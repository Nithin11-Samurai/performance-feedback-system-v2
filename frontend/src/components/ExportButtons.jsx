import { useState } from 'react';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import * as exportService from '../services/exportService';
import { useToast } from '../context/ToastContext';

export default function ExportButtons({ userId, employeeName }) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  async function handleExport(type) {
    setBusy(true);
    try {
      if (type === 'pdf') await exportService.exportEmployeePdf(userId, employeeName);
      else await exportService.exportEmployeeExcel(userId, employeeName);
    } catch (err) {
      showToast(err.response?.data?.message || 'Export failed.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2">
      <button className="btn-secondary text-xs" disabled={busy} onClick={() => handleExport('pdf')}>
        <FileDown size={14} /> PDF
      </button>
      <button className="btn-secondary text-xs" disabled={busy} onClick={() => handleExport('excel')}>
        <FileSpreadsheet size={14} /> Excel
      </button>
    </div>
  );
}
