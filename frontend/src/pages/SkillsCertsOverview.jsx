import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, FileSpreadsheet, Award, Sparkles, ExternalLink, TrendingUp, Users2, AlertTriangle } from 'lucide-react';
import { usePageTitle } from '../context/PageTitleContext';
import { useToast } from '../context/ToastContext';
import * as analyticsService from '../services/analyticsService';
import Skeleton from '../components/Skeleton';
import Badge from '../components/Badge';

const PROFICIENCY_ORDER = ['beginner', 'intermediate', 'advanced', 'expert'];
const PROFICIENCY_COLORS = { beginner: '#f6c0df', intermediate: '#ed7dbc', advanced: '#ea6bb3', expert: '#e02891' };
const PROFICIENCY_LABELS = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', expert: 'Expert' };

export default function SkillsCertsOverview() {
  usePageTitle('Skills and Certifications');
  const [tab, setTab] = useState('skills');

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setTab('skills')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${tab === 'skills' ? 'bg-primary-600 text-white' : 'bg-primary-50 text-primary-800 dark:bg-primary-900/40 dark:text-primary-100'}`}
        >
          Skills
        </button>
        <button
          onClick={() => setTab('certifications')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${tab === 'certifications' ? 'bg-primary-600 text-white' : 'bg-primary-50 text-primary-800 dark:bg-primary-900/40 dark:text-primary-100'}`}
        >
          Certifications
        </button>
      </div>

      {tab === 'skills' ? <SkillsOverviewPanel /> : <CertificationsOverviewPanel />}
    </div>
  );
}

function StatTile({ icon: Icon, label, value }) {
  return (
    <div className="card card-skills flex items-center gap-3 !p-4">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/60 dark:text-primary-100">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-lg font-semibold leading-5">{value}</p>
        <p className="text-xs text-ink-light/55 dark:text-ink-dark/55">{label}</p>
      </div>
    </div>
  );
}

