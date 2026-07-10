import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Users, Sparkles, Award, AlertCircle } from 'lucide-react';
import { usePageTitle } from '../context/PageTitleContext';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../utils/roles';
import * as userService from '../services/userService';
import * as skillService from '../services/skillService';
import * as certificationService from '../services/certificationService';
import * as reviewService from '../services/reviewService';
import FeedbackList from '../components/FeedbackList';
import AiSummaryPanel from '../components/AiSummaryPanel';
import ExportButtons from '../components/ExportButtons';
import Badge from '../components/Badge';

export default function Team() {
  usePageTitle('My Team');
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [cycleId, setCycleId] = useState(null);
  const [feedback, setFeedback] = useState([]);

  useEffect(() => {
    Promise.all([userService.getMyDirectReports(), reviewService.listCycles()])
      .then(([reportList, cycleList]) => {
        setReports(reportList);
        setCycles(cycleList);
        const active = cycleList.find((c) => c.status === 'active');
        setCycleId((active || cycleList[0])?.id || null);
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load team data.'))
      .finally(() => setLoading(false));
  }, []);

  async function selectReport(report) {
    setSelected(report);
    setDetail(null);
    const [skills, certs] = await Promise.all([
      skillService.listSkills(report.id),
      certificationService.listCertifications(report.id),
    ]);
    setDetail({ skills, certs });
    if (cycleId) {
      const fb = await reviewService.listFeedbackForSubject(report.id, cycleId);
      setFeedback(fb);
    }
  }

  // Bug fix: opening a direct report from the global search bar previously
  // landed here without ever opening their detail view.
  useEffect(() => {
    const openId = location.state?.openEmployeeId;
    if (!openId || reports.length === 0) return;
    const match = reports.find((r) => r.id === openId);
    if (match) selectReport(match);
    navigate(location.pathname, { replace: true, state: {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, reports]);

  useEffect(() => {
    if (selected && cycleId) {
      reviewService.listFeedbackForSubject(selected.id, cycleId).then(setFeedback);
    }
  }, [cycleId, selected]);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-300 border-t-primary-700" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
        <AlertCircle size={16} /> {error}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="card card-reviews flex flex-col items-center gap-2 py-12 text-center">
        <Users size={28} className="text-primary-300" />
        <p className="text-sm text-ink-light/50 dark:text-ink-dark/50">You have no direct reports yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
      <div className="card card-reviews h-fit">
        <h3 className="mb-3 font-display text-base font-semibold">Direct reports ({reports.length})</h3>
        <ul className="space-y-1">
          {reports.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => selectReport(r)}
                className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                  selected?.id === r.id
                    ? 'bg-primary-700 text-white'
                    : 'hover:bg-primary-50 dark:hover:bg-primary-900/40'
                }`}
              >
                <p className="font-medium">
                  {r.first_name} {r.last_name}
                </p>
                <p className={`text-xs ${selected?.id === r.id ? 'text-primary-100' : 'text-ink-light/50 dark:text-ink-dark/50'}`}>
                  {r.job_title}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {!selected ? (
        <div className="card card-reviews flex items-center justify-center py-16 text-sm text-ink-light/50 dark:text-ink-dark/50">
          Select a team member to view their details.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card card-reviews flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-semibold">
                {selected.first_name} {selected.last_name}
              </h3>
              <p className="text-sm text-ink-light/60 dark:text-ink-dark/60">
                {selected.job_title} · {selected.department}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select className="input w-48" value={cycleId || ''} onChange={(e) => setCycleId(e.target.value)}>
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ExportButtons userId={selected.id} employeeName={`${selected.first_name}_${selected.last_name}`} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="card card-skills">
              <h4 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold">
                <Sparkles size={15} /> Skills
              </h4>
              {detail?.skills.length ? (
                <ul className="space-y-2">
                  {detail.skills.map((s) => (
                    <li key={s.id} className="flex items-center justify-between text-sm">
                      <span>{s.skill_name}</span>
                      <Badge tone="primary">{s.proficiency}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-light/50 dark:text-ink-dark/50">No skills recorded.</p>
              )}
            </div>

            <div className="card card-certs">
              <h4 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold">
                <Award size={15} /> Certifications
              </h4>
              {detail?.certs.length ? (
                <ul className="space-y-2">
                  {detail.certs.map((c) => (
                    <li key={c.id} className="text-sm">
                      {c.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-light/50 dark:text-ink-dark/50">No certifications recorded.</p>
              )}
            </div>
          </div>

          <div className="card card-reviews">
            <h4 className="mb-3 font-display text-sm font-semibold">Feedback</h4>
            <FeedbackList feedback={feedback} />
          </div>

          <AiSummaryPanel subjectId={selected.id} cycleId={cycleId} canGenerate={user.role === ROLES.MANAGER} />
        </div>
      )}
    </div>
  );
}
