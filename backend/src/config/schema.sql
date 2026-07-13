-- ============================================================================
-- Performance Feedback System — PostgreSQL Schema
-- ============================================================================
-- Run via: npm run migrate  (see src/config/migrate.js)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- USERS
-- ----------------------------------------------------------------------------
-- Single table for all roles (employee/manager/admin). `manager_id` is a
-- self-reference so any user can have a reporting manager. Admins double as
-- HR in this system.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_code   VARCHAR(50) UNIQUE NOT NULL,          -- internal employee ID
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('employee', 'manager', 'admin')),
    job_title       VARCHAR(150),
    department      VARCHAR(150),
    manager_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    date_of_joining DATE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    avatar_url      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);

-- ----------------------------------------------------------------------------
-- REFRESH TOKENS (for JWT refresh flow, supports logout/revocation)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- ----------------------------------------------------------------------------
-- REVIEW CYCLES (managed by Admin/HR)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS review_cycles (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(150) NOT NULL,                 -- e.g. "H1 2026 Review"
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
    created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_cycle_dates CHECK (end_date >= start_date)
);

-- ----------------------------------------------------------------------------
-- FEEDBACK / REVIEWS (self, manager, peer — unified table with a `type` column)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feedback (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_cycle_id UUID NOT NULL REFERENCES review_cycles(id) ON DELETE CASCADE,
    subject_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- employee being reviewed
    reviewer_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- who wrote it
    type            VARCHAR(20) NOT NULL CHECK (type IN ('self', 'manager', 'peer')),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted')),
    rating          SMALLINT CHECK (rating BETWEEN 1 AND 5),  -- null for self-reviews
    strengths       TEXT,
    improvement_areas TEXT,
    comments        TEXT,
    submitted_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- A peer/manager/self can only submit one feedback entry per subject per cycle
    CONSTRAINT uq_feedback_unique UNIQUE (review_cycle_id, subject_id, reviewer_id, type)
);

CREATE INDEX IF NOT EXISTS idx_feedback_subject_id ON feedback(subject_id);
CREATE INDEX IF NOT EXISTS idx_feedback_cycle_id ON feedback(review_cycle_id);
CREATE INDEX IF NOT EXISTS idx_feedback_reviewer_id ON feedback(reviewer_id);

-- ----------------------------------------------------------------------------
-- PEER REVIEW ASSIGNMENTS
-- ----------------------------------------------------------------------------
-- Who has been nominated to give 360 feedback on whom, for a given cycle.
-- Kept separate from `feedback` so admins can assign reviewers before
-- feedback rows exist.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS peer_review_assignments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_cycle_id UUID NOT NULL REFERENCES review_cycles(id) ON DELETE CASCADE,
    subject_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewer_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_peer_assignment UNIQUE (review_cycle_id, subject_id, reviewer_id)
);

-- ----------------------------------------------------------------------------
-- SKILLS (Salesforce & Conga skill tracking, self-updated by employees)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS skills (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category        VARCHAR(30) NOT NULL CHECK (category IN ('salesforce', 'conga')),
    skill_name      VARCHAR(150) NOT NULL,               -- e.g. "Apex", "Conga Composer"
    proficiency     VARCHAR(20) NOT NULL DEFAULT 'beginner'
                        CHECK (proficiency IN ('beginner', 'intermediate', 'advanced', 'expert')),
    years_experience NUMERIC(4,1) DEFAULT 0,
    notes           TEXT,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_skill UNIQUE (user_id, category, skill_name)
);

CREATE INDEX IF NOT EXISTS idx_skills_user_id ON skills(user_id);

-- ----------------------------------------------------------------------------
-- CERTIFICATIONS (with uploaded certificate image/PDF)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS certifications (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                VARCHAR(200) NOT NULL,           -- e.g. "Salesforce Certified Administrator"
    issuing_organization VARCHAR(200),
    issue_date          DATE,
    expiry_date         DATE,
    credential_id       VARCHAR(150),
    file_path           TEXT,                            -- path to uploaded certificate image/PDF
    file_original_name  TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certifications_user_id ON certifications(user_id);

-- ----------------------------------------------------------------------------
-- 1:1 MEETING NOTES ("Internal Notes")
-- ----------------------------------------------------------------------------
-- Visible ONLY to Admin/HR — never to the employee or their manager through
-- the API layer (enforced in the controller, not just the UI).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS one_on_one_notes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    uploaded_by     UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    meeting_date    DATE NOT NULL,
    title           VARCHAR(200),
    note_text       TEXT,                                -- optional typed summary
    file_path       TEXT,                                -- optional uploaded note file (doc/pdf/image)
    file_original_name TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_one_on_one_employee_id ON one_on_one_notes(employee_id);

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS (in-app)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- recipient
    type        VARCHAR(50) NOT NULL,
    title       VARCHAR(200) NOT NULL,
    message     TEXT,
    link        TEXT,                                    -- frontend route to deep-link to
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, is_read);

