import { useEffect, useState } from 'react';
import { Plus, Trash2, Sparkles, AlertCircle } from 'lucide-react';
import { usePageTitle } from '../context/PageTitleContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import * as skillService from '../services/skillService';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Badge from '../components/Badge';

const CATEGORIES = [
  { value: 'salesforce', label: 'Salesforce' },
  { value: 'conga', label: 'Conga' },
  { value: 'other', label: 'Other' },
];

const PROFICIENCY_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];

const PROFICIENCY_TONE = {
  beginner: 'neutral',
  intermediate: 'primary',
  advanced: 'accent',
  expert: 'success',
};

const emptyForm = { category: 'salesforce', skillName: '', proficiency: 'beginner', yearsExperience: '', notes: '' };

export default function Skills() {
  usePageTitle('My Skills');
  const { user } = useAuth();
  const { showToast } = useToast();

  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await skillService.listSkills(user.id);
      setSkills(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load skills.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openAddModal() {
    setForm(emptyForm);
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.skillName.trim()) return;
    setSaving(true);
    try {
      await skillService.upsertSkill(user.id, {
        category: form.category,
        skillName: form.skillName.trim(),
        proficiency: form.proficiency,
        yearsExperience: form.yearsExperience ? parseFloat(form.yearsExperience) : 0,
        notes: form.notes || undefined,
      });
      showToast('Skill saved successfully');
      setModalOpen(false);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save skill.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(skill) {
    try {
      await skillService.deleteSkill(user.id, skill.id);
      showToast('Skill removed');
      setSkills((prev) => prev.filter((s) => s.id !== skill.id));
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to remove skill.', 'error');
    }
  }

  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    items: skills.filter((s) => s.category === cat.value),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-light/60 dark:text-ink-dark/60">
          Keep your Salesforce and Conga skills up to date so HR and your manager have an accurate picture.
        </p>
        <button className="btn-primary" onClick={openAddModal}>
          <Plus size={16} /> Add skill
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
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {grouped.map((group) => (
            <div key={group.value} className="card card-skills">
              <h3 className="mb-4 font-display text-base font-semibold">{group.label}</h3>
              {group.items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Sparkles size={24} className="text-primary-300" />
                  <p className="text-sm text-ink-light/50 dark:text-ink-dark/50">No {group.label} skills added yet.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {group.items.map((skill) => (
                    <li key={skill.id} className="flex items-start justify-between gap-3 border-b border-primary-50 pb-3 last:border-0 last:pb-0 dark:border-primary-900/50">
                      <div>
                        <p className="font-medium">{skill.skill_name}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge tone={PROFICIENCY_TONE[skill.proficiency]}>{skill.proficiency}</Badge>
                          <span className="data-mono text-xs text-ink-light/50 dark:text-ink-dark/50">
                            {skill.years_experience} yrs
                          </span>
                        </div>
                        {skill.notes && <p className="mt-1 text-xs text-ink-light/50 dark:text-ink-dark/50">{skill.notes}</p>}
                      </div>
                      <button
                        onClick={() => setConfirmDelete(skill)}
                        className="rounded-md p-1.5 text-ink-light/40 hover:bg-danger/10 hover:text-danger dark:text-ink-dark/40"
                        aria-label={`Remove ${skill.skill_name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add or update a skill">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Category</label>
            <select
              className="input"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Skill name</label>
            <input
              className="input"
              required
              placeholder="e.g. Apex, Flow, Conga Composer"
              value={form.skillName}
              onChange={(e) => setForm((f) => ({ ...f, skillName: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Proficiency</label>
              <select
                className="input"
                value={form.proficiency}
                onChange={(e) => setForm((f) => ({ ...f, proficiency: e.target.value }))}
              >
                {PROFICIENCY_LEVELS.map((p) => (
                  <option key={p} value={p}>
                    {p[0].toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Years of experience</label>
              <input
                type="number"
                min="0"
                max="60"
                step="0.5"
                className="input"
                value={form.yearsExperience}
                onChange={(e) => setForm((f) => ({ ...f, yearsExperience: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <textarea
              className="input"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Save skill'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        title="Remove skill"
        message={`Remove "${confirmDelete?.skill_name}" from your profile?`}
        confirmLabel="Remove"
      />
    </div>
  );
}
