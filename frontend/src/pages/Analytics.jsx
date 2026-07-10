import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { Trophy, Award, AlertCircle, FileDown, FileSpreadsheet } from 'lucide-react';
import { usePageTitle } from '../context/PageTitleContext';
import { useToast } from '../context/ToastContext';
import * as analyticsService from '../services/analyticsService';
import * as exportService from '../services/exportService';
import Badge from '../components/Badge';
import Skeleton from '../components/Skeleton';

const PROFICIENCY_ORDER = ['beginner', 'intermediate', 'advanced', 'expert'];
const PROFICIENCY_TONE = { beginner: 'neutral', intermediate: 'primary', advanced: 'accent', expert: 'success' };

function SectionCard({ title, children, action }) {
  return (
    <div className="card card-reviews">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function Analytics() {
  usePageTitle('Analytics');
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [exportingDept, setExportingDept] = useState(null);

  useEffect(() => {
    analyticsService
      .getAnalyticsOverview()
      .then(setData)
      .catch((err) => setError(err.response?.data?.message || 'Failed to load analytics.'));
  }, []);

  async function handleExportDept(department, type) {
    setExportingDept(department);
    try {
      if (type === 'pdf') await exportService.exportDepartmentPdf(department);
      else await exportService.exportDepartmentExcel(department);
    } catch (err) {
      showToast(err.response?.data?.message || 'Export failed.', 'error');
    } finally {
      setExportingDept(null);
    }
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
        <AlertCircle size={16} /> {error}
      </div>
    );
  }

  const loading = !data;

  // Group skill gap rows by skill for a stacked-by-proficiency bar chart.
  const skillGapChartData = [];
  if (data) {
    const bySkill = {};
    data.skillGapAnalysis.forEach((row) => {
      const key = `${row.category}:${row.skill_name}`;
      if (!bySkill[key]) bySkill[key] = { skill: row.skill_name, beginner: 0, intermediate: 0, advanced: 0, expert: 0 };
      bySkill[key][row.proficiency] = row.employee_count;
    });
    skillGapChartData.push(...Object.values(bySkill));
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-light/60 dark:text-ink-dark/60">
        Organization-wide trends across all review cycles — not just the current one.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Department performance">
          {loading ? (
            <Skeleton className="h-[240px] w-full" />
          ) : data.departmentAnalytics.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-light/50 dark:text-ink-dark/50">
              No rated feedback yet to compare departments.
            </p>
          ) : (
            <div className="space-y-3">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.departmentAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f6c0df" />
                  <XAxis dataKey="department" fontSize={11} />
                  <YAxis domain={[0, 5]} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="avg_rating" name="Avg Rating" fill="#ea6bb3" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="space-y-1">
                {data.departmentAnalytics.map((d) => (
                  <div key={d.department} className="flex items-center justify-between text-xs">
                    <span>
                      {d.department} — {d.employees_reviewed} employee{d.employees_reviewed === 1 ? '' : 's'} reviewed
                    </span>
                    <div className="flex gap-1">
                      <button
                        disabled={exportingDept === d.department}
                        onClick={() => handleExportDept(d.department, 'pdf')}
                        className="rounded p-1 hover:bg-primary-50 dark:hover:bg-primary-900/40"
                        title="Export department PDF"
                      >
                        <FileDown size={13} />
                      </button>
                      <button
                        disabled={exportingDept === d.department}
                        onClick={() => handleExportDept(d.department, 'excel')}
                        className="rounded p-1 hover:bg-primary-50 dark:hover:bg-primary-900/40"
                        title="Export department Excel"
                      >
                        <FileSpreadsheet size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Top performers">
          {loading ? (
            <Skeleton className="h-[240px] w-full" />
          ) : data.topPerformers.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-light/50 dark:text-ink-dark/50">No rated feedback yet.</p>
          ) : (
            <ul className="space-y-3">
              {data.topPerformers.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent-50 text-sm font-semibold text-accent-700 dark:bg-accent-900/40 dark:text-accent-200">
                    {i === 0 ? <Trophy size={15} /> : i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {p.first_name} {p.last_name}
                    </p>
                    <p className="text-xs text-ink-light/50 dark:text-ink-dark/50">
                      {p.job_title} · {p.department}
                    </p>
                  </div>
                  <span className="data-mono text-sm font-semibold text-primary-700 dark:text-primary-300">
                    {p.avg_rating}/5
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Ratings & completion trend across cycles">
        {loading ? (
          <Skeleton className="h-[240px] w-full" />
        ) : data.cycleTrends.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-light/50 dark:text-ink-dark/50">No cycles yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.cycleTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f6c0df" />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis yAxisId="left" domain={[0, 5]} fontSize={12} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} fontSize={12} />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="avg_rating" name="Avg Rating" stroke="#ea6bb3" strokeWidth={2} connectNulls />
              <Line yAxisId="right" type="monotone" dataKey="completion_pct" name="Completion %" stroke="#ed7dbc" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Skill gap analysis">
          {loading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : skillGapChartData.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-light/50 dark:text-ink-dark/50">No skills recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {skillGapChartData.map((s) => {
                const total = PROFICIENCY_ORDER.reduce((sum, p) => sum + (s[p] || 0), 0);
                return (
                  <div key={s.skill}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium">{s.skill}</span>
                      <span className="text-ink-light/50 dark:text-ink-dark/50">{total} employee{total === 1 ? '' : 's'}</span>
                    </div>
                    <div className="flex h-2 overflow-hidden rounded-full bg-primary-50 dark:bg-primary-900/40">
                      {PROFICIENCY_ORDER.map((p) => {
                        const width = total > 0 ? ((s[p] || 0) / total) * 100 : 0;
                        const colors = { beginner: '#f6c0df', intermediate: '#ed7dbc', advanced: '#ea6bb3', expert: '#e02891' };
                        return width > 0 ? (
                          <div key={p} style={{ width: `${width}%`, backgroundColor: colors[p] }} title={`${p}: ${s[p]}`} />
                        ) : null;
                      })}
                    </div>
                  </div>
                );
              })}
              <div className="flex flex-wrap gap-2 pt-2">
                {PROFICIENCY_ORDER.map((p) => (
                  <Badge key={p} tone={PROFICIENCY_TONE[p]}>
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Certification statistics">
          {loading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md bg-primary-50/50 p-3 text-center dark:bg-primary-900/20">
                  <p className="data-mono text-xl font-semibold">{data.certificationStats.totalCertifications}</p>
                  <p className="text-xs text-ink-light/50 dark:text-ink-dark/50">Total certifications</p>
                </div>
                <div className="rounded-md bg-accent-50/50 p-3 text-center dark:bg-accent-900/20">
                  <p className="data-mono text-xl font-semibold">{data.certificationStats.expiringWithin90Days}</p>
                  <p className="text-xs text-ink-light/50 dark:text-ink-dark/50">Expiring within 90 days</p>
                </div>
              </div>
              {data.certificationStats.topCertifications.length > 0 && (
                <ul className="space-y-2">
                  {data.certificationStats.topCertifications.map((c) => (
                    <li key={c.name} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5">
                        <Award size={13} className="text-accent-500" /> {c.name}
                      </span>
                      <span className="data-mono text-xs text-ink-light/50 dark:text-ink-dark/50">{c.holder_count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
