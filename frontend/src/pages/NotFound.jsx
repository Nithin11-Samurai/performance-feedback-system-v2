import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper-light px-4 text-center dark:bg-paper-dark">
      <Compass size={40} className="text-primary-400" />
      <h1 className="font-display text-2xl font-semibold">Page not found</h1>
      <p className="text-ink-light/60 dark:text-ink-dark/60">
        The page you're looking for doesn't exist or you don't have access to it.
      </p>
      <Link to="/dashboard" className="btn-primary">
        Back to dashboard
      </Link>
    </div>
  );
}
