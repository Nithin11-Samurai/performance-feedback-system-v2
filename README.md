# Performance Feedback System

An internal, enterprise Performance Feedback System built for HR teams to reduce manual review-cycle overhead. Employees manage their own skills, certifications, and self-reviews; managers submit ratings and 1:1 context stays private to HR; peers give 360° feedback; HR gets AI-assisted summaries, org-wide analytics, an HR approval sign-off flow, and one-click PDF/Excel exports per employee, department, or review cycle.

Redesigned with a premium corporate pink theme (`#EA6BB3` / `#E02891` / `#FADEEE` / `#FFF8FC`), 16px rounded cards, and role-specific dashboards.

## Tech stack

- **Backend:** Node.js, Express, PostgreSQL, JWT auth, Multer (file uploads), Nodemailer, PDFKit, ExcelJS, node-cron, Anthropic SDK (Claude)
- **Frontend:** React 18, Vite, Tailwind CSS, React Router, Recharts, Axios

## Features by role

**Roles:** `employee`, `manager`, and four admin-tier roles that all get the same default access — `admin` (legacy), `global_admin`, `system_admin`, `hr_manager`. Admin-tier access can be further customized per-person via Settings → an employee's Permissions tab (grant/revoke specific sections like Analytics or Activity Log independent of role).

| Feature | Employee | Manager | Admin / HR-tier |
|---|---|---|---|
| Self-review (strengths, achievements, goals) | own | - | view all |
| Manager review (rating, achievements, goals) | - | direct reports only | view all |
| **Peer Insights** — anonymous 360° feedback by project group, HR-curated release (replaces the old in-cycle 360/approval flow) | submit anonymous reviews if assigned; see only HR-released summary of own feedback | same as employee | create groups, run rounds (Quick Action), see raw feedback, write & release summaries |
| Skills & certifications (with photo/file upload, credential URL) | own (edit) | view reports' (read-only) | view + export all |
| **Skills & Certifications Overview** — org-wide counts by proficiency, drill-down to named employees, Excel export at every level | no | no | yes |
| Profile picture | own | view reports' | manage anyone's |
| Employee profile editing (ID, name, email, DOJ, role, manager) | phone/address/emergency contact only | - | full edit |
| **Internal Notes** (renamed from "1:1 Notes") — now a tab on the employee's own detail page, with discussion/action items/follow-up date, search/filter, PDF/Excel export | never visible | never visible | HR/Admin-tier only, full CRUD + export |
| Manager hierarchy + bulk (re)assignment | - | - | assign/reassign/bulk-assign/remove |
| Employee Timeline (unified activity view) | own (no Internal Notes) | reports' (no Internal Notes) | full, including Internal Notes |
| Global search (name/ID/email/dept/manager/role/status) | no | own team only | everyone |
| Enterprise Activity Log (IP/browser/before-after values) | no | no | yes, filterable |
| **Department & Job Title catalogs** — managed lists powering dropdowns (Settings page) | no | no | yes |
| **Per-user section permission overrides** — grant/revoke access to a specific section independent of role, from an employee's Permissions tab | - | - | Global Admin / HR Manager (any admin-tier role) |
| Review cycle timeline & progress | - | - | create/activate/close, visual timeline |
| AI performance summary — strengths/weaknesses/promotion/training/sentiment, plus a personalized note that congratulates by name or points to Trailhead/Conga University for named skill gaps | view own | generate + view for reports | generate + view for anyone |
| PDF / Excel export — employee | no | direct reports (no notes) | anyone (includes notes) |
| PDF / Excel export — department & cycle reports | no | no | yes |
| Org-wide Analytics (top performers, skill gaps, cert stats, trends) | no | no | yes |
| Notification Center + automated emails (assigned/completed/reminders/cycle closed) | yes | yes | yes |
| Automated review-deadline reminders (deduplicated, one per cycle) | yes (if pending) | yes (if pending) | yes (if pending) |
| Review cycle management | - | - | create/activate/close |
| User management (filters, pagination, avatars, bulk assign) | - | - | create/deactivate/reassign |
| Forgot / reset password — **email link or 6-digit OTP, your choice** | yes | yes | yes |

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ (running locally or reachable via connection string — tested with Supabase Postgres)
- (Optional) An Anthropic API key, for AI summary generation
- (Optional) SMTP credentials, for email notifications and password reset emails -- without these, notifications are still created in-app and emails are just logged instead of sent

## Project structure

```
performance-feedback-system/
├── backend/           # Express API
│   ├── src/
│   │   ├── config/    # env, db pool, constants, schema.sql, migrate/seed scripts
│   │   ├── controllers/
│   │   ├── middleware/  # auth, validation, upload, error handling
│   │   ├── models/    # raw SQL per table
│   │   ├── routes/
│   │   ├── services/  # business logic
│   │   ├── jobs/      # scheduled cron jobs (review deadline reminders)
│   │   ├── utils/     # jwt, password hashing, PDF/Excel generators, logger
│   │   └── validators/
│   └── uploads/       # certificates/, avatars/ (served) and internal-notes/ (never served statically)
└── frontend/          # React + Vite app
    └── src/
        ├── components/
        ├── context/    # auth, theme, page title, toast
        ├── layouts/
        ├── pages/
        └── services/   # one file per backend feature, wraps Axios calls
```

