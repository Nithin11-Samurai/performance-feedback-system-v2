-- Feature visibility flags: replaces the hardcoded role checks for
-- My Skills, Certifications, Reviews, Review Cycles, Analytics, and
-- Skills & Certifications Overview with an admin-configurable on/off
-- switch per feature, per audience (Admin-tier themselves, or Employees
-- - which here means everyone below Admin-tier, i.e. Employee + Manager).
--
-- Defaults below match whatever the CURRENT hardcoded behavior was at
-- the time this migration was written, so turning this system on does
-- not silently change anyone's access until an Admin-tier user actually
-- flips a toggle in Settings.
CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  visible_to_admin_tier BOOLEAN NOT NULL DEFAULT true,
  visible_to_employees BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO feature_flags (key, label, visible_to_admin_tier, visible_to_employees)
VALUES
  ('skills', 'My Skills', true, false),
  ('certifications', 'Certifications', true, false),
  ('reviews', 'Reviews', true, false),
  ('review_cycles', 'Review Cycles', true, false),
  ('analytics', 'Analytics', true, false),
  ('skills_certs_overview', 'Skills and Certifications Overview', true, false)
ON CONFLICT (key) DO NOTHING;