-- ----------------------------------------------------------------------------
-- AI-GENERATED PERFORMANCE SUMMARIES (Claude)
-- ----------------------------------------------------------------------------
-- Cached per subject + cycle so we don't re-call the AI API on every page
-- load; regenerated on demand.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_summaries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    review_cycle_id UUID NOT NULL REFERENCES review_cycles(id) ON DELETE CASCADE,
    summary_text    TEXT NOT NULL,
    generated_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    model_used      VARCHAR(100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ai_summary UNIQUE (subject_id, review_cycle_id)
);

-- ----------------------------------------------------------------------------
-- AUDIT LOG (lightweight — who did what, useful for HR compliance)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(100) NOT NULL,      -- e.g. 'CREATE_USER', 'UPLOAD_NOTE'
    entity_type VARCHAR(50),
    entity_id   UUID,
    metadata    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);

-- ----------------------------------------------------------------------------
-- updated_at auto-touch trigger (reused across tables)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['users', 'review_cycles', 'feedback', 'skills', 'certifications', 'one_on_one_notes']
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trg_set_updated_at ON %I;
            CREATE TRIGGER trg_set_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        ', t, t);
    END LOOP;
END $$;

-- ============================================================================
-- ADDITIVE CHANGES — UI Redesign Phases 3/4/Login
-- Everything below is purely additive: new nullable columns and brand-new
-- tables. Nothing above this line is modified, and no existing data is
-- touched. Safe to re-run (idempotent) on a live database.
-- ============================================================================

-- Phase 4: "Achievements" and "Goals" as distinct optional fields on
-- feedback, alongside the existing strengths/improvement_areas/comments.
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS achievements TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS goals TEXT;

