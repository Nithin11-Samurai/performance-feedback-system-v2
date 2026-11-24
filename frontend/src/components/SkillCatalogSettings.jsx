import { useEffect, useState } from 'react';
import { Plus, Pencil, Check, X, EyeOff, RotateCcw, Sparkles } from 'lucide-react';
import * as skillService from '../services/skillService';
import { useToast } from '../context/ToastContext';
import Skeleton from './Skeleton';

const CATEGORIES = [
  { value: 'salesforce', label: 'Salesforce' },
  { value: 'conga', label: 'Conga' },
  { value: 'other', label: 'Other' },
];

/**
 * Settings > Skill list. The skills employees pick from on My Skills.
 * "Remove" only hides a skill from the picker; employees who already have
 * it keep their record, and it can be restored. Skills people typed in
 * themselves show up in the second list so they can be added to the list.
 */
export default function SkillCatalogSettings() {
  const { showToast } = useToast();
  const [items, setItems] = useState(null);
  const [custom, setCustom] = useState(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('other');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [busyId, setBusyId] = useState(null);

  async function load() {
    const [list, customList] = await Promise.all([skillService.listCatalog(true), skillService.listCustomSkills()]);
    setItems(list);
    setCustom(customList);
  }

  useEffect(() => {
    load().catch(() => {
      setItems([]);
      setCustom([]);
    });
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    try {
      await skillService.createCatalogSkill({ name: name.trim(), category });
      showToast('Skill added to the list');
      setName('');
      await load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add skill.', 'error');
    } finally {
      setAdding(false);
    }
  }

  async function change(item, changes, successMessage) {
    setBusyId(item.id);
    try {
      await skillService.updateCatalogSkill(item.id, changes);
      showToast(successMessage);
      await load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update skill.', 'error');
    } finally {
      setBusyId(null);
    }
  }

  // The goal is how many trained people the company wants for this skill.
  // The dashboard compares the real number against it. Empty = no goal.
  async function saveTarget(item, raw) {
    const next = raw === '' ? null : Number(raw);
    if (next === (item.target_trained ?? null)) return;
    if (next !== null && (!Number.isInteger(next) || next < 0)) {
      showToast('The goal must be a whole number, 0 or more.', 'error');
      return;
    }
    await change(item, { targetTrained: next }, next === null ? 'Goal cleared' : 'Goal updated');
  }

  async function saveRename(item) {
    const next = editName.trim();
    if (!next || next === item.name) {
      setEditingId(null);
      return;
    }
    await change(item, { name: next }, 'Skill renamed');
    setEditingId(null);
  }

  async function addCustomToList(entry) {
    try {
      await skillService.createCatalogSkill({ name: entry.name, category: entry.category });
      showToast(`"${entry.name}" added to the list`);
      await load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add skill.', 'error');
    }
  }

  return (
    <div className="card card-skills">
      <h3 className="mb-1 flex items-center gap-2 font-display text-base font-semibold">
        <Sparkles size={16} /> Skill list
      </h3>
      <p className="mb-4 text-sm text-ink-light/55 dark:text-ink-dark/55">
        The skills employees pick from on My Skills. Removing a skill only hides it from the list; anyone who already
        has it keeps their record. The small number next to a skill is an optional goal: how many trained people you
        want company-wide. The Skills and Certifications dashboard uses it to show where you are ahead or lacking.
      </p>

      <form onSubmit={handleAdd} className="mb-5 flex flex-col gap-2 sm:flex-row">
        <input
          className="input"
          placeholder="e.g. Conga Contracts"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select className="input sm:w-40" value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <button type="submit" disabled={adding || !name.trim()} className="btn-primary flex-shrink-0">
          <Plus size={15} /> Add
        </button>
      </form>

      {items === null ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {CATEGORIES.map((cat) => (
            <div key={cat.value}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-light/50 dark:text-ink-dark/50">
                {cat.label}
              </p>
              <ul className="max-h-80 space-y-1 overflow-y-auto">
                {items
                  .filter((i) => i.category === cat.value)
                  .map((item) => (
                    <li
                      key={item.id}
                      className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-primary-50/50 dark:hover:bg-primary-900/20 ${
                        item.is_active ? '' : 'opacity-50'
                      }`}
                    >
                      {editingId === item.id ? (
                        <input
                          autoFocus
                          className="input !py-1"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveRename(item);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                        />
                      ) : (
                        <span className="min-w-0 truncate">
                          {item.name}
                          {!item.is_active && <span className="ml-2 text-xs">(removed)</span>}
                        </span>
                      )}
                      <div className="flex flex-shrink-0 items-center gap-1">
                        {editingId === item.id ? (
                          <>
                            <button
                              onClick={() => saveRename(item)}
                              className="text-ink-light/50 hover:text-success"
                              aria-label="Save name"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-ink-light/50 hover:text-danger"
                              aria-label="Cancel"
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <input
                              type="number"
                              min="0"
                              max="100000"
                              step="1"
                              placeholder="Goal"
                              title="Goal: how many trained people you want for this skill (optional)"
                              aria-label={`Goal for ${item.name}`}
                              key={`${item.id}-${item.target_trained ?? ''}`}
                              defaultValue={item.target_trained ?? ''}
                              disabled={busyId === item.id}
                              onBlur={(e) => saveTarget(item, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') e.currentTarget.blur();
                              }}
                              className="w-14 rounded border border-transparent bg-transparent px-1 text-right text-xs text-ink-light/60 hover:border-primary-100 focus:border-primary-300 dark:text-ink-dark/60"
                            />
                            <select
                              className="rounded border border-transparent bg-transparent text-xs text-ink-light/50 hover:border-primary-100 dark:text-ink-dark/50"
                              value={item.category}
                              disabled={busyId === item.id}
                              onChange={(e) => change(item, { category: e.target.value }, 'Category updated')}
                              aria-label={`Category for ${item.name}`}
                            >
                              {CATEGORIES.map((c) => (
                                <option key={c.value} value={c.value}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => {
                                setEditingId(item.id);
                                setEditName(item.name);
                              }}
                              className="text-ink-light/30 hover:text-primary-700 dark:text-ink-dark/30"
                              aria-label={`Rename ${item.name}`}
                            >
                              <Pencil size={13} />
                            </button>
                            {item.is_active ? (
                              <button
                                disabled={busyId === item.id}
                                onClick={() => change(item, { isActive: false }, 'Skill removed from the list')}
                                className="text-ink-light/30 hover:text-danger dark:text-ink-dark/30"
                                aria-label={`Remove ${item.name} from the list`}
                                title="Hide from the list"
                              >
                                <EyeOff size={13} />
                              </button>
                            ) : (
                              <button
                                disabled={busyId === item.id}
                                onClick={() => change(item, { isActive: true }, 'Skill restored')}
                                className="text-ink-light/50 hover:text-success"
                                aria-label={`Restore ${item.name}`}
                                title="Restore"
                              >
                                <RotateCcw size={13} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 border-t border-primary-50 pt-4 dark:border-primary-900/50">
        <p className="mb-1 text-sm font-medium">Skills employees added themselves</p>
        <p className="mb-3 text-xs text-ink-light/50 dark:text-ink-dark/50">
          These are not in the list above. Add one to the list to make it available to everyone.
        </p>
        {custom === null ? (
          <Skeleton className="h-12 w-full" />
        ) : custom.length === 0 ? (
          <p className="text-sm text-ink-light/50 dark:text-ink-dark/50">None yet.</p>
        ) : (
          <ul className="max-h-60 space-y-1 overflow-y-auto">
            {custom.map((entry) => (
              <li
                key={`${entry.category}-${entry.name}`}
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-primary-50/50 dark:hover:bg-primary-900/20"
              >
                <span>
                  {entry.name}{' '}
                  <span className="text-xs capitalize text-ink-light/40 dark:text-ink-dark/40">
                    ({entry.category}, {entry.employee_count} employee{entry.employee_count === 1 ? '' : 's'})
                  </span>
                </span>
                <button className="btn-secondary text-xs" onClick={() => addCustomToList(entry)}>
                  Add to list
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
