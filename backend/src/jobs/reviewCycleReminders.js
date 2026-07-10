/**
 * Review cycle reminder job (Phase 6).
 * Runs daily. For each active cycle closing within 3 days, finds every
 * PENDING feedback row and reminds its reviewer (in-app + email) — so
 * managers/employees/peers don't miss the deadline. Uses the existing
 * notificationService, so delivery behavior (graceful no-op without SMTP
 * configured) is identical to every other notification in the app.
 */
const cron = require('node-cron');
const { query } = require('../config/db');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

const EMAIL_TYPE = 'cycle_closing_reminder';

async function alreadyReminded(userId, cycleId) {
  const result = await query(
    'SELECT id FROM email_log WHERE user_id = $1 AND email_type = $2 AND reference_id = $3',
    [userId, EMAIL_TYPE, cycleId]
  );
  return result.rows.length > 0;
}

async function markReminded(userId, cycleId) {
  await query('INSERT INTO email_log (user_id, email_type, reference_id) VALUES ($1, $2, $3)', [
    userId,
    EMAIL_TYPE,
    cycleId,
  ]);
}

async function sendRemindersForClosingCycles() {
  const cyclesResult = await query(
    `SELECT id, name, end_date FROM review_cycles
     WHERE status = 'active' AND end_date BETWEEN NOW() AND NOW() + INTERVAL '3 days'`
  );

  for (const cycle of cyclesResult.rows) {
    const pendingResult = await query(
      `SELECT DISTINCT f.reviewer_id, u.email, u.first_name
       FROM feedback f
       JOIN users u ON u.id = f.reviewer_id
       WHERE f.review_cycle_id = $1 AND f.status = 'pending' AND u.is_active = TRUE`,
      [cycle.id]
    );

    let sentCount = 0;
    for (const r of pendingResult.rows) {
      // Dedup: each person gets ONE reminder per cycle, not a fresh one
      // every day the job runs while still inside the 3-day window.
      if (await alreadyReminded(r.reviewer_id, cycle.id)) continue;

      await notificationService.notifyUser({
        userId: r.reviewer_id,
        type: 'cycle_closing_soon',
        title: `Reminder: "${cycle.name}" closes soon`,
        message: `You have feedback still pending in the "${cycle.name}" review cycle, which closes ${new Date(
          cycle.end_date
        ).toLocaleDateString()}. Please submit before then.`,
        link: `/reviews`,
        email: r.email,
        recipientName: r.first_name,
        fields: { 'Review Type': 'Pending feedback', 'Due Date': new Date(cycle.end_date).toLocaleDateString() },
      });
      await markReminded(r.reviewer_id, cycle.id);
      sentCount += 1;
    }

    if (sentCount > 0) {
      logger.info('Sent review cycle reminders', { cycle: cycle.name, count: sentCount });
    }
  }
}

/**
 * Schedules the daily reminder check. Called once from server.js at boot.
 * Runs at 9am server time every day; also exported directly so it can be
 * invoked on-demand (e.g. for testing) without waiting for the cron tick.
 */
function scheduleReviewCycleReminders() {
  cron.schedule('0 9 * * *', () => {
    sendRemindersForClosingCycles().catch((err) => {
      logger.error('Review cycle reminder job failed', { error: err.message });
    });
  });
  logger.info('Review cycle reminder job scheduled (daily at 09:00).');
}

module.exports = { scheduleReviewCycleReminders, sendRemindersForClosingCycles };
