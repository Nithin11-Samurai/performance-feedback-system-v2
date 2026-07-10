import { useEffect, useState } from 'react';
import { ChevronLeft, FileSpreadsheet, Award, Sparkles, ExternalLink } from 'lucide-react';
import { usePageTitle } from '../context/PageTitleContext';
import { useToast } from '../context/ToastContext';
import * as analyticsService from '../services/analyticsService';
import Skeleton from '../components/Skeleton';
import Badge from '../components/Badge';

const PROFICIENCY_ORDER = ['beginner', 'intermediate', 'advanced', 'expert'];
const PROFICIENCY_COLORS = { beginner: '#f6c0df', intermediate: '#ed7dbc', advanced: '#ea6bb3', expert: '#e02891' };

export default function SkillsCertsOverview() {
  usePageTitle('Skills and Certifications');
  const [tab, setTab] = useState('skills');

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setTab('skills')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab === 'skills' ? 'bg-primary-600 text-white' : 'bg-primary-50 text-primary-800 dark:bg-primary-900/40 dark:text-primary-100'}`}
        >
          Skills
        </button>
        <button
          onClick={() => setTab('certifications')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${tab === 'certifications' ? 'bg-primary-600 text-white' : 'bg-primary-50 text-primary-800 dark:bg-primary-900/40 dark:text-primary-100'}`}
        >
          Certifications
        </button>
      </div>

      {tab === 'skills' ? <SkillsOverviewPanel /> : <CertificationsOverviewPanel />}
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

  return (
    <div className="card card-skills">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-base font-semibold">
          <Sparkles size={16} /> Skills Overview
        </h3>
        <button className="btn-secondary text-xs" disabled={exporting} onClick={handleExportAll}>
          <FileSpreadsheet size={14} /> Export all to Excel
        </button>
      </div>

      {skills === null ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : skills.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-light/50 dark:text-ink-dark/50">No skills recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {skills.map((s) => (
            <button
              key={`${s.category}-${s.skillName}`}
              onClick={() => setSelected(s)}
              className="flex w-full flex-col gap-2 rounded-md border border-primary-50 p-3 text-left hover:bg-primary-50/50 dark:border-primary-900/50 dark:hover:bg-primary-900/20"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {s.skillName} <span className="text-xs font-normal capitalize text-ink-light/40 dark:text-ink-dark/40">({s.category})</span>
                </span>
                <span className="data-mono text-sm font-semibold text-primary-700 dark:text-primary-300">{s.total}</span>
              </div>
              <div className="flex h-2 overflow-hidden rounded-full bg-primary-50 dark:bg-primary-900/40">
                {PROFICIENCY_ORDER.map((p) => {
                  const width = s.total > 0 ? (s.byProficiency[p] / s.total) * 100 : 0;
                  return width > 0 ? <div key={p} style={{ width: `${width}%`, backgroundColor: PROFICIENCY_COLORS[p] }} /> : null;
                })}
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-ink-light/50 dark:text-ink-dark/50">
                {PROFICIENCY_ORDER.filter((p) => s.byProficiency[p] > 0).map((p) => (
                  <span key={p}>
                    {p}: {s.byProficiency[p]}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}
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

  return (
    <div className="card card-certs">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-base font-semibold">
          <Award size={16} /> Certifications Overview
        </h3>
        <button className="btn-secondary text-xs" disabled={exporting} onClick={handleExportAll}>
          <FileSpreadsheet size={14} /> Export all to Excel
        </button>
      </div>

      {certifications === null ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : certifications.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-light/50 dark:text-ink-dark/50">No certifications recorded yet.</p>
      ) : (
        <ul className="space-y-1">
          {certifications.map((c) => (
            <li key={c.name}>
              <button
                onClick={() => setSelected(c)}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-primary-50 dark:hover:bg-primary-900/40"
              >
                <span>{c.name}</span>
                <span className="flex items-center gap-2">
                  {c.expired_count > 0 && <Badge tone="danger">{c.expired_count} expired</Badge>}
                  <span className="data-mono font-semibold text-primary-700 dark:text-primary-300">{c.holder_count}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
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