-- Phase 3: Approval Flow. HR approves a specific employee's completed
-- feedback packet for a given cycle, optionally leaving a final HR comment
-- (this doubles as Phase 4's "Final HR Comments"). Deliberately a NEW
-- table rather than modifying `feedback`, so this can be added to a live
-- database with zero risk to existing rows.
CREATE TABLE IF NOT EXISTS review_approvals (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_cycle_id UUID NOT NULL REFERENCES review_cycles(id) ON DELETE CASCADE,
    subject_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    approved_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hr_comments     TEXT,
    CONSTRAINT uq_review_approval UNIQUE (review_cycle_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_review_approvals_subject ON review_approvals(subject_id);

-- Login page "Forgot password" flow. Short-lived, single-use reset tokens.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

-- ============================================================================
-- ADDITIVE CHANGES — Remaining Features (2-9)
-- Again, purely additive: new nullable columns, new tables, widened CHECK
-- constraints. No existing data is touched or removed.
-- ============================================================================

-- Feature 3: 1:1 Meeting History — structured fields alongside the existing
-- free-text note_text (kept for backward compatibility with old notes).
ALTER TABLE one_on_one_notes ADD COLUMN IF NOT EXISTS discussion TEXT;
ALTER TABLE one_on_one_notes ADD COLUMN IF NOT EXISTS action_items TEXT;
ALTER TABLE one_on_one_notes ADD COLUMN IF NOT EXISTS follow_up_date DATE;

-- Feature 4: Expanded reviewer types. Widen the feedback.type CHECK to
-- include hr/skip_level/project_lead/mentor alongside the existing
-- self/manager/peer. Safe to re-run: drops and re-adds the same constraint.
ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_type_check;
ALTER TABLE feedback ADD CONSTRAINT feedback_type_check
    CHECK (type IN ('self', 'manager', 'peer', 'hr', 'skip_level', 'project_lead', 'mentor'));

-- peer_review_assignments becomes a general-purpose assignment table for
-- any non-manager/self reviewer type (peer, hr, skip_level, project_lead,
-- mentor) — reuses the same table/UI pattern instead of adding four more
-- near-identical tables.
ALTER TABLE peer_review_assignments ADD COLUMN IF NOT EXISTS reviewer_type VARCHAR(20) NOT NULL DEFAULT 'peer';
ALTER TABLE peer_review_assignments DROP CONSTRAINT IF EXISTS peer_review_assignments_reviewer_type_check;
ALTER TABLE peer_review_assignments ADD CONSTRAINT peer_review_assignments_reviewer_type_check
    CHECK (reviewer_type IN ('peer', 'hr', 'skip_level', 'project_lead', 'mentor'));
-- The old unique constraint only considered (cycle, subject, reviewer); a
-- reviewer could now conceivably be assigned as both e.g. "peer" and
-- "mentor" for the same person, so the uniqueness needs to include type.
ALTER TABLE peer_review_assignments DROP CONSTRAINT IF EXISTS uq_peer_assignment;
ALTER TABLE peer_review_assignments ADD CONSTRAINT uq_peer_assignment
    UNIQUE (review_cycle_id, subject_id, reviewer_id, reviewer_type);

-- Feature 6: expanded employee profile fields. Admin edits everything;
-- employees can self-edit these specific fields (enforced in application
-- code, not the DB) alongside their existing avatar self-edit.
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(150);
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(30);

-- Feature 9: enterprise activity log — widen audit_logs with IP/browser
-- and before/after value tracking. `metadata` (already existed) is kept
-- for anything that doesn't fit the old/new value shape.
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(64);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_value JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_value JSONB;

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Feature 2: track which notification emails have actually been sent, so
-- "reminder before due date" and similar jobs don't spam the same person
-- every time the job runs before the deadline changes.
CREATE TABLE IF NOT EXISTS email_log (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    email_type  VARCHAR(60) NOT NULL,   -- e.g. 'cycle_closing_reminder'
    reference_id UUID,                  -- e.g. the review_cycle_id this reminder was about
    sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_log_dedupe ON email_log(user_id, email_type, reference_id);

-- ============================================================================
-- ADDITIVE CHANGES — Role expansion, catalogs, permissions, Peer Insights (360)
-- All additive: widened CHECK constraints, new nullable columns, new tables.
-- Existing 'admin' users/rows are untouched and remain fully functional —
-- 'admin' is kept as a permanent alias with the same access as the new
-- 'global_admin' role, so nothing that already works can break.
-- ============================================================================

-- Item 2: expanded role hierarchy. 'admin' is kept (existing users/checks
-- keep working) and now sits alongside three more granular tiers.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('employee', 'manager', 'admin', 'global_admin', 'system_admin', 'hr_manager'));

-- Item 3: managed lookup lists for department and job title, so admins pick
-- from a curated dropdown instead of free-typing. `users.department` /
-- `users.job_title` remain plain VARCHAR (no risky data migration) — these
-- tables just back the dropdown UI and can be extended over time.
CREATE TABLE IF NOT EXISTS departments (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(150) UNIQUE NOT NULL,
    created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_titles (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title       VARCHAR(150) UNIQUE NOT NULL,
    created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Item 10: granular per-user section access overrides. Default access is
-- derived from role; a row here OVERRIDES the default for that one user
-- and section (e.g. temporarily grant a Manager access to Analytics).
CREATE TABLE IF NOT EXISTS user_section_permissions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    section_key VARCHAR(60) NOT NULL,
    allowed     BOOLEAN NOT NULL,
    updated_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_section_permission UNIQUE (user_id, section_key)
);

-- Item 5: OTP-based password reset, alongside the existing email-link flow.
CREATE TABLE IF NOT EXISTS password_reset_otps (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp_hash    VARCHAR(255) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN NOT NULL DEFAULT FALSE,
    attempts    SMALLINT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_otps_user_id ON password_reset_otps(user_id);

-- Item 7: certifications can now also carry a credential URL.
ALTER TABLE certifications ADD COLUMN IF NOT EXISTS credential_url TEXT;

-- ----------------------------------------------------------------------------
-- Item 9: Peer Insights — anonymous 360 feedback, decoupled from review
-- cycles entirely. Organized around project groups (e.g. "Conga Rollout")
-- rather than the whole org, and runs on its own cadence (HR-triggered,
-- typically every 6 months) rather than being tied to a performance
-- review cycle. Raw feedback is visible ONLY to Admin/HR-tier roles;
-- employees only ever see the HR-curated summary, once HR explicitly
-- releases it.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS project_groups (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(150) NOT NULL,
    description TEXT,
    created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_group_members (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_group_id UUID NOT NULL REFERENCES project_groups(id) ON DELETE CASCADE,
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    added_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_project_group_member UNIQUE (project_group_id, user_id)
);

-- One "round" of 360 feedback for a project group (HR starts this via the
-- Quick Action button described in item 9).
CREATE TABLE IF NOT EXISTS peer_insight_rounds (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_group_id UUID NOT NULL REFERENCES project_groups(id) ON DELETE CASCADE,
    name             VARCHAR(150) NOT NULL,          -- e.g. "H2 2026 Peer Insights"
    status           VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    started_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_peer_insight_rounds_group ON peer_insight_rounds(project_group_id);

-- Every member of the group anonymously reviews every other member,
-- auto-generated when HR clicks the Quick Action button.
CREATE TABLE IF NOT EXISTS peer_insight_feedback (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    round_id         UUID NOT NULL REFERENCES peer_insight_rounds(id) ON DELETE CASCADE,
    subject_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewer_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating           SMALLINT CHECK (rating BETWEEN 1 AND 5),
    strengths        TEXT,
    improvement_areas TEXT,
    comments         TEXT,
    status           VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted')),
    submitted_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_peer_insight_feedback UNIQUE (round_id, subject_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_peer_insight_feedback_subject ON peer_insight_feedback(subject_id);
CREATE INDEX IF NOT EXISTS idx_peer_insight_feedback_reviewer ON peer_insight_feedback(reviewer_id);

-- HR's curated summary for one employee's round — this, not the raw
-- feedback, is what the employee eventually sees, and only once released.
CREATE TABLE IF NOT EXISTS peer_insight_summaries (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    round_id         UUID NOT NULL REFERENCES peer_insight_rounds(id) ON DELETE CASCADE,
    subject_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    summary_text     TEXT NOT NULL,
    released_to_employee BOOLEAN NOT NULL DEFAULT FALSE,
    released_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    released_at      TIMESTAMPTZ,
    created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_peer_insight_summary UNIQUE (round_id, subject_id)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_project_groups') THEN
        CREATE TRIGGER trg_set_updated_at_project_groups
        BEFORE UPDATE ON project_groups
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_updated_at_peer_insight_summaries') THEN
        CREATE TRIGGER trg_set_updated_at_peer_insight_summaries
        BEFORE UPDATE ON peer_insight_summaries
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

-- Skills aren't limited to Salesforce/Conga — 'other' plus a free-text
-- skill name (already supported) covers anything else an employee wants
-- to record.
ALTER TABLE skills DROP CONSTRAINT IF EXISTS skills_category_check;
ALTER TABLE skills ADD CONSTRAINT skills_category_check CHECK (category IN ('salesforce', 'conga', 'other'));

-- Team Lead and MD (Managing Director) as additional named, non-anonymous
-- reviewer types, assignable from the Employee Detail page's Reviewers tab.
ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_type_check;
ALTER TABLE feedback ADD CONSTRAINT feedback_type_check
    CHECK (type IN ('self', 'manager', 'peer', 'hr', 'skip_level', 'project_lead', 'mentor', 'team_lead', 'md'));

ALTER TABLE peer_review_assignments DROP CONSTRAINT IF EXISTS peer_review_assignments_reviewer_type_check;
ALTER TABLE peer_review_assignments ADD CONSTRAINT peer_review_assignments_reviewer_type_check
    CHECK (reviewer_type IN ('peer', 'hr', 'skip_level', 'project_lead', 'mentor', 'team_lead', 'md'));

-- Item 2: the 360° Feedback question set was replaced with the company's
-- actual form — 7 categories, each a mandatory 1-5 Likert score
-- (Rarely..Always) plus an optional comment, stored together as JSON
-- since the category list may evolve. `rating` (existing column) is
-- reused for the Overall Rating question; `comments` (existing column)
-- is reused for the Final Thoughts question. strengths/improvement_areas
-- are no longer written by new submissions but are left in place for any
-- old rows that already used them.
ALTER TABLE peer_insight_feedback ADD COLUMN IF NOT EXISTS category_scores JSONB;

-- Item 5: soft-delete for employee records. A deleted employee's row
-- (and everything referencing it — feedback, skills, notes, etc.) stays
-- fully intact; deleted_at just makes it invisible to normal listings so
-- it can be restored later with everything exactly as it was.
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
