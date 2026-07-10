import { Component } from 'react';
import { AlertOctagon } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // In a production app this would report to an error-tracking service.
    // eslint-disable-next-line no-console
    console.error('Unhandled UI error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper-light px-4 text-center dark:bg-paper-dark">
          <AlertOctagon size={40} className="text-danger" />
          <h1 className="font-display text-2xl font-semibold">Something went wrong</h1>
          <p className="max-w-sm text-sm text-ink-light/60 dark:text-ink-dark/60">
            An unexpected error occurred. Try reloading the page — if this keeps happening, contact your HR admin.
          </p>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
