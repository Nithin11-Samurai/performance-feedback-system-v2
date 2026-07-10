import { useEffect, useState } from 'react';
import { Plus, Trash2, Award, Upload, AlertCircle, ExternalLink, Pencil } from 'lucide-react';
import { usePageTitle } from '../context/PageTitleContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import * as certificationService from '../services/certificationService';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');

const emptyForm = { name: '', issuingOrganization: '', issueDate: '', expiryDate: '', credentialId: '', credentialUrl: '' };

export default function Certifications() {
  usePageTitle('Certifications');
  const { user } = useAuth();
  const { showToast } = useToast();

  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await certificationService.listCertifications(user.id);
      setCerts(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load certifications.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openAddModal() {
    setEditing(null);
    setForm(emptyForm);
    setFile(null);
    setModalOpen(true);
  }

  function openEditModal(cert) {
    setEditing(cert);
    setForm({
      name: cert.name,
      issuingOrganization: cert.issuing_organization || '',
      issueDate: cert.issue_date ? cert.issue_date.slice(0, 10) : '',
      expiryDate: cert.expiry_date ? cert.expiry_date.slice(0, 10) : '',
      credentialId: cert.credential_id || '',
      credentialUrl: cert.credential_url || '',
    });
    setFile(null);
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await certificationService.updateCertification(user.id, editing.id, form, file);
        showToast('Certification updated successfully');
      } else {
        await certificationService.createCertification(user.id, form, file);
        showToast('Certification added successfully');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save certification.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cert) {
    try {
      await certificationService.deleteCertification(user.id, cert.id);
      showToast('Certification removed');
      setCerts((prev) => prev.filter((c) => c.id !== cert.id));
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to remove certification.', 'error');
    }
  }

  function isExpired(cert) {
    return cert.expiry_date && new Date(cert.expiry_date) < new Date();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-light/60 dark:text-ink-dark/60">
          Upload your certificates so HR always has proof of your credentials on file.
        </p>
        <button className="btn-primary" onClick={openAddModal}>
          <Plus size={16} /> Add certification
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-300 border-t-primary-700" />
        </div>
      ) : certs.length === 0 ? (
        <div className="card card-certs flex flex-col items-center gap-2 py-12 text-center">
          <Award size={28} className="text-accent-400" />
          <p className="text-sm text-ink-light/50 dark:text-ink-dark/50">No certifications on file yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {certs.map((cert) => (
            <div key={cert.id} className="card card-certs flex flex-col gap-3">
              {cert.file_url && /\.(png|jpe?g|webp)$/i.test(cert.file_url) && (
                <img
                  src={`${API_ORIGIN}${cert.file_url}`}
                  alt={`${cert.name} certificate`}
                  className="h-32 w-full rounded-md object-cover"
                />
              )}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{cert.name}</p>
                  <p className="text-xs text-ink-light/50 dark:text-ink-dark/50">{cert.issuing_organization || 'N/A'}</p>
                </div>
                {isExpired(cert) && (
                  <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">Expired</span>
                )}
              </div>
              <div className="text-xs text-ink-light/50 dark:text-ink-dark/50">
                {cert.issue_date && <p>Issued: {new Date(cert.issue_date).toLocaleDateString()}</p>}
                {cert.expiry_date && <p>Expires: {new Date(cert.expiry_date).toLocaleDateString()}</p>}
                {cert.credential_id && <p className="data-mono">ID: {cert.credential_id}</p>}
                {cert.credential_url && (
                  <a href={cert.credential_url} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline dark:text-primary-300">
                    View credential ↗
                  </a>
                )}
              </div>
              <div className="mt-auto flex items-center gap-2 pt-2">
                {cert.file_url && (
                  <a
                    href={`${API_ORIGIN}${cert.file_url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary flex-1 text-xs"
                  >
                    <ExternalLink size={13} /> View file
                  </a>
                )}
                <button onClick={() => openEditModal(cert)} className="rounded-md p-1.5 text-ink-light/40 hover:bg-primary-50 dark:text-ink-dark/40">
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => setConfirmDelete(cert)}
                  className="rounded-md p-1.5 text-ink-light/40 hover:bg-danger/10 hover:text-danger dark:text-ink-dark/40"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit certification' : 'Add certification'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Certification name</label>
            <input
              className="input"
              required
              placeholder="e.g. Salesforce Certified Administrator"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Issuing organization</label>
            <input
              className="input"
              value={form.issuingOrganization}
              onChange={(e) => setForm((f) => ({ ...f, issuingOrganization: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Issue date</label>
              <input
                type="date"
                className="input"
                value={form.issueDate}
                onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Expiry date</label>
              <input
                type="date"
                className="input"
                value={form.expiryDate}
                onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="label">Credential ID (optional)</label>
            <input
              className="input"
              value={form.credentialId}
              onChange={(e) => setForm((f) => ({ ...f, credentialId: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Credential URL (optional)</label>
            <input
              type="url"
              className="input"
              placeholder="https://credentials.example.com/..."
              value={form.credentialUrl}
              onChange={(e) => setForm((f) => ({ ...f, credentialUrl: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Certificate file (image or PDF)</label>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-primary-300 px-3 py-3 text-sm text-ink-light/60 hover:bg-primary-50 dark:border-primary-800 dark:text-ink-dark/60 dark:hover:bg-primary-900/30">
              <Upload size={16} />
              {file ? file.name : editing?.file_original_name ? `Replace "${editing.file_original_name}"` : 'Choose a file to upload'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Save certification'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        title="Remove certification"
        message={`Remove "${confirmDelete?.name}" from your profile? The uploaded file will also be deleted.`}
        confirmLabel="Remove"
      />
    </div>
  );
}
