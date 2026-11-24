import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Search, X, Users2, GraduationCap, CheckCircle2, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import * as analyticsService from '../services/analyticsService';
import * as catalogService from '../services/catalogService';
import Skeleton from './Skeleton';
import Badge from './Badge';
import { SkillsList, CertsList, formatDate } from './EmployeeSkillsCerts';

const SEGMENTS = [
  { key: 'trained', label: 'Trained', color: '#059669' },
  { key: 'inTraining', label: 'In training', color: '#f59e0b' },
  { key: 'notTrained', label: 'Not trained', color: '#94a3b8' },
  { key: 'notRated', label: 'Not filled in', color: '#e2e8f0' },
];
const CATEGORY_LABEL = { salesforce: 'Salesforce', conga: 'Conga', other: 'Other' };

function Tile({ icon: Icon, label, value, hint, tone }) {
  return (
    <div className="card card-skills flex items-center gap-3 !p-4">
      <div
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
          tone === 'danger'
            ? 'bg-danger/10 text-danger'
            : 'bg-primary-100 text-primary-700 dark:bg-primary-900/60 dark:text-primary-100'
        }`}
      >
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-lg font-semibold leading-5">{value}</p>
        <p className="text-xs text-ink-light/55 dark:text-ink-dark/55">{label}</p>
        {hint && <p className="text-[11px] text-ink-light/40 dark:text-ink-dark/40">{hint}</p>}
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <div className="card card-skills">
      <h3 className="font-display text-base font-semibold">{title}</h3>
      {subtitle && <p className="mb-3 mt-0.5 text-xs text-ink-light/50 dark:text-ink-dark/50">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </div>
  );
}

const Empty = ({ children }) => <p className="py-3 text-sm text-ink-light/50 dark:text-ink-dark/50">{children}</p>;

function StackedBar({ item }) {
  const total = SEGMENTS.reduce((n, s) => n + item[s.key], 0);
  return (
    <div className="flex h-2.5 overflow-hidden rounded-full bg-primary-50 dark:bg-primary-900/40" aria-hidden="true">
      {total > 0 &&
        SEGMENTS.map((s) =>
          item[s.key] > 0 ? (
            <div key={s.key} style={{ width: `${(item[s.key] / total) * 100}%`, backgroundColor: s.color }} />
          ) : null
        )}
    </div>
  );
}

function TargetBadge({ item }) {
  if (item.targetStatus === 'lacking') return <Badge tone="warning">Goal {item.target}: {item.gap} short</Badge>;
  if (item.targetStatus === 'ahead') return <Badge tone="success">Goal {item.target}: {Math.abs(item.gap)} ahead</Badge>;
  if (item.targetStatus === 'on_target') return <Badge tone="success">On goal ({item.target})</Badge>;
  return null;
}

// ------------------------------------------------------------------ who is in view
function PersonSearch({ onPick }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (term.trim().length < 2) {
      setResults(null);
      return undefined;
    }
    let cancelled = false;
    const handle = setTimeout(() => {
      analyticsService
        .searchDashboardPeople(term.trim())
        .then((rows) => !cancelled && setResults(rows))
        .catch(() => !cancelled && setResults([]));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [term]);

  return (
    <div className="w-full sm:max-w-md">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-light/40" />
        <input
          className="input pl-9"
          placeholder="Search by name, email or employee ID…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
      </div>
      {results && (
        <ul className="mt-2 divide-y divide-primary-50 rounded-xl border border-primary-100 dark:divide-primary-900/50 dark:border-primary-900">
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-ink-light/50 dark:text-ink-dark/50">No matches.</li>
          ) : (
            results.map((p) => (
              <li key={p.id}>
                <button
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-primary-50 dark:hover:bg-primary-900/30"
                  onClick={() => onPick(p)}
                >
                  <span>{p.name}</span>
                  <span className="text-xs text-ink-light/45 dark:text-ink-dark/45">
                    {[p.jobTitle, p.department].filter(Boolean).join(' · ')}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ one skill, everyone grouped by status
function SkillPeopleView({ skill, params, onBack }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null);
    analyticsService
      .getDashboardSkillPeople({ ...params, skillKey: skill.key })
      .then(setData)
      .catch((err) => setError(err.response?.data?.message || 'Could not load this skill.'));
  }, [skill.key, params]);

  const groups = [
    { key: 'trained', title: 'Trained', tone: 'success' },
    { key: 'inTraining', title: 'In training', tone: 'warning' },
    { key: 'notTrained', title: 'Not trained', tone: 'neutral' },
    { key: 'notRated', title: 'Not filled in yet', tone: 'neutral' },
  ];

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-ink-light/60 hover:underline dark:text-ink-dark/60">
        <ChevronLeft size={15} /> All skills
      </button>
      <div className="card card-skills">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-lg font-semibold">{skill.name}</h3>
          <Badge tone="primary">{CATEGORY_LABEL[skill.category] || skill.category}</Badge>
          <TargetBadge item={skill} />
        </div>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        {!data && !error && <Skeleton className="mt-4 h-40 w-full" />}
        {data && (
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {groups.map((g) => (
              <div key={g.key} className="rounded-xl border border-primary-50 p-3 dark:border-primary-900/50">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <Badge tone={g.tone}>{g.title}</Badge>
                  <span className="data-mono text-xs text-ink-light/50 dark:text-ink-dark/50">{data.counts[g.key]}</span>
                </p>
                {data.groups[g.key].length === 0 ? (
                  <p className="text-xs text-ink-light/45 dark:text-ink-dark/45">Nobody.</p>
                ) : (
                  <ul className="max-h-64 space-y-1.5 overflow-y-auto pr-1 text-sm">
                    {data.groups[g.key].slice(0, 100).map((p) => (
                      <li key={p.userId} className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate">
                          {p.name}
                          <span className="ml-2 text-xs text-ink-light/40 dark:text-ink-dark/40">{p.department || ''}</span>
                        </span>
                        {p.proficiency && (
                          <span className="flex-shrink-0 text-xs capitalize text-ink-light/55 dark:text-ink-dark/55">
                            {p.proficiency}
                            {p.yearsExperience ? ` · ${Number(p.yearsExperience)} yrs` : ''}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ one person
function PersonView({ person }) {
  const steps = [
    { key: 'personal', label: 'Personal information' },
    { key: 'skills', label: 'Skills' },
    { key: 'certifications', label: 'Certifications' },
  ];
  return (
    <div className="space-y-4">
      <div className="card card-skills">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold">{person.name}</h3>
            <p className="text-sm text-ink-light/60 dark:text-ink-dark/60">
              {[person.jobTitle, person.department].filter(Boolean).join(' · ') || 'No role recorded'}
            </p>
            <p className="text-xs text-ink-light/45 dark:text-ink-dark/45">
              {person.email}
              {person.managerName ? ` · Reports to ${person.managerName}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {person.inactive && <Badge tone="danger">Deactivated</Badge>}
            {person.setup &&
              steps.map((s) => (
                <Badge key={s.key} tone={person.setup[s.key] ? 'success' : 'warning'}>
                  {person.setup[s.key] ? '✓' : '○'} {s.label}
                </Badge>
              ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="Skills">
          <SkillsList skills={person.skills} />
        </Section>
        <Section title="Certifications">
          <CertsList certs={person.certifications} />
        </Section>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ the dashboard
export default function SkillsDashboardPanel() {
  const [scope, setScope] = useState('all');
  const [teamOf, setTeamOf] = useState('me');
  const [department, setDepartment] = useState('');
  const [person, setPerson] = useState(null);
  const [managers, setManagers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openSkill, setOpenSkill] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('trained_desc');

  useEffect(() => {
    analyticsService.listDashboardManagers().then(setManagers).catch(() => setManagers([]));
    catalogService.listDepartments().then((d) => setDepartments(d.map((x) => x.name))).catch(() => setDepartments([]));
  }, []);

  const params = useMemo(
    () => ({
      scope,
      department: scope === 'person' ? '' : department,
      managerId: scope === 'team' && teamOf !== 'me' ? teamOf : undefined,
      userId: scope === 'person' ? person?.id : undefined,
    }),
    [scope, department, teamOf, person]
  );
  const ready = scope !== 'person' || !!person;

  useEffect(() => {
    setOpenSkill(null);
    if (!ready) {
      setData(null);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    analyticsService
      .getSkillsDashboard(params)
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(err.response?.data?.message || 'Could not load the dashboard.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [params, ready]);

  const visibleSkills = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    const list = data.skills.filter((s) => (!category || s.category === category) && (!q || s.name.toLowerCase().includes(q)));
    const sorters = {
      trained_desc: (a, b) => b.trained - a.trained || a.name.localeCompare(b.name),
      trained_asc: (a, b) => a.trained - b.trained || a.name.localeCompare(b.name),
      name: (a, b) => a.name.localeCompare(b.name),
      shortfall: (a, b) => (b.gap ?? -Infinity) - (a.gap ?? -Infinity) || a.name.localeCompare(b.name),
    };
    return [...list].sort(sorters[sort]);
  }, [data, search, category, sort]);

  const scopeButton = (value, label) => (
    <button
      key={value}
      onClick={() => setScope(value)}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        scope === value
          ? 'bg-primary-600 text-white'
          : 'bg-primary-50 text-primary-800 hover:bg-primary-100 dark:bg-primary-900/40 dark:text-primary-100'
      }`}
    >
      {label}
    </button>
  );

  const showSkillCoverage = data && !data.person && !openSkill;

  return (
    <div className="space-y-4">
      {/* ----- who is in view ----- */}
      <div className="card card-skills">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-medium uppercase tracking-wide text-ink-light/50 dark:text-ink-dark/50">Looking at</span>
          {scopeButton('all', 'Everyone')}
          {scopeButton('team', 'A team')}
          {scopeButton('person', 'One person')}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {scope === 'team' && (
            <select className="input !w-auto" aria-label="Team of" value={teamOf} onChange={(e) => setTeamOf(e.target.value)}>
              <option value="me">My team</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}'s team ({m.teamSize})
                </option>
              ))}
            </select>
          )}
          {scope !== 'person' && (
            <select
              className="input !w-auto"
              aria-label="Department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}
          {scope === 'person' &&
            (person ? (
              <span className="flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1.5 text-sm dark:bg-primary-900/40">
                {person.name}
                <button aria-label="Choose someone else" onClick={() => setPerson(null)} className="text-ink-light/50 hover:text-danger">
                  <X size={14} />
                </button>
              </span>
            ) : (
              <PersonSearch onPick={setPerson} />
            ))}
          {data && scope !== 'person' && (
            <span className="text-xs text-ink-light/50 dark:text-ink-dark/50">
              {data.employees} {data.employees === 1 ? 'person' : 'people'} in view
            </span>
          )}
        </div>
      </div>

      {!ready && <Empty>Search for a person above to see their skills and certifications.</Empty>}
      {ready && loading && (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}
      {ready && error && <p className="rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

      {ready && !loading && !error && data?.person && <PersonView person={data.person} />}

      {ready && !loading && !error && data && !data.person && openSkill && (
        <SkillPeopleView skill={openSkill} params={params} onBack={() => setOpenSkill(null)} />
      )}

      {ready && !loading && !error && showSkillCoverage && (
        <>
          {/* ----- headline numbers ----- */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile icon={Users2} label="People in view" value={data.employees} hint={`${data.completeness.fullyComplete} with a complete profile`} />
            <Tile icon={CheckCircle2} label="Trained skill entries" value={data.totals.trained} />
            <Tile icon={GraduationCap} label="In training now" value={data.totals.inTraining} hint={`${data.totals.notTrained} marked not trained`} />
            <Tile
              icon={AlertTriangle}
              tone={data.certifications.expired > 0 ? 'danger' : undefined}
              label="Certifications to renew"
              value={data.certifications.expired + data.certifications.expiring90}
              hint={`${data.certifications.expired} expired · ${data.certifications.expiring30} within 30 days`}
            />
          </div>

          {/* ----- ahead / lacking ----- */}
          {data.hasTargets && data.targetsApply ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Section title="Where we're lacking" subtitle="Skills with fewer trained people than the goal set in Settings.">
                {data.lacking.length === 0 ? (
                  <Empty>Every skill with a goal has enough trained people.</Empty>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {data.lacking.map((s) => (
                      <li key={s.key} className="flex items-center justify-between gap-2">
                        <button className="truncate text-left hover:underline" onClick={() => setOpenSkill(s)}>
                          {s.name}
                        </button>
                        <span className="flex flex-shrink-0 items-center gap-2">
                          <TrendingDown size={14} className="text-warning" />
                          <span className="data-mono text-xs">{s.trained}/{s.target}</span>
                          <Badge tone="warning">{s.gap} short</Badge>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
              <Section title="Where we're ahead" subtitle="Skills with more trained people than the goal.">
                {data.ahead.length === 0 ? (
                  <Empty>No skill is above its goal yet.</Empty>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {data.ahead.map((s) => (
                      <li key={s.key} className="flex items-center justify-between gap-2">
                        <button className="truncate text-left hover:underline" onClick={() => setOpenSkill(s)}>
                          {s.name}
                        </button>
                        <span className="flex flex-shrink-0 items-center gap-2">
                          <TrendingUp size={14} className="text-success" />
                          <span className="data-mono text-xs">{s.trained}/{s.target}</span>
                          <Badge tone="success">+{Math.abs(s.gap)}</Badge>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Section
                title="Least covered skills"
                subtitle={
                  data.targetsApply
                    ? 'Set a goal per skill in Settings > Skill list to see where you are ahead or lacking.'
                    : 'Goals apply to the whole company. Switch to Everyone to compare against them.'
                }
              >
                <ul className="space-y-2 text-sm">
                  {data.leastCovered.map((s) => (
                    <li key={s.key} className="flex items-center justify-between gap-2">
                      <button className="truncate text-left hover:underline" onClick={() => setOpenSkill(s)}>
                        {s.name}
                      </button>
                      <span className="data-mono flex-shrink-0 text-xs">{s.trained} trained</span>
                    </li>
                  ))}
                </ul>
              </Section>
              <Section title="Best covered skills" subtitle="Where the most people are trained.">
                {data.mostCovered.length === 0 ? (
                  <Empty>Nobody is trained on a listed skill yet.</Empty>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {data.mostCovered.map((s) => (
                      <li key={s.key} className="flex items-center justify-between gap-2">
                        <button className="truncate text-left hover:underline" onClick={() => setOpenSkill(s)}>
                          {s.name}
                        </button>
                        <span className="data-mono flex-shrink-0 text-xs">{s.trained} trained</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </div>
          )}

          {/* ----- coverage per skill ----- */}
          <Section title="Skill coverage" subtitle="Click a skill to see who is trained, in training, not trained or hasn't filled it in.">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <input
                className="input !w-auto min-w-[12rem] flex-1"
                placeholder="Find a skill…"
                aria-label="Find a skill"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select className="input !w-auto" aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">All categories</option>
                {Object.entries(CATEGORY_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <select className="input !w-auto" aria-label="Sort skills" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="trained_desc">Most trained first</option>
                <option value="trained_asc">Least trained first</option>
                <option value="name">A to Z</option>
                {data.targetsApply && <option value="shortfall">Biggest shortfall first</option>}
              </select>
            </div>

            <div className="mb-3 flex flex-wrap gap-4">
              {SEGMENTS.map((s) => (
                <span key={s.key} className="flex items-center gap-1.5 text-xs text-ink-light/60 dark:text-ink-dark/60">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
              ))}
            </div>

            {visibleSkills.length === 0 ? (
              <Empty>No skills match.</Empty>
            ) : (
              <div className="space-y-2">
                {visibleSkills.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setOpenSkill(s)}
                    className="flex w-full flex-col gap-2 rounded-xl border border-primary-50 p-3 text-left transition-all hover:border-primary-200 hover:bg-primary-50/40 dark:border-primary-900/50 dark:hover:bg-primary-900/20"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{s.name}</span>
                        <Badge tone="primary">{CATEGORY_LABEL[s.category] || s.category}</Badge>
                        {s.isCustom && <Badge tone="neutral">Added by employees</Badge>}
                        {s.inactive && <Badge tone="neutral">Hidden from list</Badge>}
                        <TargetBadge item={s} />
                      </div>
                      <span className="data-mono text-xs text-ink-light/55 dark:text-ink-dark/55">
                        {s.trained} trained · {s.inTraining} in training · {s.notTrained} not trained · {s.notRated} not filled in
                      </span>
                    </div>
                    <StackedBar item={s} />
                  </button>
                ))}
              </div>
            )}
          </Section>

          {/* ----- people to act on ----- */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Section
              title="Who to push for training"
              subtitle={
                data.pushList.basis === 'target'
                  ? 'People who said they are not trained on a skill the company is short on.'
                  : 'People who said they are not trained, most skills first. Set goals in Settings > Skill list to focus on skills the company is short on.'
              }
            >
              {data.pushList.people.length === 0 ? (
                <Empty>
                  {data.pushList.basis === 'target'
                    ? 'Nobody has marked themselves not trained on a skill that is short. People who have not filled in their skills are listed below.'
                    : 'Nobody has marked themselves not trained yet.'}
                </Empty>
              ) : (
                <ul className="max-h-80 space-y-3 overflow-y-auto pr-1 text-sm">
                  {data.pushList.people.map((p) => (
                    <li key={p.userId}>
                      <p className="font-medium">
                        {p.name}
                        <span className="ml-2 text-xs font-normal text-ink-light/45 dark:text-ink-dark/45">
                          {[p.jobTitle, p.department].filter(Boolean).join(' · ')}
                        </span>
                      </p>
                      <p className="mt-1 flex flex-wrap gap-1.5">
                        {p.skills.map((name) => (
                          <Badge key={name} tone="neutral">{name}</Badge>
                        ))}
                        {p.skillCount > p.skills.length && <span className="text-xs text-ink-light/45">+{p.skillCount - p.skills.length} more</span>}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title={`In training now (${data.inTraining.total})`} subtitle="People currently learning a skill.">
              {data.inTraining.items.length === 0 ? (
                <Empty>Nobody has marked a skill as in training.</Empty>
              ) : (
                <ul className="max-h-80 space-y-2 overflow-y-auto pr-1 text-sm">
                  {data.inTraining.items.map((i, idx) => (
                    <li key={`${i.userId}-${i.skill}-${idx}`} className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate">
                        {i.name} <span className="text-ink-light/45 dark:text-ink-dark/45">· {i.skill}</span>
                      </span>
                      <span className="flex-shrink-0 text-xs text-ink-light/45 dark:text-ink-dark/45">since {formatDate(i.since)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Section
              title={`Profiles to complete (${data.incomplete.total})`}
              subtitle={`${data.noSkillsYet.total} ${data.noSkillsYet.total === 1 ? 'person has' : 'people have'} not filled in any skills yet.`}
            >
              {data.incomplete.people.length === 0 ? (
                <Empty>Everyone in view has completed their profile.</Empty>
              ) : (
                <ul className="max-h-80 space-y-2 overflow-y-auto pr-1 text-sm">
                  {data.incomplete.people.map((p) => (
                    <li key={p.userId} className="flex flex-wrap items-center justify-between gap-2">
                      <span>{p.name}</span>
                      <span className="flex flex-wrap gap-1.5">
                        {p.missing.map((m) => (
                          <Badge key={m} tone="warning">{m}</Badge>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section
              title="Certifications needing attention"
              subtitle={`${data.certifications.total} certifications in view · expired or expiring within 90 days:`}
            >
              {data.certifications.attention.length === 0 ? (
                <Empty>Nothing is expired or about to expire.</Empty>
              ) : (
                <ul className="max-h-80 space-y-2 overflow-y-auto pr-1 text-sm">
                  {data.certifications.attention.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate">
                        {c.person} <span className="text-ink-light/45 dark:text-ink-dark/45">· {c.name}</span>
                      </span>
                      <Badge tone={c.state === 'expired' || c.daysLeft <= 30 ? 'danger' : 'warning'}>
                        {c.state === 'expired' ? `Expired ${formatDate(c.expiryDate)}` : `${c.daysLeft} days · ${formatDate(c.expiryDate)}`}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </>
      )}
    </div>
  );
}
