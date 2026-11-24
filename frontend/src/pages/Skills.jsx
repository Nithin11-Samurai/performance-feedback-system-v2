import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Sparkles, AlertCircle, Pencil } from 'lucide-react';
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

const STATUS_OPTIONS = [
  { value: 'not_trained', label: 'Not trained' },
  { value: 'in_training', label: 'In training' },
  { value: 'trained', label: 'Trained' },
];
const STATUS_LABEL = Object.fromEntries(STATUS_OPTIONS.map((s) => [s.value, s.label]));
const STATUS_TONE = { trained: 'success', in_training: 'warning', not_trained: 'neutral' };

const PROFICIENCY_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];

const PROFICIENCY_TONE = {
  beginner: 'neutral',
  intermediate: 'primary',
  advanced: 'accent',
  expert: 'success',
};

// Value of the skill dropdown when the person's skill isn't in the list.
const CUSTOM = '__custom__';

const emptyForm = {
  catalogId: '',
  category: 'other',
  skillName: '',
  trainingStatus: 'trained',
  proficiency: 'beginner',
  yearsExperience: '',
  notes: '',
};

export default function Skills() {
  usePageTitle('My Skills');
  const { user } = useAuth();
  const { showToast } = useToast();

  const [skills, setSkills] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [mine, list] = await Promise.all([skillService.listSkills(user.id), skillService.listCatalog()]);
      setSkills(mine);
      setCatalog(list);
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

  // A catalog skill counts as "filled in" if the person has a record for it,
  // either linked to it or with the same name.
  function hasRecordFor(entry) {
    return skills.some((s) => s.catalog_id === entry.id || s.skill_name.toLowerCase() === entry.name.toLowerCase());
  }

  const notRatedByCategory = useMemo(() => {
    const result = {};
    CATEGORIES.forEach((c) => {
      result[c.value] = catalog.filter((entry) => entry.category === c.value && !hasRecordFor(entry));
    });
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, skills]);

  const ratedCount = catalog.filter(hasRecordFor).length;

  function openAddModal(catalogId = '') {
    setEditing(null);
    setForm({ ...emptyForm, catalogId });
    setModalOpen(true);
  }

  function openEditModal(skill) {
    setEditing(skill);
    setForm({
      catalogId: skill.catalog_id || CUSTOM,
      category: skill.category,
      skillName: skill.skill_name,
      trainingStatus: skill.training_status || 'trained',
      proficiency: skill.proficiency,
      yearsExperience: skill.years_experience ? String(skill.years_experience) : '',
      notes: skill.notes || '',
    });
    setModalOpen(true);
  }

  const isCustom = form.catalogId === CUSTOM;
  const notTrained = form.trainingStatus === 'not_trained';
  const canSubmit = form.catalogId && (!isCustom || form.skillName.trim());

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      const payload = {
        trainingStatus: form.trainingStatus,
        proficiency: form.proficiency,
        yearsExperience: !notTrained && form.yearsExperience ? parseFloat(form.yearsExperience) : 0,
        notes: form.notes || undefined,
      };
      if (isCustom) {
        payload.category = form.category;
        payload.skillName = form.skillName.trim();
      } else {
        payload.catalogId = form.catalogId;
      }
      await skillService.upsertSkill(user.id, payload);
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
    notRated: notRatedByCategory[cat.value] || [],
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-light/60 dark:text-ink-dark/60">
            Pick your skills from the list and say whether you are trained, in training or not trained. You can
            update them any time as you learn. If a skill isn't listed, add it under "Not in the list".
          </p>
          {!loading && catalog.length > 0 && (
            <p className="mt-1 text-xs text-ink-light/50 dark:text-ink-dark/50">
              {ratedCount} of {catalog.length} skills from the list filled in.
            </p>
          )}
        </div>
        <button className="btn-primary flex-shrink-0" onClick={() => openAddModal()}>
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
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <Sparkles size={24} className="text-primary-300" />
                  <p className="text-sm text-ink-light/50 dark:text-ink-dark/50">No {group.label} skills added yet.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {group.items.map((skill) => {
                    const status = skill.training_status || 'trained';
                    return (
                      <li
                        key={skill.id}
                        className="flex items-start justify-between gap-3 border-b border-primary-50 pb-3 last:border-0 last:pb-0 dark:border-primary-900/50"
                      >
                        <div>
                          <p className="font-medium">{skill.skill_name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
                            {status !== 'not_trained' && (
                              <>
                                <Badge tone={PROFICIENCY_TONE[skill.proficiency]}>{skill.proficiency}</Badge>
                                <span className="data-mono text-xs text-ink-light/50 dark:text-ink-dark/50">
                                  {skill.years_experience} yrs
                                </span>
                              </>
                            )}
                          </div>
                          {skill.notes && (
                            <p className="mt-1 text-xs text-ink-light/50 dark:text-ink-dark/50">{skill.notes}</p>
                          )}
                        </div>
                        <div className="flex flex-shrink-0 items-center">
                          <button
                            onClick={() => openEditModal(skill)}
                            className="rounded-md p-1.5 text-ink-light/40 hover:bg-primary-50 hover:text-primary-700 dark:text-ink-dark/40"
                            aria-label={`Edit ${skill.skill_name}`}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(skill)}
                            className="rounded-md p-1.5 text-ink-light/40 hover:bg-danger/10 hover:text-danger dark:text-ink-dark/40"
                            aria-label={`Remove ${skill.skill_name}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {group.notRated.length > 0 && (
                <div className="mt-5 border-t border-primary-50 pt-4 dark:border-primary-900/50">
                  <p className="mb-2 text-xs font-medium text-ink-light/50 dark:text-ink-dark/50">
                    Not filled in yet. Click one to set your status:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.notRated.map((entry) => (
                      <button
                        key={entry.id}
                        onClick={() => openAddModal(entry.id)}
                        className="rounded-full border border-primary-100 px-3 py-1 text-xs text-primary-800 transition-colors hover:bg-primary-50 dark:border-primary-900 dark:text-primary-100 dark:hover:bg-primary-900/30"
                      >
                        + {entry.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Update skill' : 'Add or update a skill'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Skill</label>
            <select
              className="input"
              required
              disabled={!!editing}
              value={form.catalogId}
              onChange={(e) => setForm((f) => ({ ...f, catalogId: e.target.value }))}
            >
              <option value="" disabled>
                Select a skill…
              </option>
              {CATEGORIES.map((cat) => {
                const entries = catalog.filter((c) => c.category === cat.value);
                return entries.length ? (
                  <optgroup key={cat.value} label={cat.label}>
                    {entries.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null;
              })}
              <option value={CUSTOM}>Not in the list…</option>
            </select>
          </div>

          {isCustom && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Category</label>
                <select
                  className="input"
                  disabled={!!editing}
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
                  disabled={!!editing}
                  placeholder="e.g. Apex, Flow, Rust"
                  value={form.skillName}
                  onChange={(e) => setForm((f) => ({ ...f, skillName: e.target.value }))}
                />
              </div>
            </div>
          )}

          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={form.trainingStatus}
              onChange={(e) => setForm((f) => ({ ...f, trainingStatus: e.target.value }))}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {!notTrained && (
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
          )}

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
            <button type="submit" disabled={saving || !canSubmit} className="btn-primary">
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
