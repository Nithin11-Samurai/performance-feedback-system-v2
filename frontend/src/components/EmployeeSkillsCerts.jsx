import Badge from './Badge';

const CATEGORY_ORDER = ['salesforce', 'conga', 'other'];
const CATEGORY_LABEL = { salesforce: 'Salesforce', conga: 'Conga', other: 'Other' };
const STATUS_LABEL = { trained: 'Trained', in_training: 'In training', not_trained: 'Not trained' };
const STATUS_TONE = { trained: 'success', in_training: 'warning', not_trained: 'neutral' };
const PROFICIENCY_TONE = { beginner: 'neutral', intermediate: 'primary', advanced: 'accent', expert: 'success' };

export function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
}

/** Where a certification stands: no expiry, valid, expiring soon, or expired. */
export function certState(cert) {
  if (!cert.expiry_date) return { label: 'No expiry', tone: 'neutral', days: null };
  const days =
    typeof cert.days_left === 'number'
      ? cert.days_left
      : Math.ceil((new Date(cert.expiry_date).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`, tone: 'danger', days };
  if (days <= 30) return { label: `Expires in ${days} day${days === 1 ? '' : 's'}`, tone: 'danger', days };
  if (days <= 90) return { label: `Expires in ${days} days`, tone: 'warning', days };
  return { label: 'Valid', tone: 'success', days };
}

/** A person's skills, grouped by category, with status, proficiency, years and notes. */
export function SkillsList({ skills, emptyText = 'No skills recorded.' }) {
  if (!skills || skills.length === 0) {
    return <p className="text-sm text-ink-light/50 dark:text-ink-dark/50">{emptyText}</p>;
  }
  const known = CATEGORY_ORDER.filter((c) => skills.some((s) => s.category === c));
  const extra = [...new Set(skills.map((s) => s.category))].filter((c) => !CATEGORY_ORDER.includes(c));
  return (
    <div className="space-y-5">
      {[...known, ...extra].map((category) => (
        <div key={category}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-light/50 dark:text-ink-dark/50">
            {CATEGORY_LABEL[category] || category}
          </p>
          <ul className="space-y-2">
            {skills
              .filter((s) => s.category === category)
              .map((s) => {
                const status = s.training_status || 'trained';
                return (
                  <li
                    key={s.id || s.skill_name}
                    className="flex flex-col gap-1 border-b border-primary-50 pb-2 text-sm last:border-0 sm:flex-row sm:items-start sm:justify-between dark:border-primary-900/50"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{s.skill_name}</p>
                      {s.notes && <p className="text-xs text-ink-light/50 dark:text-ink-dark/50">{s.notes}</p>}
                    </div>
                    <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                      <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
                      {status !== 'not_trained' && (
                        <>
                          <Badge tone={PROFICIENCY_TONE[s.proficiency] || 'neutral'}>{s.proficiency}</Badge>
                          <span className="data-mono text-xs text-ink-light/50 dark:text-ink-dark/50">
                            {Number(s.years_experience) || 0} yrs
                          </span>
                        </>
                      )}
                      {s.updated_at && (
                        <span className="text-[11px] text-ink-light/40 dark:text-ink-dark/40">
                          updated {formatDate(s.updated_at)}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** A person's certifications with issuer, dates, credential id and an expiry state. */
export function CertsList({ certs, emptyText = 'No certifications recorded.' }) {
  if (!certs || certs.length === 0) {
    return <p className="text-sm text-ink-light/50 dark:text-ink-dark/50">{emptyText}</p>;
  }
  return (
    <ul className="space-y-3">
      {certs.map((c) => {
        const state = certState(c);
        return (
          <li
            key={c.id}
            className="flex flex-col gap-1 border-b border-primary-50 pb-3 text-sm last:border-0 sm:flex-row sm:items-start sm:justify-between dark:border-primary-900/50"
          >
            <div className="min-w-0">
              <p className="font-medium">{c.name}</p>
              <p className="text-xs text-ink-light/50 dark:text-ink-dark/50">
                {c.issuing_organization || 'Issuer not given'}
                {c.issue_date ? ` · Issued ${formatDate(c.issue_date)}` : ''}
                {c.expiry_date ? ` · Expires ${formatDate(c.expiry_date)}` : ''}
                {c.credential_id ? ` · ID ${c.credential_id}` : ''}
              </p>
            </div>
            <div className="flex-shrink-0">
              <Badge tone={state.tone}>{state.label}</Badge>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
