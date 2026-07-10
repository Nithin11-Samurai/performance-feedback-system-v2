/**
 * Centralized environment configuration.
 * Every other module should read config from here instead of calling
 * process.env directly — this keeps env access in one auditable place
 * and lets us fail fast if something critical is missing.
 */
require('dotenv').config();

const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];

// In production, missing secrets should crash the app immediately rather
// than silently running with insecure defaults.
if (process.env.NODE_ENV === 'production') {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',

  db: {
    connectionString: process.env.DATABASE_URL || undefined,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'performance_feedback',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev_only_insecure_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_only_insecure_refresh_secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  claude: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    // NOTE (Item 12 fix): the previous default here ('claude-sonnet-4-6')
    // is not a valid model string, which would make every AI summary
    // request fail with a 404 from the Anthropic API regardless of a
    // correctly configured API key. 'claude-sonnet-5' is current as of
    // this build; override via CLAUDE_MODEL if Anthropic ships a newer
    // model you want to switch to.
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-5',
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    fromName: process.env.SMTP_FROM_NAME || 'Performance Feedback System',
  },

  uploads: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 5,
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 200,
  },
};
