import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Award,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  History,
  User as UserIcon,
  Clock,
  CheckSquare,
  Square,
  Users2,
  NotebookPen,
  CalendarClock,
  Download,
  Upload,
  FileDown,
  FileSpreadsheet,
  UploadCloud,
  Send,
  UserPlus,
} from 'lucide-react';
import { usePageTitle } from '../context/PageTitleContext';
import { useToast } from '../context/ToastContext';
import { ROLES, roleLabel } from '../utils/roles';
import * as userService from '../services/userService';
import * as authService from '../services/authService';
import * as skillService from '../services/skillService';
import * as certificationService from '../services/certificationService';
import * as reviewService from '../services/reviewService';
import * as catalogService from '../services/catalogService';
import * as noteService from '../services/noteService';
import * as exportService from '../services/exportService';
import * as permissionService from '../services/permissionService';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Badge from '../components/Badge';
import FeedbackList from '../components/FeedbackList';
import AiSummaryPanel from '../components/AiSummaryPanel';
import ExportButtons from '../components/ExportButtons';
import AvatarUpload from '../components/AvatarUpload';
import Skeleton from '../components/Skeleton';
import EmployeeTimeline from '../components/EmployeeTimeline';
import EmployeePicker from '../components/EmployeePicker';

function BulkUploadModal({ open, onClose, onDone }) {
  const { showToast } = useToast();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  function handleClose() {
    setFile(null);
    setResult(null);
    onClose();
  }

  async function handleDownloadTemplate() {
    try {
      await userService.downloadBulkTemplate();
    } catch {
      showToast('Failed to download template.', 'error');
    }
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    try {
      const data = await userService.bulkUploadEmployees(file);
      setResult(data);
      if (data.created.length > 0) onDone();
    } catch (err) {
      showToast(err.response?.data?.message || 'Upload failed.', 'error');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Bulk upload employees" size="lg">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-md bg-primary-50/50 p-4 text-sm dark:bg-primary-900/20">
          <FileSpreadsheet size={18} className="mt-0.5 flex-shrink-0 text-primary-600" />
          <div>
            <p className="mb-1 font-medium">Step 1 — Download the template</p>
            <p className="text-ink-light/60 dark:text-ink-dark/60">
              Fill in one row per employee. Don't rename the column headers. Temporary passwords are
              generated automatically — you don't need to set them yourself.
            </p>
            <button onClick={handleDownloadTemplate} className="btn-secondary mt-2 text-xs">
              <FileDown size={13} /> Download template
            </button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Step 2 — Upload the completed file</p>
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-primary-300 px-4 py-6 text-sm text-ink-light/60 hover:bg-primary-50 dark:border-primary-800 dark:text-ink-dark/60 dark:hover:bg-primary-900/30">
            <UploadCloud size={20} />
            {file ? file.name : 'Choose the completed .xlsx file'}
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setResult(null);
              }}
            />
          </label>
        </div>

        {result && (
          <div className="max-h-72 space-y-3 overflow-y-auto">
            {result.created.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold text-success">{result.created.length} employee(s) created</p>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-ink-light/40 dark:text-ink-dark/40">
                      <th className="pb-1 pr-2">Name</th>
                      <th className="pb-1 pr-2">Email</th>
                      <th className="pb-1">Temp password</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.created.map((c) => (
                      <tr key={c.row} className="border-t border-primary-50 dark:border-primary-900/50">
                        <td className="py-1 pr-2">{c.name}</td>
                        <td className="py-1 pr-2">{c.email}</td>
                        <td className="py-1 font-mono">{c.tempPassword}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-ink-light/40 dark:text-ink-dark/40">
                  Save these temporary passwords now — share them securely with each employee. They can
                  change their password after logging in, or use "Forgot Password."
                </p>
              </div>
            )}
            {result.errors.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold text-danger">{result.errors.length} row(s) had errors</p>
                <ul className="space-y-1 text-xs text-danger">
                  {result.errors.map((e) => (
                    <li key={e.row}>
                      Row {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={handleClose}>
            {result ? 'Done' : 'Cancel'}
          </button>
          {!result && (
            <button type="button" className="btn-primary" onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

const emptyNewUser = {
  employeeCode: '',
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: ROLES.EMPLOYEE,
  jobTitle: '',
  department: '',
  dateOfJoining: '',
};

const PAGE_SIZE = 10;
const TABS = [
  { key: 'overview', label: 'Overview', icon: UserIcon },
  { key: 'skills', label: 'Skills', icon: Sparkles },
  { key: 'certifications', label: 'Certifications', icon: Award },
  { key: 'history', label: 'Performance History', icon: History },
  { key: 'timeline', label: 'Timeline', icon: Clock },
  { key: 'notes', label: 'Internal Notes', icon: NotebookPen },
  { key: 'reviewers', label: 'Reviewers', icon: Users2 },
  { key: 'permissions', label: 'Permissions', icon: ShieldCheck },
];

const REVIEWER_TYPE_OPTIONS = [
  { value: 'team_lead', label: 'Team Lead' },
  { value: 'md', label: 'MD (Managing Director)' },
  { value: 'skip_level', label: 'Skip-Level Manager' },
  { value: 'hr', label: 'HR' },
  { value: 'project_lead', label: 'Project Lead' },
  { value: 'mentor', label: 'Mentor' },
];

function reviewerTypeLabel(type) {
  return REVIEWER_TYPE_OPTIONS.find((t) => t.value === type)?.label || type.replace(/_/g, ' ');
}

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString() : 'N/A';
}

// --- Tab: Overview (profile edit form + activate/deactivate) -------------

function OverviewTab({ employee, managers, onUpdated }) {
  const { showToast } = useToast();
  const [editForm, setEditForm] = useState({
    employeeCode: employee.employee_code || '',
    firstName: employee.first_name || '',
    lastName: employee.last_name || '',
    email: employee.email || '',
    jobTitle: employee.job_title || '',
    department: employee.department || '',
    role: employee.role,
    managerId: employee.manager_id || '',
    dateOfJoining: employee.date_of_joining ? employee.date_of_joining.slice(0, 10) : '',
  });
  const [confirmToggle, setConfirmToggle] = useState(false);

  useEffect(() => {
    setEditForm({
      employeeCode: employee.employee_code || '',
      firstName: employee.first_name || '',
      lastName: employee.last_name || '',
      email: employee.email || '',
      jobTitle: employee.job_title || '',
      department: employee.department || '',
      role: employee.role,
      managerId: employee.manager_id || '',
      dateOfJoining: employee.date_of_joining ? employee.date_of_joining.slice(0, 10) : '',
    });
  }, [employee]);

  async function handleSaveProfile(e) {
    e.preventDefault();
    try {
      const updated = await userService.updateUser(employee.id, {
        employeeCode: editForm.employeeCode,
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        jobTitle: editForm.jobTitle,
        department: editForm.department,
        role: editForm.role,
        managerId: editForm.managerId || null,
        dateOfJoining: editForm.dateOfJoining || null,
      });
      showToast('Employee profile updated');
      onUpdated(updated);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update profile.', 'error');
    }
  }

  async function handleToggleActive() {
    try {
      const updated = employee.is_active
        ? await userService.deactivateUser(employee.id)
        : await userService.reactivateUser(employee.id);
      showToast(employee.is_active ? 'Employee deactivated' : 'Employee reactivated');
      onUpdated(updated);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update status.', 'error');
    }
  }

  return (
    <div className="space-y-4">
      <div className="card card-reviews">
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div className="flex justify-between border-b border-primary-50 pb-2 dark:border-primary-900/50">
            <dt className="text-ink-light/50 dark:text-ink-dark/50">Date of joining</dt>
            <dd>{formatDate(employee.date_of_joining)}</dd>
          </div>
          <div className="flex justify-between border-b border-primary-50 pb-2 dark:border-primary-900/50">
            <dt className="text-ink-light/50 dark:text-ink-dark/50">Employee code</dt>
            <dd className="data-mono">{employee.employee_code}</dd>
          </div>
        </dl>
      </div>

      <div className="card card-reviews">
        <h4 className="mb-3 font-display text-sm font-semibold">Edit profile</h4>
        <form onSubmit={handleSaveProfile} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Employee ID</label>
            <input
              className="input"
              value={editForm.employeeCode}
              onChange={(e) => setEditForm((f) => ({ ...f, employeeCode: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Date of joining</label>
            <input
              type="date"
              className="input"
              value={editForm.dateOfJoining}
              onChange={(e) => setEditForm((f) => ({ ...f, dateOfJoining: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">First name</label>
            <input
              className="input"
              value={editForm.firstName}
              onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Last name</label>
            <input
              className="input"
              value={editForm.lastName}
              onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={editForm.email}
              onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Job title / Designation</label>
            <input
              className="input"
              list="title-catalog-list"
              value={editForm.jobTitle}
              onChange={(e) => setEditForm((f) => ({ ...f, jobTitle: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Department</label>
            <input
              className="input"
              list="dept-catalog-list"
              value={editForm.department}
              onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}>
              {Object.values(ROLES).map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Manager</label>
            <select
              className="input"
              value={editForm.managerId}
              onChange={(e) => setEditForm((f) => ({ ...f, managerId: e.target.value }))}
            >
              <option value="">None</option>
              {managers
                .filter((m) => m.id !== employee.id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.first_name} {m.last_name}
                  </option>
                ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">
              Save changes
            </button>
          </div>
        </form>
      </div>

      <div className="card card-reviews flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Account status</p>
          <p className="text-xs text-ink-light/50 dark:text-ink-dark/50">
            {employee.is_active ? 'This employee can currently log in.' : 'This employee cannot log in.'}
          </p>
        </div>
        <button
          onClick={() => setConfirmToggle(true)}
          className={employee.is_active ? 'btn-danger text-xs' : 'btn-secondary text-xs'}
        >
          {employee.is_active ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
          {employee.is_active ? 'Deactivate' : 'Reactivate'}
        </button>
      </div>

      <ConfirmDialog
        open={confirmToggle}
        onClose={() => setConfirmToggle(false)}
        onConfirm={handleToggleActive}
        title={employee.is_active ? 'Deactivate employee' : 'Reactivate employee'}
        message={
          employee.is_active
            ? `Deactivate ${employee.first_name} ${employee.last_name}? They will no longer be able to log in.`
            : `Reactivate ${employee.first_name} ${employee.last_name}?`
        }
        confirmLabel={employee.is_active ? 'Deactivate' : 'Reactivate'}
        danger={employee.is_active}
      />
    </div>
  );
}

// --- Tab: Skills -----------------------------------------------------------

function SkillsTab({ employeeId }) {
  const [skills, setSkills] = useState(null);

  useEffect(() => {
    skillService.listSkills(employeeId).then(setSkills);
  }, [employeeId]);

  if (skills === null) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="card card-skills">
      {skills.length ? (
        <ul className="space-y-2">
          {skills.map((s) => (
            <li key={s.id} className="flex items-center justify-between border-b border-primary-50 pb-2 text-sm last:border-0 dark:border-primary-900/50">
              <span>
                {s.skill_name} <span className="text-xs text-ink-light/40">({s.category})</span>
              </span>
              <Badge tone="primary">{s.proficiency}</Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-light/50 dark:text-ink-dark/50">No skills recorded.</p>
      )}
    </div>
  );
}

// --- Tab: Certifications ----------------------------------------------------

function CertificationsTab({ employeeId }) {
  const [certs, setCerts] = useState(null);

  useEffect(() => {
    certificationService.listCertifications(employeeId).then(setCerts);
  }, [employeeId]);

  if (certs === null) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="card card-certs">
      {certs.length ? (
        <ul className="space-y-3">
          {certs.map((c) => (
            <li key={c.id} className="border-b border-primary-50 pb-3 text-sm last:border-0 dark:border-primary-900/50">
              <p className="font-medium">{c.name}</p>
              <p className="text-xs text-ink-light/50 dark:text-ink-dark/50">
                {c.issuing_organization || 'N/A'} · Issued {formatDate(c.issue_date)}
                {c.expiry_date ? ` · Expires ${formatDate(c.expiry_date)}` : ''}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-light/50 dark:text-ink-dark/50">No certifications recorded.</p>
      )}
    </div>
  );
}

// --- Tab: Performance History (all cycles, not just one) -------------------

function PerformanceHistoryTab({ employeeId }) {
  const [history, setHistory] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [cycleId, setCycleId] = useState(null);

  useEffect(() => {
    reviewService.getFeedbackHistory(employeeId).then(setHistory);
    reviewService.listCycles().then((cyc) => {
      setCycles(cyc);
      const active = cyc.find((x) => x.status === 'active');
      setCycleId((active || cyc[0])?.id || null);
    });
  }, [employeeId]);

  return (
    <div className="space-y-4">
      <div className="card card-reviews">
        <h4 className="mb-3 font-display text-sm font-semibold">Full history (all cycles)</h4>
        {history === null ? <Skeleton className="h-24 w-full" /> : <FeedbackList feedback={history} />}
      </div>

      {cycleId && (
        <div className="card card-reviews">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-display text-sm font-semibold">AI summary for a specific cycle</h4>
            <select className="input w-48" value={cycleId} onChange={(e) => setCycleId(e.target.value)}>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <AiSummaryPanel subjectId={employeeId} cycleId={cycleId} canGenerate />
        </div>
      )}
    </div>
  );
}

const emptyNoteForm = { meetingDate: '', title: '', discussion: '', actionItems: '', followUpDate: '' };

function InternalNotesTab({ employee }) {
  const { showToast } = useToast();
  const [notes, setNotes] = useState(null);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [form, setForm] = useState(emptyNoteForm);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [exporting, setExporting] = useState(false);

  async function load() {
    const data = await noteService.listNotes(employee.id, {
      search: search || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
    setNotes(data);
  }

  useEffect(() => {
    const handle = setTimeout(load, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id, search, startDate, endDate]);

  function openAddModal() {
    setEditingNote(null);
    setForm({ ...emptyNoteForm, meetingDate: new Date().toISOString().slice(0, 10) });
    setFile(null);
    setModalOpen(true);
  }

  function openEditModal(note) {
    setEditingNote(note);
    setForm({
      meetingDate: note.meeting_date ? note.meeting_date.slice(0, 10) : '',
      title: note.title || '',
      discussion: note.discussion || note.note_text || '',
      actionItems: note.action_items || '',
      followUpDate: note.follow_up_date ? note.follow_up_date.slice(0, 10) : '',
    });
    setFile(null);
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingNote) {
        await noteService.updateNote(editingNote.id, form, file);
        showToast('Note updated');
      } else {
        await noteService.createNote(employee.id, form, file);
        showToast('Meeting logged');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save note.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(note) {
    try {
      await noteService.deleteNote(note.id);
      showToast('Note removed');
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to remove note.', 'error');
    }
  }

  async function handleDownloadAttachment(note) {
    try {
      await noteService.downloadNoteFile(note.id, note.file_original_name);
    } catch {
      showToast('Failed to download attachment.', 'error');
    }
  }

  async function handleExport(type) {
    setExporting(true);
    const name = `${employee.first_name}_${employee.last_name}`;
    try {
      if (type === 'pdf') await exportService.exportNotesPdf(employee.id, name);
      else await exportService.exportNotesExcel(employee.id, name);
    } catch (err) {
      showToast(err.response?.data?.message || 'Export failed.', 'error');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button className="btn-secondary text-xs" disabled={exporting} onClick={() => handleExport('pdf')}>
            <FileDown size={14} /> PDF
          </button>
          <button className="btn-secondary text-xs" disabled={exporting} onClick={() => handleExport('excel')}>
            <FileSpreadsheet size={14} /> Excel
          </button>
        </div>
        <button className="btn-primary" onClick={openAddModal}>
          <Plus size={16} /> Log meeting
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="relative sm:col-span-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-light/40" />
          <input className="input pl-9" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>

      {notes === null ? (
        <Skeleton className="h-32 w-full" />
      ) : notes.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-light/50 dark:text-ink-dark/50">No meetings logged yet.</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="card card-notes">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">
                    {formatDate(note.meeting_date)} {note.title && `— ${note.title}`}
                  </p>
                  <p className="text-xs text-ink-light/50 dark:text-ink-dark/50">
                    Logged by {note.uploaded_by_first_name} {note.uploaded_by_last_name}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEditModal(note)} className="rounded-md p-1.5 text-ink-light/40 hover:bg-primary-50 dark:text-ink-dark/40">
                    Edit
                  </button>
                  <button
                    onClick={() => setConfirmDelete(note)}
                    className="rounded-md p-1.5 text-ink-light/40 hover:bg-danger/10 hover:text-danger dark:text-ink-dark/40"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              {(note.discussion || note.note_text) && <p className="mt-2 text-sm">{note.discussion || note.note_text}</p>}
              {note.action_items && (
                <div className="mt-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-light/40 dark:text-ink-dark/40">Action Items</p>
                  <p className="text-sm">{note.action_items}</p>
                </div>
              )}
              {note.follow_up_date && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-accent-700 dark:text-accent-300">
                  <CalendarClock size={13} /> Follow-up: {formatDate(note.follow_up_date)}
                </p>
              )}
              {note.file_original_name && (
                <button onClick={() => handleDownloadAttachment(note)} className="mt-3 flex items-center gap-1.5 text-sm text-primary-600 hover:underline dark:text-primary-300">
                  <Download size={14} /> {note.file_original_name}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingNote ? 'Edit meeting' : 'Log a meeting'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Meeting date</label>
              <input type="date" required className="input" value={form.meetingDate} onChange={(e) => setForm((f) => ({ ...f, meetingDate: e.target.value }))} />
            </div>
            <div>
              <label className="label">Follow-up date (optional)</label>
              <input type="date" className="input" value={form.followUpDate} onChange={(e) => setForm((f) => ({ ...f, followUpDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Meeting title</label>
            <input className="input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="label">Discussion</label>
            <textarea className="input" rows={4} value={form.discussion} onChange={(e) => setForm((f) => ({ ...f, discussion: e.target.value }))} />
          </div>
          <div>
            <label className="label">Action items</label>
            <textarea className="input" rows={3} value={form.actionItems} onChange={(e) => setForm((f) => ({ ...f, actionItems: e.target.value }))} />
          </div>
          <div>
            <label className="label">Attachment (optional)</label>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-primary-300 px-3 py-3 text-sm text-ink-light/60 hover:bg-primary-50 dark:border-primary-800 dark:text-ink-dark/60 dark:hover:bg-primary-900/30">
              <Upload size={16} />
              {file ? file.name : 'Attach a file'}
              <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf,.doc,.docx,.txt" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        title="Remove meeting"
        message="Remove this internal note? This cannot be undone."
        confirmLabel="Remove"
      />
    </div>
  );
}

function PermissionsTab({ employee }) {
  const { showToast } = useToast();
  const [sections, setSections] = useState(null);
  const [overrides, setOverrides] = useState(null);
  const [saving, setSaving] = useState(null);

  async function load() {
    const [sectionList, overrideList] = await Promise.all([
      permissionService.listSections(),
      permissionService.listForUser(employee.id),
    ]);
    setSections(sectionList);
    setOverrides(overrideList);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id]);

  function overrideFor(sectionKey) {
    return overrides?.find((o) => o.section_key === sectionKey) || null;
  }

  async function handleToggle(sectionKey, allowed) {
    setSaving(sectionKey);
    try {
      await permissionService.setOverride(employee.id, sectionKey, allowed);
      showToast('Permission updated');
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update permission.', 'error');
    } finally {
      setSaving(null);
    }
  }

  async function handleClear(sectionKey) {
    setSaving(sectionKey);
    try {
      await permissionService.removeOverride(employee.id, sectionKey);
      showToast('Reverted to role default');
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to clear override.', 'error');
    } finally {
      setSaving(null);
    }
  }

  const isAdminTierEmployee = [ROLES.ADMIN, ROLES.GLOBAL_ADMIN, ROLES.SYSTEM_ADMIN, ROLES.HR_MANAGER].includes(employee.role);

  return (
    <div className="card card-reviews">
      <h4 className="mb-1 font-display text-sm font-semibold">Section access overrides</h4>
      <p className="mb-4 text-xs text-ink-light/50 dark:text-ink-dark/50">
        {isAdminTierEmployee
          ? `${employee.first_name} already has full access as ${roleLabel(employee.role)} — overrides below would only matter if their role changes later.`
          : `Grant ${employee.first_name} access to specific sections beyond what their role (${roleLabel(employee.role)}) normally allows.`}
      </p>

      {sections === null || overrides === null ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <ul className="divide-y divide-primary-50 dark:divide-primary-900/50">
          {sections.map((s) => {
            const override = overrideFor(s.key);
            const isBusy = saving === s.key;
            return (
              <li key={s.key} className="flex items-center justify-between py-3">
                <span className="text-sm">{s.label}</span>
                <div className="flex items-center gap-2">
                  {override ? (
                    <>
                      <Badge tone={override.allowed ? 'success' : 'danger'}>{override.allowed ? 'Granted' : 'Blocked'}</Badge>
                      <button disabled={isBusy} onClick={() => handleClear(s.key)} className="text-xs text-ink-light/40 hover:underline dark:text-ink-dark/40">
                        Reset to default
                      </button>
                    </>
                  ) : (
                    <button
                      disabled={isBusy || isAdminTierEmployee}
                      onClick={() => handleToggle(s.key, true)}
                      className="btn-secondary text-xs disabled:opacity-40"
                    >
                      Grant access
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ReviewersTab({ employee }) {
  const { showToast } = useToast();
  const [cycles, setCycles] = useState([]);
  const [cycleId, setCycleId] = useState('');
  const [assignments, setAssignments] = useState(null);
  const [feedbackList, setFeedbackList] = useState(null);
  const [approval, setApproval] = useState(null);
  const [hrComments, setHrComments] = useState('');

  const [reviewerType, setReviewerType] = useState('team_lead');
  const [pickedReviewer, setPickedReviewer] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [notifyingId, setNotifyingId] = useState(null);

  useEffect(() => {
    reviewService.listCycles().then((list) => {
      setCycles(list);
      const active = list.find((c) => c.status === 'active');
      setCycleId((active || list[0])?.id || '');
    });
  }, []);

  async function load() {
    if (!cycleId) return;
    const [assignmentList, feedback, existingApproval] = await Promise.all([
      reviewService.listAssignmentsForSubject(cycleId, employee.id),
      reviewService.listFeedbackForSubject(employee.id, cycleId),
      reviewService.getApproval(cycleId, employee.id).catch(() => null),
    ]);
    setAssignments(assignmentList);
    setFeedbackList(feedback);
    setApproval(existingApproval);
    setHrComments(existingApproval?.hr_comments || '');
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleId, employee.id]);

  async function handleAssign() {
    if (!pickedReviewer || !cycleId) return;
    setAssigning(true);
    try {
      await reviewService.assignPeerReviewer(cycleId, employee.id, pickedReviewer.id, reviewerType);
      showToast(`${reviewerTypeLabel(reviewerType)} assigned`);
      setPickedReviewer(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to assign reviewer.', 'error');
    } finally {
      setAssigning(false);
    }
  }

  async function handleRemoveAssignment(id) {
    try {
      await reviewService.removeAssignment(id);
      showToast('Assignment removed');
      setAssignments((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to remove assignment.', 'error');
    }
  }

  async function handleNotifyIndividual(feedbackId) {
    setNotifyingId(feedbackId);
    try {
      await reviewService.notifyEmployeeAboutFeedback(feedbackId);
      showToast(`${employee.first_name} has been notified about this feedback`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to notify employee.', 'error');
    } finally {
      setNotifyingId(null);
    }
  }

  async function handleReleaseCollective() {
    setReleasing(true);
    try {
      const saved = await reviewService.approveEmployee(cycleId, employee.id, hrComments);
      setApproval(saved);
      showToast(`Collective feedback sent to ${employee.first_name}`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send collective feedback.', 'error');
    } finally {
      setReleasing(false);
    }
  }

  async function handleRevokeCollective() {
    setRevoking(true);
    try {
      await reviewService.revokeApproval(cycleId, employee.id);
      setApproval(null);
      showToast('Revoked — no longer visible to the employee');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to revoke.', 'error');
    } finally {
      setRevoking(false);
    }
  }

  const selectedCycle = cycles.find((c) => c.id === cycleId);

  return (
    <div className="space-y-4">
      <div className="card card-reviews">
        <label className="label">Review cycle</label>
        <select className="input max-w-sm" value={cycleId} onChange={(e) => setCycleId(e.target.value)}>
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.status})
            </option>
          ))}
        </select>
        {employee.manager_id && (
          <p className="mt-3 text-xs text-ink-light/50 dark:text-ink-dark/50">
            Manager review is automatic based on the reporting hierarchy — change it via the Overview tab's
            manager field if needed. The assignments below are additional named reviewers for this cycle only.
          </p>
        )}
      </div>

      {!cycleId ? (
        <p className="py-8 text-center text-sm text-ink-light/50 dark:text-ink-dark/50">
          No review cycles exist yet — create one under Review Cycles first.
        </p>
      ) : (
        <>
          <div className="card card-reviews">
            <h4 className="mb-3 font-display text-sm font-semibold">Assign a reviewer</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_200px_auto]">
              <div>
                <label className="label">Reviewer</label>
                <EmployeePicker onSelect={setPickedReviewer} placeholder="Search employee…" excludeIds={[employee.id]} />
                {pickedReviewer && (
                  <p className="mt-1 text-xs text-primary-700 dark:text-primary-300">
                    {pickedReviewer.first_name} {pickedReviewer.last_name}
                  </p>
                )}
              </div>
              <div>
                <label className="label">Reviewer type</label>
                <select className="input" value={reviewerType} onChange={(e) => setReviewerType(e.target.value)}>
                  {REVIEWER_TYPE_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn-primary self-end" onClick={handleAssign} disabled={!pickedReviewer || assigning}>
                <UserPlus size={15} /> {assigning ? 'Assigning…' : 'Assign'}
              </button>
            </div>

            {assignments === null ? (
              <Skeleton className="mt-4 h-10 w-full" />
            ) : assignments.length === 0 ? (
              <p className="mt-4 text-sm text-ink-light/50 dark:text-ink-dark/50">
                No additional reviewers assigned for this cycle yet.
              </p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                {assignments.map((a) => (
                  <span key={a.id} className="flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs dark:bg-primary-900/40">
                    {a.reviewer_first_name} {a.reviewer_last_name}
                    <span className="text-ink-light/40 dark:text-ink-dark/40">({reviewerTypeLabel(a.reviewer_type)})</span>
                    <button onClick={() => handleRemoveAssignment(a.id)} className="text-ink-light/40 hover:text-danger">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="card card-reviews">
            <h4 className="mb-3 font-display text-sm font-semibold">
              Feedback in {selectedCycle?.name || 'this cycle'} — send individually
            </h4>
            {feedbackList === null ? (
              <Skeleton className="h-24 w-full" />
            ) : feedbackList.length === 0 ? (
              <p className="text-sm text-ink-light/50 dark:text-ink-dark/50">No feedback recorded yet for this cycle.</p>
            ) : (
              <ul className="space-y-2">
                {feedbackList.map((f) => (
                  <li key={f.id} className="flex items-center justify-between rounded-md bg-primary-50/40 px-3 py-2 text-sm dark:bg-primary-900/20">
                    <span>
                      <span className="font-medium capitalize">{reviewerTypeLabel(f.type)}</span>{' '}
                      <Badge tone={f.status === 'submitted' ? 'success' : 'neutral'}>{f.status}</Badge>
                      {f.rating && <span className="ml-2 text-xs text-ink-light/50 dark:text-ink-dark/50">{f.rating}/5</span>}
                    </span>
                    <button
                      disabled={f.status !== 'submitted' || notifyingId === f.id}
                      onClick={() => handleNotifyIndividual(f.id)}
                      className="btn-secondary text-xs disabled:opacity-30"
                      title={f.status !== 'submitted' ? 'Only submitted feedback can be sent' : 'Notify employee about this feedback'}
                    >
                      <Send size={13} /> Send
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card card-reviews">
            <h4 className="mb-1 font-display text-sm font-semibold">Send collective feedback</h4>
            <p className="mb-3 text-xs text-ink-light/50 dark:text-ink-dark/50">
              Write a consolidated summary and send it to {employee.first_name} — this notifies them and
              (if configured) emails them too. Editing this and sending again re-notifies them with the
              fresh version.
            </p>
            {approval?.approved_at && (
              <div className="mb-2 flex items-center justify-between text-xs">
                <p className="text-success">
                  Last sent {new Date(approval.approved_at).toLocaleDateString()} by {approval.approved_by_first_name}{' '}
                  {approval.approved_by_last_name}
                </p>
                <button onClick={handleRevokeCollective} disabled={revoking} className="text-ink-light/40 hover:text-danger dark:text-ink-dark/40">
                  {revoking ? 'Revoking…' : 'Revoke'}
                </button>
              </div>
            )}
            <textarea
              className="input"
              rows={4}
              placeholder="e.g. Great quarter overall — strong collaboration, keep building on your Conga CPQ skills…"
              value={hrComments}
              onChange={(e) => setHrComments(e.target.value)}
            />
            <div className="mt-3 flex justify-end">
              <button className="btn-primary" onClick={handleReleaseCollective} disabled={releasing}>
                <Send size={14} /> {releasing ? 'Sending…' : approval ? 'Resend with updates' : 'Send collective feedback'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// --- Modern tabbed employee profile ----------------------------------------

function EmployeeDetail({ employee, managers, onUpdated }) {
  const [tab, setTab] = useState('overview');

  return (
    <div className="space-y-4">
      <div className="card card-reviews flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <AvatarUpload
            userId={employee.id}
            firstName={employee.first_name}
            lastName={employee.last_name}
            avatarUrl={employee.avatar_url}
            onUploaded={onUpdated}
            size={64}
          />
          <div>
            <h3 className="font-display text-lg font-semibold">
              {employee.first_name} {employee.last_name}
            </h3>
            <p className="text-sm text-ink-light/60 dark:text-ink-dark/60">
              {employee.job_title || 'N/A'} · {employee.department || 'N/A'}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <Badge tone={employee.is_active ? 'success' : 'danger'}>{employee.is_active ? 'Active' : 'Deactivated'}</Badge>
              <Badge tone="primary">{roleLabel(employee.role)}</Badge>
            </div>
          </div>
        </div>
        <ExportButtons userId={employee.id} employeeName={`${employee.first_name}_${employee.last_name}`} />
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-full bg-primary-50/60 p-1 dark:bg-primary-900/30">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === key ? 'bg-primary-600 text-white' : 'text-ink-light/70 hover:bg-white/60 dark:text-ink-dark/70'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab employee={employee} managers={managers} onUpdated={onUpdated} />}
      {tab === 'skills' && <SkillsTab employeeId={employee.id} />}
      {tab === 'certifications' && <CertificationsTab employeeId={employee.id} />}
      {tab === 'history' && <PerformanceHistoryTab employeeId={employee.id} />}
      {tab === 'timeline' && (
        <div className="card card-reviews">
          <EmployeeTimeline employeeId={employee.id} />
        </div>
      )}
      {tab === 'notes' && <InternalNotesTab employee={employee} />}
      {tab === 'reviewers' && <ReviewersTab employee={employee} />}
      {tab === 'permissions' && <PermissionsTab employee={employee} />}
    </div>
  );
}

// --- Main page: directory with search, filters, pagination -----------------

export default function AdminEmployees() {
  usePageTitle('Employees');
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [newUser, setNewUser] = useState(emptyNewUser);
  const [creating, setCreating] = useState(false);
  const [checkedIds, setCheckedIds] = useState([]);
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkManagerId, setBulkManagerId] = useState('');
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [departmentCatalog, setDepartmentCatalog] = useState([]);
  const [jobTitleCatalog, setJobTitleCatalog] = useState([]);

  useEffect(() => {
    catalogService.listDepartments().then((list) => setDepartmentCatalog(list.map((d) => d.name)));
    catalogService.listJobTitles().then((list) => setJobTitleCatalog(list.map((j) => j.title)));
  }, []);

  // Bug fix: opening an employee from the global search bar previously
  // navigated here but never actually opened their detail view. Fetch and
  // select that employee directly (they may not be on the current page of
  // the paginated directory list), then clear the nav state so refreshing
  // this page afterward doesn't keep re-triggering it.
  useEffect(() => {
    const openId = location.state?.openEmployeeId;
    if (!openId) return;
    userService
      .getUser(openId)
      .then(setSelected)
      .catch(() => showToast('Could not open that employee.', 'error'));
    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { users, total: totalCount } = await userService.listUsersPaged({
        search: search || undefined,
        role: roleFilter || undefined,
        department: departmentFilter || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setEmployees(users);
      setTotal(totalCount);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load employees.');
    } finally {
      setLoading(false);
    }
  }

  // Reset to page 0 whenever filters change (avoids landing on an empty page).
  useEffect(() => {
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleFilter, departmentFilter]);

  useEffect(() => {
    const handle = setTimeout(load, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleFilter, departmentFilter, page]);

  useEffect(() => {
    userService.listDepartments().then(setDepartments);
    userService.listUsers({ role: ROLES.MANAGER, limit: 100 }).then(setManagers);
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    try {
      await authService.registerUser(newUser);
      showToast('Employee account created');
      setCreateOpen(false);
      setNewUser(emptyNewUser);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create employee.', 'error');
    } finally {
      setCreating(false);
    }
  }

  function handleUpdated(updated) {
    setSelected(updated);
    setEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }

  function toggleChecked(id) {
    setCheckedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleBulkAssign() {
    setBulkAssigning(true);
    try {
      await userService.bulkAssignManager(checkedIds, bulkManagerId || null);
      showToast(`${checkedIds.length} employee(s) reassigned`);
      setBulkAssignOpen(false);
      setCheckedIds([]);
      setBulkManagerId('');
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Bulk assignment failed.', 'error');
    } finally {
      setBulkAssigning(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
      {/* Populated from the managed catalog (Settings page) — referenced by
          `list=` on the department/job-title inputs below and in OverviewTab,
          regardless of component nesting (datalist lookup is DOM-global). */}
      <datalist id="dept-catalog-list">
        {departmentCatalog.map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>
      <datalist id="title-catalog-list">
        {jobTitleCatalog.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>

      <div className="card card-reviews h-fit">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-display text-base font-semibold">Directory</h3>
          <div className="flex gap-1.5">
            <button className="btn-secondary text-xs" onClick={() => setBulkUploadOpen(true)}>
              <UploadCloud size={14} /> Bulk upload
            </button>
            <button className="btn-primary text-xs" onClick={() => setCreateOpen(true)}>
              <Plus size={14} /> New
            </button>
          </div>
        </div>

        <div className="relative mb-3">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-light/40" />
          <input
            className="input pl-9"
            placeholder="Search employees…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Advanced filters */}
        <div className="mb-3 grid grid-cols-2 gap-2">
          <select className="input text-xs" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All roles</option>
            {Object.values(ROLES).map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
          <select className="input text-xs" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mb-2 flex items-center gap-2 rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {checkedIds.length > 0 && (
          <div className="mb-2 flex items-center justify-between rounded-md bg-primary-50 px-3 py-2 text-xs dark:bg-primary-900/40">
            <span>{checkedIds.length} selected</span>
            <div className="flex gap-2">
              <button className="text-primary-700 hover:underline dark:text-primary-200" onClick={() => setBulkAssignOpen(true)}>
                Bulk assign manager
              </button>
              <button className="text-ink-light/50 hover:underline dark:text-ink-dark/50" onClick={() => setCheckedIds([])}>
                Clear
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <>
            <ul className="max-h-[55vh] space-y-1 overflow-y-auto">
              {employees.map((emp) => (
                <li key={emp.id} className="flex items-center gap-1">
                  <button
                    onClick={() => toggleChecked(emp.id)}
                    aria-label={checkedIds.includes(emp.id) ? 'Deselect' : 'Select'}
                    className="flex-shrink-0 p-1 text-ink-light/30 hover:text-primary-600 dark:text-ink-dark/30"
                  >
                    {checkedIds.includes(emp.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                  <button
                    onClick={() => setSelected(emp)}
                    className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm ${
                      selected?.id === emp.id ? 'bg-primary-700 text-white' : 'hover:bg-primary-50 dark:hover:bg-primary-900/40'
                    }`}
                  >
                    <AvatarUpload
                      userId={emp.id}
                      firstName={emp.first_name}
                      lastName={emp.last_name}
                      avatarUrl={emp.avatar_url}
                      size={32}
                      onUploaded={(updated) => {
                        setEmployees((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
                        if (selected?.id === updated.id) setSelected(updated);
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="truncate font-medium">
                          {emp.first_name} {emp.last_name}
                        </p>
                        {!emp.is_active && <span className="flex-shrink-0 text-xs text-danger">Inactive</span>}
                      </div>
                      <p className={`truncate text-xs ${selected?.id === emp.id ? 'text-primary-100' : 'text-ink-light/50 dark:text-ink-dark/50'}`}>
                        {emp.job_title || roleLabel(emp.role)}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
              {employees.length === 0 && (
                <p className="py-8 text-center text-sm text-ink-light/50 dark:text-ink-dark/50">No employees match these filters.</p>
              )}
            </ul>

            {/* Pagination controls */}
            <div className="mt-3 flex items-center justify-between border-t border-primary-50 pt-3 text-xs dark:border-primary-900/50">
              <span className="text-ink-light/50 dark:text-ink-dark/50">
                {total === 0 ? '0 results' : `${page * PAGE_SIZE + 1}-${Math.min((page + 1) * PAGE_SIZE, total)} of ${total}`}
              </span>
              <div className="flex gap-1">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="rounded-md p-1.5 hover:bg-primary-50 disabled:opacity-30 dark:hover:bg-primary-900/40"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  className="rounded-md p-1.5 hover:bg-primary-50 disabled:opacity-30 dark:hover:bg-primary-900/40"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {selected ? (
        <EmployeeDetail employee={selected} managers={managers} onUpdated={handleUpdated} />
      ) : (
        <div className="card card-reviews flex items-center justify-center py-16 text-sm text-ink-light/50 dark:text-ink-dark/50">
          Select an employee to view their full profile.
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add new employee">
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Employee code</label>
            <input
              required
              className="input"
              value={newUser.employeeCode}
              onChange={(e) => setNewUser((f) => ({ ...f, employeeCode: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={newUser.role} onChange={(e) => setNewUser((f) => ({ ...f, role: e.target.value }))}>
              {Object.values(ROLES).map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">First name</label>
            <input
              required
              className="input"
              value={newUser.firstName}
              onChange={(e) => setNewUser((f) => ({ ...f, firstName: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Last name</label>
            <input
              required
              className="input"
              value={newUser.lastName}
              onChange={(e) => setNewUser((f) => ({ ...f, lastName: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Email</label>
            <input
              type="email"
              required
              className="input"
              value={newUser.email}
              onChange={(e) => setNewUser((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Temporary password</label>
            <input
              type="password"
              required
              minLength={8}
              className="input"
              value={newUser.password}
              onChange={(e) => setNewUser((f) => ({ ...f, password: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Job title / Designation</label>
            <input
              className="input"
              list="title-catalog-list"
              value={newUser.jobTitle}
              onChange={(e) => setNewUser((f) => ({ ...f, jobTitle: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Department</label>
            <input
              className="input"
              list="dept-catalog-list"
              value={newUser.department}
              onChange={(e) => setNewUser((f) => ({ ...f, department: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Date of joining</label>
            <input
              type="date"
              className="input"
              value={newUser.dateOfJoining}
              onChange={(e) => setNewUser((f) => ({ ...f, dateOfJoining: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
            <button type="button" className="btn-secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </button>
            <button type="submit" disabled={creating} className="btn-primary">
              {creating ? 'Creating…' : 'Create employee'}
            </button>
          </div>
        </form>
      </Modal>

      <BulkUploadModal open={bulkUploadOpen} onClose={() => setBulkUploadOpen(false)} onDone={load} />

      <Modal open={bulkAssignOpen} onClose={() => setBulkAssignOpen(false)} title={`Bulk assign manager (${checkedIds.length} selected)`}>
        <div className="space-y-4">
          <div>
            <label className="label">New manager</label>
            <select className="input" value={bulkManagerId} onChange={(e) => setBulkManagerId(e.target.value)}>
              <option value="">None (remove from manager)</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.first_name} {m.last_name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setBulkAssignOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" disabled={bulkAssigning} onClick={handleBulkAssign}>
              <Users2 size={15} /> {bulkAssigning ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