function SkillsOverviewPanel() {
  const { showToast } = useToast();
  const [skills, setSkills] = useState(null);
  const [selected, setSelected] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    analyticsService.getSkillsOverview().then(setSkills);
  }, []);

  const stats = useMemo(() => {
    if (!skills || skills.length === 0) return null;
    const totalHoldings = skills.reduce((sum, s) => sum + s.total, 0);
    const topSkill = [...skills].sort((a, b) => b.total - a.total)[0];
    return { uniqueSkills: skills.length, totalHoldings, topSkill };
  }, [skills]);

  async function handleExportAll() {
    setExporting(true);
    try {
      await analyticsService.exportSkillsOverviewExcel();
    } catch (err) {
      showToast(err.response?.data?.message || 'Export failed.', 'error');
    } finally {
      setExporting(false);
    }
  }

  if (selected) {
    return <SkillEmployeesDrilldown skill={selected} onBack={() => setSelected(null)} />;
  }

  const maxTotal = skills?.length ? Math.max(...skills.map((s) => s.total)) : 0;

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile icon={Sparkles} label="Distinct skills tracked" value={stats.uniqueSkills} />
          <StatTile icon={Users2} label="Total skill entries" value={stats.totalHoldings} />
          <StatTile icon={TrendingUp} label="Most common skill" value={stats.topSkill.skillName} />
        </div>
      )}

      <div className="card card-skills">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold">
            <Sparkles size={16} /> Skills Overview
          </h3>
          <button className="btn-secondary text-xs" disabled={exporting} onClick={handleExportAll}>
            <FileSpreadsheet size={14} /> Export all to Excel
          </button>
        </div>

        {skills === null ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : skills.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-light/50 dark:text-ink-dark/50">No skills recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {[...skills].sort((a, b) => b.total - a.total).map((s, i) => (
              <button
                key={`${s.category}-${s.skillName}`}
                onClick={() => setSelected(s)}
                className="group flex w-full flex-col gap-3 rounded-xl border border-primary-50 p-4 text-left transition-all hover:border-primary-200 hover:bg-primary-50/40 hover:shadow-sm dark:border-primary-900/50 dark:hover:bg-primary-900/20"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-display text-base font-semibold">{s.skillName}</span>
                    <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium capitalize text-primary-700 dark:bg-primary-900/50 dark:text-primary-200">
                      {s.category}
                    </span>
                    {i === 0 && (
                      <span className="flex items-center gap-1 rounded-full bg-accent-100 px-2 py-0.5 text-xs font-medium text-accent-800 dark:bg-accent-900/40 dark:text-accent-100">
                        <TrendingUp size={11} /> Most common
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="data-mono text-xl font-semibold leading-5 text-primary-700 dark:text-primary-300">
                      {s.total}
                    </p>
                    <p className="text-[11px] text-ink-light/45 dark:text-ink-dark/45">employee{s.total === 1 ? '' : 's'}</p>
                  </div>
                </div>

                <div className="flex h-2.5 overflow-hidden rounded-full bg-primary-50 dark:bg-primary-900/40">
                  {PROFICIENCY_ORDER.map((p) => {
                    const width = s.total > 0 ? (s.byProficiency[p] / s.total) * 100 : 0;
                    return width > 0 ? (
                      <div
                        key={p}
                        style={{ width: `${width}%`, backgroundColor: PROFICIENCY_COLORS[p] }}
                        className="transition-all"
                      />
                    ) : null;
                  })}
                </div>

                <div className="flex flex-wrap gap-3">
                  {PROFICIENCY_ORDER.filter((p) => s.byProficiency[p] > 0).map((p) => (
                    <span key={p} className="flex items-center gap-1.5 text-xs text-ink-light/60 dark:text-ink-dark/60">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PROFICIENCY_COLORS[p] }} />
                      {PROFICIENCY_LABELS[p]}: <span className="font-medium">{s.byProficiency[p]}</span>
                    </span>
                  ))}
                </div>

                {/* Bar chart, relative to the most-held skill, gives visual sense of scale across the whole list */}
                <div className="h-1 overflow-hidden rounded-full bg-primary-50/60 dark:bg-primary-900/30">
                  <div
                    className="h-full rounded-full bg-primary-200 transition-all dark:bg-primary-800"
                    style={{ width: `${maxTotal > 0 ? (s.total / maxTotal) * 100 : 0}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SkillEmployeesDrilldown({ skill, onBack }) {
  const { showToast } = useToast();
  const [employees, setEmployees] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    analyticsService.getEmployeesForSkill(skill.category, skill.skillName).then(setEmployees);
  }, [skill]);

  async function handleExport() {
    setExporting(true);
    try {
      await analyticsService.exportSkillEmployeesExcel(skill.category, skill.skillName);
    } catch (err) {
      showToast(err.response?.data?.message || 'Export failed.', 'error');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-ink-light/60 hover:underline dark:text-ink-dark/60">
        <ChevronLeft size={15} /> All skills
      </button>
      <div className="card card-skills">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">
            {skill.skillName} <span className="text-sm font-normal capitalize text-ink-light/40 dark:text-ink-dark/40">({skill.category})</span>
          </h3>
          <button className="btn-secondary text-xs" disabled={exporting} onClick={handleExport}>
            <FileSpreadsheet size={14} /> Export to Excel
          </button>
        </div>
        {employees === null ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-primary-100 text-xs uppercase tracking-wide text-ink-light/50 dark:border-primary-900 dark:text-ink-dark/50">
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Job Title</th>
                <th className="py-2 pr-3">Department</th>
                <th className="py-2 pr-3">Proficiency</th>
                <th className="py-2 pr-3">Years</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id} className="border-b border-primary-50 dark:border-primary-900/50">
                  <td className="py-2 pr-3">{e.first_name} {e.last_name}</td>
                  <td className="py-2 pr-3">{e.job_title || 'N/A'}</td>
                  <td className="py-2 pr-3">{e.department || 'N/A'}</td>
                  <td className="py-2 pr-3 capitalize">{e.proficiency}</td>
                  <td className="py-2 pr-3">{e.years_experience || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function CertificationsOverviewPanel() {
  const { showToast } = useToast();
  const [certifications, setCertifications] = useState(null);
  const [selected, setSelected] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    analyticsService.getCertificationsOverview().then(setCertifications);
  }, []);

  const stats = useMemo(() => {
    if (!certifications || certifications.length === 0) return null;
    const totalHolders = certifications.reduce((sum, c) => sum + c.holder_count, 0);
    const totalExpired = certifications.reduce((sum, c) => sum + (c.expired_count || 0), 0);
    return { uniqueCerts: certifications.length, totalHolders, totalExpired };
  }, [certifications]);

  async function handleExportAll() {
    setExporting(true);
    try {
      await analyticsService.exportCertificationsOverviewExcel();
    } catch (err) {
      showToast(err.response?.data?.message || 'Export failed.', 'error');
    } finally {
      setExporting(false);
    }
  }

  if (selected) {
    return <CertificationEmployeesDrilldown certification={selected} onBack={() => setSelected(null)} />;
  }

  const maxHolders = certifications?.length ? Math.max(...certifications.map((c) => c.holder_count)) : 0;

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile icon={Award} label="Distinct certifications" value={stats.uniqueCerts} />
          <StatTile icon={Users2} label="Total certifications held" value={stats.totalHolders} />
          <StatTile icon={AlertTriangle} label="Expired certifications" value={stats.totalExpired} />
        </div>
      )}

      <div className="card card-certs">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold">
            <Award size={16} /> Certifications Overview
          </h3>
          <button className="btn-secondary text-xs" disabled={exporting} onClick={handleExportAll}>
            <FileSpreadsheet size={14} /> Export all to Excel
          </button>
        </div>

        {certifications === null ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : certifications.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-light/50 dark:text-ink-dark/50">No certifications recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {[...certifications].sort((a, b) => b.holder_count - a.holder_count).map((c) => (
              <button
                key={c.name}
                onClick={() => setSelected(c)}
                className="flex w-full flex-col gap-2.5 rounded-xl border border-primary-50 p-4 text-left transition-all hover:border-primary-200 hover:bg-primary-50/40 hover:shadow-sm dark:border-primary-900/50 dark:hover:bg-primary-900/20"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-display text-base font-semibold">{c.name}</span>
                  <div className="flex items-center gap-2">
                    {c.expired_count > 0 && <Badge tone="danger">{c.expired_count} expired</Badge>}
                    <span className="data-mono text-lg font-semibold text-primary-700 dark:text-primary-300">
                      {c.holder_count}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-primary-50/60 dark:bg-primary-900/30">
                  <div
                    className="h-full rounded-full bg-primary-500 transition-all"
                    style={{ width: `${maxHolders > 0 ? (c.holder_count / maxHolders) * 100 : 0}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CertificationEmployeesDrilldown({ certification, onBack }) {
  const { showToast } = useToast();
  const [employees, setEmployees] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    analyticsService.getEmployeesForCertification(certification.name).then(setEmployees);
  }, [certification]);

  async function handleExport() {
    setExporting(true);
    try {
      await analyticsService.exportCertificationEmployeesExcel(certification.name);
    } catch (err) {
      showToast(err.response?.data?.message || 'Export failed.', 'error');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-ink-light/60 hover:underline dark:text-ink-dark/60">
        <ChevronLeft size={15} /> All certifications
      </button>
      <div className="card card-certs">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">{certification.name}</h3>
          <button className="btn-secondary text-xs" disabled={exporting} onClick={handleExport}>
            <FileSpreadsheet size={14} /> Export to Excel
          </button>
        </div>
        {employees === null ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-primary-100 text-xs uppercase tracking-wide text-ink-light/50 dark:border-primary-900 dark:text-ink-dark/50">
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Department</th>
                <th className="py-2 pr-3">Issued</th>
                <th className="py-2 pr-3">Expires</th>
                <th className="py-2 pr-3">Credential</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id} className="border-b border-primary-50 dark:border-primary-900/50">
                  <td className="py-2 pr-3">{e.first_name} {e.last_name}</td>
                  <td className="py-2 pr-3">{e.department || 'N/A'}</td>
                  <td className="py-2 pr-3">{e.issue_date ? new Date(e.issue_date).toLocaleDateString() : 'N/A'}</td>
                  <td className="py-2 pr-3">{e.expiry_date ? new Date(e.expiry_date).toLocaleDateString() : 'N/A'}</td>
                  <td className="py-2 pr-3">
                    {e.credential_url ? (
                      <a href={e.credential_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary-600 hover:underline dark:text-primary-300">
                        View <ExternalLink size={12} />
                      </a>
                    ) : (
                      e.credential_id || 'N/A'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
