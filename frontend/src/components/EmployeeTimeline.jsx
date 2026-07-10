import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  UserPlus,
  Users,
  Building2,
  Sparkles,
  Award,
  ClipboardCheck,
  ClipboardList,
  KeyRound,
  History,
} from 'lucide-react';
import * as userService from '../services/userService';
import Skeleton from './Skeleton';

const EVENT_ICONS = {
  EMPLOYEE_CREATED: UserPlus,
  SKILL_ADDED: Sparkles,
  CERTIFICATION_ADDED: Award,
  REVIEW_ASSIGNED: ClipboardList,
  REVIEW_SUBMITTED: ClipboardCheck,
  ONE_ON_ONE: History,
  PASSWORD_CHANGED: KeyRound,
};

function iconFor(event) {
  if (EVENT_ICONS[event.type]) return EVENT_ICONS[event.type];
  if (event.description?.toLowerCase().includes('manager')) return Users;
  if (event.description?.toLowerCase().includes('department')) return Building2;
  return History;
}

export default function EmployeeTimeline({ employeeId }) {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    userService
      .getTimeline(employeeId)
      .then(setEvents)
      .catch((err) => setError(err.response?.data?.message || 'Failed to load timeline.'));
  }, [employeeId]);

  if (error) {
    return <p className="text-sm text-danger">{error}</p>;
  }

  if (events === null) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return <p className="py-6 text-center text-sm text-ink-light/50 dark:text-ink-dark/50">No activity recorded yet.</p>;
  }

  return (
    <ol className="relative space-y-5 border-l-2 border-primary-100 pl-6 dark:border-primary-900">
      {events.map((event, i) => {
        const Icon = iconFor(event);
        return (
          <li key={i} className="relative">
            <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200">
              <Icon size={13} />
            </span>
            <p className="text-sm font-medium">{event.description}</p>
            <p className="text-xs text-ink-light/50 dark:text-ink-dark/50">
              {event.actor_name && `${event.actor_name} · `}
              {formatDistanceToNow(new Date(event.occurred_at), { addSuffix: true })}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
