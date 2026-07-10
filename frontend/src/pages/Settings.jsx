import { useEffect, useState } from 'react';
import { Plus, Trash2, Building2, BadgeCheck } from 'lucide-react';
import { usePageTitle } from '../context/PageTitleContext';
import { useToast } from '../context/ToastContext';
import * as catalogService from '../services/catalogService';
import ConfirmDialog from '../components/ConfirmDialog';
import Skeleton from '../components/Skeleton';

function CatalogList({ title, icon: Icon, items, itemKey, onAdd, onDelete, placeholder }) {
  const [value, setValue] = useState('');
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  async function handleAdd(e) {
    e.preventDefault();
    if (!value.trim()) return;
    setAdding(true);
    try {
      await onAdd(value.trim());
      setValue('');
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="card card-reviews">
      <h3 className="mb-4 flex items-center gap-2 font-display text-base font-semibold">
        <Icon size={16} /> {title}
      </h3>
      <form onSubmit={handleAdd} className="mb-4 flex gap-2">
        <input className="input" placeholder={placeholder} value={value} onChange={(e) => setValue(e.target.value)} />
        <button type="submit" disabled={adding || !value.trim()} className="btn-primary flex-shrink-0">
          <Plus size={15} /> Add
        </button>
      </form>

      {items === null ? (
        <Skeleton className="h-32 w-full" />
      ) : items.length === 0 ? (
        <p className="text-sm text-ink-light/50 dark:text-ink-dark/50">None added yet.</p>
      ) : (
        <ul className="max-h-72 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-primary-50/50 dark:hover:bg-primary-900/20">
              <span>{item[itemKey]}</span>
              <button onClick={() => setConfirmDelete(item)} className="text-ink-light/30 hover:text-danger dark:text-ink-dark/30">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && onDelete(confirmDelete.id)}
        title={`Remove "${confirmDelete?.[itemKey]}"`}
        message="This only removes it from the dropdown list — it won't change any employee already using this value."
        confirmLabel="Remove"
      />
    </div>
  );
}

export default function Settings() {
  usePageTitle('Settings');
  const { showToast } = useToast();
  const [departments, setDepartments] = useState(null);
  const [jobTitles, setJobTitles] = useState(null);

  async function loadDepartments() {
    setDepartments(await catalogService.listDepartments());
  }
  async function loadJobTitles() {
    setJobTitles(await catalogService.listJobTitles());
  }

  useEffect(() => {
    loadDepartments();
    loadJobTitles();
  }, []);

  async function handleAddDepartment(name) {
    try {
      await catalogService.createDepartment(name);
      showToast('Department added');
      loadDepartments();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add department.', 'error');
    }
  }

  async function handleDeleteDepartment(id) {
    try {
      await catalogService.deleteDepartment(id);
      showToast('Department removed');
      setDepartments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to remove department.', 'error');
    }
  }

  async function handleAddJobTitle(title) {
    try {
      await catalogService.createJobTitle(title);
      showToast('Job title added');
      loadJobTitles();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add job title.', 'error');
    }
  }

  async function handleDeleteJobTitle(id) {
    try {
      await catalogService.deleteJobTitle(id);
      showToast('Job title removed');
      setJobTitles((prev) => prev.filter((j) => j.id !== id));
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to remove job title.', 'error');
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-light/60 dark:text-ink-dark/60">
        Manage the department and job title lists used across employee profiles — these power the
        dropdowns when creating or editing an employee.
      </p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CatalogList
          title="Departments"
          icon={Building2}
          items={departments}
          itemKey="name"
          onAdd={handleAddDepartment}
          onDelete={handleDeleteDepartment}
          placeholder="e.g. Customer Success"
        />
        <CatalogList
          title="Job Titles"
          icon={BadgeCheck}
          items={jobTitles}
          itemKey="title"
          onAdd={handleAddJobTitle}
          onDelete={handleDeleteJobTitle}
          placeholder="e.g. Solutions Consultant"
        />
      </div>
    </div>
  );
}
