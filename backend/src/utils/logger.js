/**
 * Lightweight structured logger.
 * Swappable for Winston/Pino later without touching call sites, since
 * everything imports this module rather than console directly.
 */
const levels = ['error', 'warn', 'info', 'debug'];

function log(level, message, meta = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

const logger = {};
levels.forEach((level) => {
  logger[level] = (message, meta) => log(level, message, meta);
});

module.exports = logger;
