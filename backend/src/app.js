/**
 * Express application setup.
 * Kept separate from server.js so tests can import `app` directly
 * (supertest) without binding to a real port.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

const config = require('./config/env');
const logger = require('./utils/logger');
const blobStorage = require('./utils/blobStorage');
const { authenticate } = require('./middleware/auth');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();

// Render (and most PaaS hosts) sit behind their own reverse proxy, which
// sets X-Forwarded-For. Without telling Express to trust exactly one hop,
// express-rate-limit can't safely derive the real client IP from that
// header and throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR as a safety check
// against IP spoofing. Only enabled in production — locally there's no
// proxy in front, so trusting a forwarded-for header there would be the
// actual spoofing risk this check exists to catch.
if (config.env === 'production') {
  app.set('trust proxy', 1);
}

// ---------------------------------------------------------------------------
// Security & core middleware
// ---------------------------------------------------------------------------
app.use(helmet());

app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);

app.use(compression());

app.use(
  express.json({
    limit: '2mb',
  })
);

app.use(
  express.urlencoded({
    extended: true,
  })
);

// HTTP request logging — piped through our structured logger in production,
// plain 'dev' format locally for readability.
app.use(
  morgan(config.env === 'production' ? 'combined' : 'dev', {
    stream: {
      write: (msg) => logger.info(msg.trim()),
    },
  })
);

// Global rate limiter — protects auth & API endpoints from brute force/abuse.
app.use(
  '/api',
  rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests, please try again later.',
    },
  })
);

// ---------------------------------------------------------------------------
// Azure Blob Storage-backed uploaded files
// ---------------------------------------------------------------------------
//
// Uploaded files are now stored in the private Azure Blob Storage container.
//
// Existing database URLs are intentionally kept unchanged:
//
//   /uploads/avatars/<filename>
//   /uploads/certificates/<filename>
//
// The routes below translate those paths into private Azure Blob reads,
// so the frontend does not need to change.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Avatar serving
// ---------------------------------------------------------------------------
//
// Avatar images are loaded by normal <img src="..."> elements in the
// frontend, so we cannot require the Authorization header here without
// changing the frontend architecture.
//
// The actual blob remains private in Azure; this Express endpoint is the
// only application route exposing it.
// ---------------------------------------------------------------------------
app.get(
  '/uploads/avatars/:fileName',
  async (req, res, next) => {
    try {
      const fileName = path.basename(req.params.fileName);

      if (!fileName || fileName === '.' || fileName === '..') {
        return res.status(400).json({
          success: false,
          message: 'Invalid avatar filename',
        });
      }

      const blobPath = `avatars/${fileName}`;

      const {
        stream,
        contentType,
        contentLength,
      } = await blobStorage.downloadFile(blobPath);

      res.setHeader(
        'Content-Type',
        contentType || 'application/octet-stream'
      );

      if (
        contentLength !== undefined &&
        contentLength !== null
      ) {
        res.setHeader(
          'Content-Length',
          contentLength
        );
      }

      res.setHeader(
        'Cache-Control',
        'private, max-age=3600'
      );

      stream.on('error', next);
      stream.pipe(res);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// Certificate serving
// ---------------------------------------------------------------------------
//
// Certificates are also stored in private Azure Blob Storage.
//
// Unlike avatars, certificates should require authentication before they
// can be downloaded.
// ---------------------------------------------------------------------------
app.get(
  '/uploads/certificates/:fileName',
  authenticate,
  async (req, res, next) => {
    try {
      const fileName = path.basename(
        req.params.fileName
      );

      if (!fileName || fileName === '.' || fileName === '..') {
        return res.status(400).json({
          success: false,
          message: 'Invalid certificate filename',
        });
      }

      const blobPath =
        `certificates/${fileName}`;

      const {
        stream,
        contentType,
        contentLength,
      } = await blobStorage.downloadFile(blobPath);

      res.setHeader(
        'Content-Type',
        contentType || 'application/octet-stream'
      );

      if (
        contentLength !== undefined &&
        contentLength !== null
      ) {
        res.setHeader(
          'Content-Length',
          contentLength
        );
      }

      res.setHeader(
        'Cache-Control',
        'private, max-age=3600'
      );

      stream.on('error', next);
      stream.pipe(res);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// IMPORTANT
// ---------------------------------------------------------------------------
//
// Internal notes are intentionally NOT served through a static route.
// They remain accessible only through their authenticated Admin/HR
// controller/service flow.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------
app.use('/api', routes);

// ---------------------------------------------------------------------------
// 404 + error handling (must be last)
// ---------------------------------------------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;