import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Check } from 'lucide-react';
import { usePageTitle } from '../context/PageTitleContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useOnboarding } from '../context/OnboardingContext';
import * as onboardingService from '../services/onboardingService';
import * as skillService from '../services/skillService';
import Certifications from './Certifications';

const STEP_META = {
  personal: { title: 'Personal information', blurb: 'So HR can reach you, and someone can be contacted in an emergency.' },
  skills: { title: 'Your skills', blurb: 'Say where you stand on each skill. You can change any of this later.' },
  certifications: { title: 'Certifications', blurb: 'Add the certifications you hold, or tell us you have none yet.' },
};

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
const PROFICIENCY_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];
const PHONE = /^[0-9+()\-.\s]{7,30}$/;

function ErrorLine({ children }) {
  if (!children) return null;
  return (
    <div className="flex items-center gap-2 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
      <AlertCircle size={15} /> {children}
    </div>
  );
}

// ---------------------------------------------------------------- step 1
function PersonalStep({ initial, onSaved }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!PHONE.test(form.phone.trim())) return setError('Enter a valid phone number (digits, spaces, + ( ) - .).');
    if (form.emergencyContactName.trim().length < 2) return setError("Enter your emergency contact's name.");
    if (!PHONE.test(form.emergencyContactPhone.trim())) return setError("Enter a valid phone number for your emergency contact.");
    setSaving(true);
    try {
      await onboardingService.savePersonal(form);
      await onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Phone number *</label>
          <input className="input" value={form.phone} onChange={set('phone')} autoComplete="tel" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Address (optional)</label>
          <textarea className="input" rows={2} value={form.address} onChange={set('address')} />
        </div>
        <div>
          <label className="label">Emergency contact name *</label>
          <input className="input" value={form.emergencyContactName} onChange={set('emergencyContactName')} />
        </div>
        <div>
          <label className="label">Emergency contact phone *</label>
          <input className="input" value={form.emergencyContactPhone} onChange={set('emergencyContactPhone')} />
        </div>
      </div>
      <ErrorLine>{error}</ErrorLine>
      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Save and continue'}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- step 2
function SkillsStep({ userId, onContinue, onSkip }) {
  const { refresh } = useOnboarding();
  const [catalog, setCatalog] = useState(null);
  const [rows, setRows] = useState({});
  const [touched, setTouched] = useState({});
  const [existingCount, setExistingCount] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([skillService.listCatalog(), skillService.listSkills(userId)])
      .then(([list, mine]) => {
        const initial = {};
        list.forEach((entry) => {
          const have = mine.find((s) => s.catalog_id === entry.id || s.skill_name.toLowerCase() === entry.name.toLowerCase());
          initial[entry.id] = have
            ? {
                status: have.training_status || 'trained',
                proficiency: have.proficiency,
                years: have.years_experience ? String(have.years_experience) : '',
              }
            : { status: '', proficiency: 'beginner', years: '' };
        });
        setRows(initial);
        setExistingCount(mine.length);
        setCatalog(list);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Could not load the skill list.');
        setCatalog([]);
      });
  }, [userId]);

  const update = (id, changes) => {
    setRows((r) => ({ ...r, [id]: { ...r[id], ...changes } }));
    setTouched((t) => ({ ...t, [id]: true }));
  };

  async function handleSave() {
    setError('');
    const changed = catalog.filter((entry) => touched[entry.id] && rows[entry.id]?.status);
    if (changed.length === 0 && existingCount === 0) {
      return setError('Pick a status for at least one skill, or choose "Skip for now".');
    }
    setSaving(true);
    try {
      await Promise.all(
        changed.map((entry) => {
          const row = rows[entry.id];
          const notTrained = row.status === 'not_trained';
          return skillService.upsertSkill(userId, {
            catalogId: entry.id,
            trainingStatus: row.status,
            proficiency: row.proficiency,
            yearsExperience: !notTrained && row.years ? parseFloat(row.years) : 0,
          });
        })
      );
      await refresh();
      onContinue();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save your skills. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (catalog === null) return <div className="skeleton h-48 w-full" />;

  return (
    <div className="space-y-5">
      {CATEGORIES.map((cat) => {
        const entries = catalog.filter((c) => c.category === cat.value);
        if (!entries.length) return null;
        return (
          <div key={cat.value}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-light/50 dark:text-ink-dark/50">
              {cat.label}
            </p>
            <div className="space-y-2">
              {entries.map((entry) => {
                const row = rows[entry.id] || { status: '', proficiency: 'beginner', years: '' };
                const active = row.status === 'trained' || row.status === 'in_training';
                return (
                  <div
                    key={entry.id}
                    className="grid grid-cols-1 items-center gap-2 rounded-lg border border-primary-50 px-3 py-2 sm:grid-cols-[1fr_9rem_9rem_5rem] dark:border-primary-900/50"
                  >
                    <span className="text-sm font-medium">{entry.name}</span>
                    <select
                      className="input !py-1.5"
                      aria-label={`Status for ${entry.name}`}
                      value={row.status}
                      onChange={(e) => update(entry.id, { status: e.target.value })}
                    >
                      <option value="">Select…</option>
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <select
                      className="input !py-1.5 disabled:opacity-40"
                      aria-label={`Proficiency for ${entry.name}`}
                      disabled={!active}
                      value={row.proficiency}
                      onChange={(e) => update(entry.id, { proficiency: e.target.value })}
                    >
                      {PROFICIENCY_LEVELS.map((p) => (
                        <option key={p} value={p}>
                          {p[0].toUpperCase() + p.slice(1)}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      step="0.5"
                      placeholder="Yrs"
                      aria-label={`Years of experience for ${entry.name}`}
                      className="input !py-1.5 disabled:opacity-40"
                      disabled={!active}
                      value={row.years}
                      onChange={(e) => update(entry.id, { years: e.target.value })}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <p className="text-xs text-ink-light/50 dark:text-ink-dark/50">
        A skill that isn't listed? You can add it from My Skills once you're set up.
      </p>
      <ErrorLine>{error}</ErrorLine>
      <div className="flex justify-between">
        <button type="button" className="btn-secondary" onClick={onSkip}>
          Skip for now
        </button>
        <button type="button" disabled={saving} className="btn-primary" onClick={handleSave}>
          {saving ? 'Saving…' : 'Save and continue'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- step 3
function CertificationsStep({ initialNone, onFinish, onFinishLater, isLast }) {
  const { refresh } = useOnboarding();
  const [none, setNone] = useState(initialNone);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleFinish() {
    setError('');
    setSaving(true);
    try {
      await onboardingService.setNoCertifications(none);
      const next = await refresh();
      if (next && !next.certificationsDone) {
        setError('Add a certification, or tick "I don\'t have any certifications yet", or choose "Finish later".');
      } else {
        onFinish();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Certifications />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-primary-300 text-primary-600 focus:ring-primary-500"
          checked={none}
          onChange={(e) => setNone(e.target.checked)}
        />
        I don't have any certifications yet
      </label>
      <ErrorLine>{error}</ErrorLine>
      <div className="flex justify-between">
        <button type="button" className="btn-secondary" onClick={onFinishLater}>
          Finish later
        </button>
        <button type="button" disabled={saving} className="btn-primary" onClick={handleFinish}>
          {saving ? 'Saving…' : isLast ? 'Finish' : 'Save and continue'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- page
export default function Onboarding() {
  usePageTitle('Complete your profile');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { status, loaded, steps, done, refresh } = useOnboarding();
  const [index, setIndex] = useState(null);

  // Open on the first step that isn't finished yet.
  useEffect(() => {
    if (index === null && loaded && status) {
      const firstPending = steps.findIndex((s) => !done[s]);
      setIndex(firstPending === -1 ? 0 : firstPending);
    }
  }, [index, loaded, status, steps, done]);

  async function finish() {
    await refresh();
    showToast("You're all set. Thank you!");
    navigate('/dashboard', { replace: true });
  }

  async function finishLater() {
    try {
      await onboardingService.dismiss();
    } catch {
      // Not being able to record the choice shouldn't trap anyone here.
    }
    await refresh();
    navigate('/dashboard', { replace: true });
  }

  const goNext = () => (index < steps.length - 1 ? setIndex(index + 1) : finish());

  if (!loaded || (status && index === null)) {
    return <div className="mx-auto max-w-3xl"><div className="skeleton h-64 w-full" /></div>;
  }
  if (!status) {
    return (
      <div className="mx-auto max-w-3xl">
        <ErrorLine>We couldn't load your setup. Please refresh the page.</ErrorLine>
      </div>
    );
  }

  const step = steps[index];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold">Welcome{user?.first_name ? `, ${user.first_name}` : ''}</h2>
        <p className="mt-1 text-sm text-ink-light/60 dark:text-ink-dark/60">
          A few quick steps to complete your profile. It takes about five minutes.
        </p>
      </div>

      <ol className="flex flex-wrap gap-2">
        {steps.map((s, i) => {
          const isDone = !!done[s];
          const isCurrent = i === index;
          // Any step can be reopened, so something skipped (or finished but worth
          // changing) is one click away. Everything else waits for contact details.
          const locked = !status.personalDone && s !== 'personal';
          return (
            <li key={s}>
              <button
                type="button"
                disabled={locked}
                onClick={() => setIndex(i)}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  isCurrent
                    ? 'bg-primary-600 text-white'
                    : isDone
                    ? 'bg-success/10 text-success hover:bg-success/20'
                    : 'bg-primary-50 text-primary-800 hover:bg-primary-100 dark:bg-primary-900/40 dark:text-primary-100'
                }`}
              >
                {isDone && !isCurrent ? <Check size={13} /> : <span>{i + 1}</span>}
                {STEP_META[s].title}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="card card-skills">
        <h3 className="font-display text-base font-semibold">{STEP_META[step].title}</h3>
        <p className="mb-5 mt-1 text-sm text-ink-light/55 dark:text-ink-dark/55">{STEP_META[step].blurb}</p>

        {step === 'personal' && <PersonalStep initial={status.personal} onSaved={async () => { await refresh(); goNext(); }} />}
        {step === 'skills' && <SkillsStep userId={user.id} onContinue={goNext} onSkip={goNext} />}
        {step === 'certifications' && (
          <CertificationsStep
            initialNone={status.noCertificationsConfirmed}
            isLast={index === steps.length - 1}
            onFinish={goNext}
            onFinishLater={finishLater}
          />
        )}
      </div>
    </div>
  );
}
