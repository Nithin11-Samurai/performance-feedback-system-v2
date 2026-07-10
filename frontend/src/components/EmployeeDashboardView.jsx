import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Sparkles, Award, ClipboardList, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import * as dashboardService from '../services/dashboardService';
import * as skillService from '../services/skillService';
import * as certificationService from '../services/certificationService';
import StatCard from './StatCard';
import NotificationsWidget from './NotificationsWidget';

function SectionCard({ title, children }) {
  return (
    <div className="card card-reviews">
      <h3 className="mb-4 font-display text-base font-semibold">{title}</h3>
      {children}
    </div>
  );
}

export default function EmployeeDashboardView() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [skillsCount, setSkillsCount] = useState(0);
  const [certsCount, setCertsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      dashboardService.getMyDashboardSummary(),
      skillService.listSkills(user.id),
      certificationService.listCertifications(user.id),
    ])
      .then(([summaryData, skills, certs]) => {
        if (cancelled) return;
        setSummary(summaryData);
        setSkillsCount(skills.length);
        setCertsCount(certs.length);
      })
      .catch((err) => !cancelled && setError(err.response?.data?.message || 'Failed to load dashboard data.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
        <AlertCircle size={16} /> {error}
      </div>
    );
  }

  const ratingHistory = summary?.ratingHistory || [];
  const activeCycle = summary?.targetCycle?.status === 'active' ? summary.targetCycle : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard loading={loading} icon={Sparkles} label="Skills on file" value={skillsCount} variant="skills" />
        <StatCard loading={loading} icon={Award} label="Certifications" value={certsCount} variant="certs" />
        <StatCard
          loading={loading}
          icon={ClipboardList}
          label="Active review cycle"
          value={activeCycle ? activeCycle.name : 'None'}
          variant="reviews"
        />
      </div>

      <SectionCard title="My rating trend over time">
        {loading ? (
          <div className="skeleton h-[220px] w-full" />
        ) : ratingHistory.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-light/50 dark:text-ink-dark/50">
            No rated feedback yet — once managers or peers submit ratings across review cycles, your trend will appear here.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={ratingHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f6c0df" />
              <XAxis dataKey="cycle_name" fontSize={11} />
              <YAxis domain={[0, 5]} fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="avg_rating" stroke="#ea6bb3" strokeWidth={2} dot={{ fill: '#ea6bb3' }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      <NotificationsWidget />
    </div>
  );
}