## Setup

### 1. Database

Create a PostgreSQL database:

```bash
createdb performance_feedback
```

If using Supabase, add `sslmode=require` to your `DATABASE_URL` and use that as `DATABASE_URL` in `backend/.env` instead of the individual `DB_*` vars.

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env -- at minimum set DB_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET
npm install
npm run migrate     # applies schema.sql (idempotent -- safe to re-run, purely additive)
npm run seed        # creates the first Admin/HR login
npm run dev         # starts the API on http://localhost:5000
```

The seed script prints the admin credentials it creates. By default:
- Email: `admin@company.com`
- Password: `ChangeMe123!` (change this immediately after first login)

You can override these via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` env vars before running `npm run seed`.

### 3. Frontend

```bash
cd frontend
cp .env.example .env   # points VITE_API_URL at your backend
npm install
npm run dev             # starts the app on http://localhost:3000
```

### 4. Or run both together

From the repository root:

```bash
npm run install:all
npm run migrate
npm run seed
npm run dev
```

This uses `concurrently` to boot both servers with labeled, color-coded output.

## Enabling optional features

**AI summaries (Claude):** set `ANTHROPIC_API_KEY` in `backend/.env`. Without it, the "Generate" button in the UI returns a clear message explaining the feature isn't configured yet -- it won't crash anything. When configured, summaries now include: Overall Assessment, Key Strengths, Areas for Growth/Weaknesses, Notable Patterns, Promotion Readiness, Training Recommendations, and Overall Sentiment.

**Email notifications & password reset:** set the `SMTP_*` variables in `backend/.env`. Without them, notifications still appear in-app (the bell icon); emails are logged to the server console instead of sent. This includes the "Forgot Password" email link.

**Review deadline reminders:** runs automatically via a daily cron job (09:00 server time) once the backend is running — no configuration needed. Reminds anyone with pending feedback in a cycle closing within 3 days.

## Typical first-run walkthrough

1. Log in as the seeded Admin.
2. Go to **Employees** → create a Manager, then an Employee reporting to that Manager. Upload a profile picture for each.
3. Go to **Review Cycles** → create a cycle, then click **Activate**. Watch the visual timeline update.
4. Optionally assign a peer reviewer under the cycle's **360° peer assignments** panel.
5. Log in as the Employee → **My Skills** / **Certifications** to add some data, then **Reviews** to submit a self-review (including achievements and goals).
6. Log in as the Manager → **Reviews** → **Review your team** to submit manager feedback, then **Submit final** to lock it.
7. Back as Admin → **Review Cycles** to watch the completion summary update, use the **HR Approval** panel to sign off on the employee's review with final comments, or open the employee's profile under **Employees** (now with tabs: Overview / Skills / Certifications / Performance History) to generate an AI summary and export a PDF/Excel report.
8. Check **Analytics** for org-wide top performers, skill gaps, certification stats, and rating trends across all cycles.
9. Try **1:1 Notes** as Admin — log a note for the employee, and confirm (by logging in as that employee or their manager) that it never appears to them anywhere in the app.
10. Try the **Notifications** page (dedicated, beyond the bell dropdown) and test **Forgot Password** from the login screen.

## Security notes

- Refresh tokens and password reset tokens are stored server-side as SHA-256 hashes and rotate/single-use as appropriate.
- 1:1 notes are enforced Admin/HR-only at the route level, the service level, and have no static file route — there's no way to reach them as anything but an authenticated Admin.
- Uploaded files (certificates, avatars, notes) are renamed to random UUIDs on disk; the original filename is preserved only as metadata.
- Peer feedback reviewer identity is anonymized to everyone except Admin/HR, in the UI, exports, and AI summaries alike.
- "Forgot password" never reveals whether an email is registered — the response is identical either way.
- "Remember me" controls whether tokens persist in `localStorage` (checked) or `sessionStorage` (unchecked, cleared on browser close).

## Known limitations / next steps

- No automated test suite yet (manual end-to-end verification was done during development against a real PostgreSQL instance for every feature).
- Large employee directories (1000+) would benefit from further server-side optimization; pagination is already in place for the directory view.
- The production JS bundle is a single chunk (~220KB gzipped); code-splitting by route would improve initial load time at larger scale.
- File uploads are stored on local disk — if deploying the backend to a platform without persistent disk storage (e.g. Render's free tier), uploaded files will not survive restarts/redeploys unless a persistent volume or object storage (S3, Supabase Storage) is added.

