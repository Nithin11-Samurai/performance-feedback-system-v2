/**
 * Server entry point.
 * Boots the HTTP server and schedules background jobs (e.g. review-cycle
 * deadline reminders). Kept minimal — actual app wiring lives in app.js.
 */
const app = require('./app');
const config = require('./config/env');
const logger = require('./utils/logger');
const { pool } = require('./config/db');

const server = app.listen(config.port, () => {
  logger.info(`Server running in ${config.env} mode on port ${config.port}`);
});

// ---------------------------------------------------------------------------
// Background jobs (cron) — wired up in a later step once feedback/review
// models exist. Left as a placeholder import so the structure is visible now.
// ---------------------------------------------------------------------------
const { scheduleReviewCycleReminders } = require('./jobs/reviewCycleReminders');
scheduleReviewCycleReminders();

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
function shutdown(signal) {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await pool.end();
    logger.info('HTTP server and DB pool closed.');
    process.exit(0);
  });

  // Force-exit if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: reason?.message || reason });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  process.exit(1);
});
