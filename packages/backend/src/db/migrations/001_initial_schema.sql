CREATE TABLE schools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  timezone TEXT NOT NULL,
  locale TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE family_records (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  avatar TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE grades (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  academic_period TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE groups (
  id TEXT PRIMARY KEY,
  grade_id TEXT NOT NULL REFERENCES grades(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE teachers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  school_id TEXT REFERENCES schools(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE guardians (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES family_records(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  relationship TEXT,
  supported_languages TEXT NOT NULL,
  avatar TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE students (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES family_records(id) ON DELETE RESTRICT,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  grade_id TEXT NOT NULL REFERENCES grades(id) ON DELETE RESTRICT,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  avatar TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  family_name TEXT,
  avatar TEXT,
  role TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  password_hash TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  email_verified INTEGER NOT NULL DEFAULT 0,
  family_id TEXT REFERENCES family_records(id) ON DELETE SET NULL,
  notify_whatsapp INTEGER NOT NULL DEFAULT 0,
  notify_email INTEGER NOT NULL DEFAULT 0,
  reminder_message TEXT,
  appearance_theme TEXT,
  application_background TEXT,
  background_overlay INTEGER,
  interface_effect TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX users_email_unique ON users(email) WHERE email IS NOT NULL;

CREATE TABLE auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_used_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE TABLE reading_sessions (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  grade_id TEXT REFERENCES grades(id) ON DELETE RESTRICT,
  session_date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  timezone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  image TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE session_group_assignments (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES reading_sessions(id) ON DELETE RESTRICT,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
  language TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (session_id, group_id)
);

CREATE TABLE volunteer_assignments (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES reading_sessions(id) ON DELETE RESTRICT,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  guardian_id TEXT NOT NULL REFERENCES guardians(id) ON DELETE RESTRICT,
  student_id TEXT REFERENCES students(id) ON DELETE RESTRICT,
  teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
  language TEXT NOT NULL,
  status TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  cancellation_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE rotation_rules (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  pattern TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE rotation_overrides (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL REFERENCES rotation_rules(id) ON DELETE RESTRICT,
  session_id TEXT NOT NULL REFERENCES reading_sessions(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL,
  reason TEXT NOT NULL,
  approver_id TEXT NOT NULL,
  affected_scope TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE invitations (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  household_id TEXT REFERENCES family_records(id) ON DELETE SET NULL,
  issuer_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  school_id TEXT REFERENCES schools(id) ON DELETE RESTRICT,
  session_id TEXT REFERENCES reading_sessions(id) ON DELETE RESTRICT,
  assignment_id TEXT REFERENCES volunteer_assignments(id) ON DELETE RESTRICT,
  recipient_id TEXT,
  recipient_type TEXT,
  type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  scheduled_for TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  idempotency_key TEXT NOT NULL UNIQUE,
  provider_message_id TEXT,
  failure_code TEXT,
  sending_at TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX notifications_school_status_schedule_idx ON notifications(school_id, status, scheduled_for);

CREATE TABLE audit_records (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id TEXT,
  metadata TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE notification_groups (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'email')),
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX notification_group_school_name_unique ON notification_groups(school_id, lower(name));
CREATE INDEX notification_groups_school_idx ON notification_groups(school_id, name);

CREATE TABLE notification_group_members (
  id TEXT PRIMARY KEY,
  notification_group_id TEXT NOT NULL REFERENCES notification_groups(id) ON DELETE CASCADE,
  guardian_id TEXT REFERENCES guardians(id) ON DELETE CASCADE,
  teacher_id TEXT REFERENCES teachers(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  CHECK ((guardian_id IS NOT NULL AND teacher_id IS NULL) OR (guardian_id IS NULL AND teacher_id IS NOT NULL))
);

CREATE UNIQUE INDEX notification_group_guardian_unique ON notification_group_members(notification_group_id, guardian_id) WHERE guardian_id IS NOT NULL;
CREATE UNIQUE INDEX notification_group_teacher_unique ON notification_group_members(notification_group_id, teacher_id) WHERE teacher_id IS NOT NULL;
CREATE INDEX notification_group_members_group_idx ON notification_group_members(notification_group_id);

CREATE TABLE notification_attempts (
  id TEXT PRIMARY KEY,
  notification_id TEXT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  provider_key TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('accepted', 'delivered', 'retryable_failure', 'permanent_failure', 'suppressed', 'simulated')),
  provider_message_id TEXT,
  safe_failure_code TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  retry_after TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (notification_id, attempt_number)
);

CREATE INDEX notification_attempts_notification_idx ON notification_attempts(notification_id, created_at);

CREATE TABLE communication_consents (
  id TEXT PRIMARY KEY,
  guardian_id TEXT REFERENCES guardians(id) ON DELETE CASCADE,
  teacher_id TEXT REFERENCES teachers(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),
  status TEXT NOT NULL CHECK (status IN ('granted', 'revoked')),
  source TEXT NOT NULL,
  captured_by TEXT,
  created_at TEXT NOT NULL,
  CHECK ((guardian_id IS NOT NULL AND teacher_id IS NULL) OR (guardian_id IS NULL AND teacher_id IS NOT NULL))
);

CREATE INDEX communication_consents_guardian_idx ON communication_consents(guardian_id, channel, created_at);
CREATE INDEX communication_consents_teacher_idx ON communication_consents(teacher_id, channel, created_at);

CREATE TABLE user_school_memberships (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'coordinator' CHECK (role IN ('coordinator')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  granted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (user_id, school_id)
);

CREATE INDEX user_school_memberships_school_idx ON user_school_memberships(school_id, status);
