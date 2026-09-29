const Database = require('better-sqlite3');

const migrations = [
  `CREATE TABLE IF NOT EXISTS schools (id TEXT PRIMARY KEY, name TEXT NOT NULL, timezone TEXT NOT NULL, locale TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS family_records (id TEXT PRIMARY KEY, display_name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS reading_sessions (id TEXT PRIMARY KEY, school_id TEXT NOT NULL, grade_id TEXT, session_date TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, timezone TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, session_id TEXT, assignment_id TEXT, type TEXT NOT NULL, channel TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued', scheduled_for TEXT NOT NULL, retry_count INTEGER NOT NULL DEFAULT 0, idempotency_key TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS audit_records (id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, action TEXT NOT NULL, actor_id TEXT, metadata TEXT NOT NULL, created_at TEXT NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS session_group_assignments (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, group_id TEXT NOT NULL, teacher_id TEXT NOT NULL, language TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS volunteer_assignments (id TEXT PRIMARY KEY, session_id TEXT NOT NULL, group_id TEXT NOT NULL, guardian_id TEXT NOT NULL, student_id TEXT, teacher_id TEXT NOT NULL, language TEXT NOT NULL, status TEXT NOT NULL, idempotency_key TEXT NOT NULL UNIQUE, cancellation_reason TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS rotation_rules (id TEXT PRIMARY KEY, school_id TEXT NOT NULL, pattern TEXT NOT NULL, created_at TEXT NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS rotation_overrides (id TEXT PRIMARY KEY, rule_id TEXT NOT NULL, session_id TEXT NOT NULL, kind TEXT NOT NULL, reason TEXT NOT NULL, approver_id TEXT NOT NULL, affected_scope TEXT NOT NULL, created_at TEXT NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS guardians (id TEXT PRIMARY KEY, family_id TEXT NOT NULL, name TEXT NOT NULL, email TEXT, relationship TEXT, supported_languages TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS students (id TEXT PRIMARY KEY, family_id TEXT NOT NULL, school_id TEXT NOT NULL, grade_id TEXT NOT NULL, group_id TEXT NOT NULL, name TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS invitations (id TEXT PRIMARY KEY, token TEXT NOT NULL UNIQUE, email TEXT NOT NULL, role TEXT NOT NULL, household_id TEXT, issuer_id TEXT NOT NULL, status TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS grades (id TEXT PRIMARY KEY, school_id TEXT NOT NULL, name TEXT NOT NULL, academic_period TEXT, status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS groups (id TEXT PRIMARY KEY, grade_id TEXT NOT NULL, name TEXT NOT NULL, code TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS teachers (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, phone TEXT, status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`,
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, avatar TEXT, role TEXT NOT NULL, email TEXT, phone TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`,
  `ALTER TABLE teachers ADD COLUMN school_id TEXT REFERENCES schools(id);`,
  `ALTER TABLE users ADD COLUMN password_hash TEXT;`,
  `ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';`,
  `ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;`,
  `ALTER TABLE users ADD COLUMN family_id TEXT;`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email) WHERE email IS NOT NULL;`,
  `CREATE TABLE IF NOT EXISTS auth_sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, last_used_at TEXT NOT NULL, revoked_at TEXT);`,
  `ALTER TABLE users ADD COLUMN family_name TEXT;`,
  `ALTER TABLE users ADD COLUMN notify_whatsapp INTEGER NOT NULL DEFAULT 0;`,
  `ALTER TABLE users ADD COLUMN notify_email INTEGER NOT NULL DEFAULT 0;`,
  `ALTER TABLE notifications ADD COLUMN recipient_id TEXT;`,
  `ALTER TABLE notifications ADD COLUMN message TEXT;`,
  `ALTER TABLE reading_sessions ADD COLUMN image TEXT;`,
  `ALTER TABLE reading_sessions ADD COLUMN created_by TEXT;`,
  `ALTER TABLE users ADD COLUMN reminder_message TEXT;`,
  `ALTER TABLE family_records ADD COLUMN avatar TEXT;`,
  `ALTER TABLE guardians ADD COLUMN avatar TEXT;`,
  `ALTER TABLE students ADD COLUMN avatar TEXT;`,
  `ALTER TABLE users ADD COLUMN appearance_theme TEXT;`,
  `ALTER TABLE users ADD COLUMN dashboard_background TEXT;`,
  `ALTER TABLE users ADD COLUMN background_overlay INTEGER;`,
  `ALTER TABLE users RENAME COLUMN dashboard_background TO application_background;`,
  `ALTER TABLE users ADD COLUMN interface_effect TEXT;`,
  `CREATE TRIGGER enforce_session_group_schedule_insert BEFORE INSERT ON session_group_assignments WHEN EXISTS (SELECT 1 FROM session_group_assignments existing_assignment JOIN reading_sessions existing_session ON existing_session.id = existing_assignment.session_id JOIN reading_sessions new_session ON new_session.id = NEW.session_id WHERE existing_assignment.group_id = NEW.group_id AND (existing_assignment.session_id = NEW.session_id OR (existing_session.school_id = new_session.school_id AND existing_session.grade_id = new_session.grade_id AND existing_session.session_date = new_session.session_date))) BEGIN SELECT RAISE(ABORT, 'SESSION_DUPLICATE'); END;`,
  `CREATE TRIGGER enforce_session_group_schedule_update BEFORE UPDATE OF school_id, grade_id, session_date ON reading_sessions WHEN EXISTS (SELECT 1 FROM session_group_assignments candidate_assignment JOIN session_group_assignments existing_assignment ON existing_assignment.group_id = candidate_assignment.group_id JOIN reading_sessions existing_session ON existing_session.id = existing_assignment.session_id WHERE candidate_assignment.session_id = NEW.id AND existing_session.id <> NEW.id AND existing_session.school_id = NEW.school_id AND existing_session.grade_id = NEW.grade_id AND existing_session.session_date = NEW.session_date) BEGIN SELECT RAISE(ABORT, 'SESSION_DUPLICATE'); END;`,
  `CREATE TRIGGER enforce_session_group_schedule_assignment_update BEFORE UPDATE OF session_id, group_id ON session_group_assignments WHEN EXISTS (SELECT 1 FROM session_group_assignments existing_assignment JOIN reading_sessions existing_session ON existing_session.id = existing_assignment.session_id JOIN reading_sessions new_session ON new_session.id = NEW.session_id WHERE existing_assignment.group_id = NEW.group_id AND existing_assignment.id <> OLD.id AND (existing_assignment.session_id = NEW.session_id OR (existing_session.school_id = new_session.school_id AND existing_session.grade_id = new_session.grade_id AND existing_session.session_date = new_session.session_date))) BEGIN SELECT RAISE(ABORT, 'SESSION_DUPLICATE'); END;`,
  `ALTER TABLE guardians ADD COLUMN phone TEXT;`,
  `CREATE TABLE IF NOT EXISTS notification_groups (id TEXT PRIMARY KEY, school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE RESTRICT, name TEXT NOT NULL, channel TEXT NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'email')), created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS notification_group_school_name_unique ON notification_groups(school_id, name COLLATE NOCASE);`,
  `CREATE TABLE IF NOT EXISTS notification_group_members (id TEXT PRIMARY KEY, notification_group_id TEXT NOT NULL REFERENCES notification_groups(id) ON DELETE CASCADE, guardian_id TEXT REFERENCES guardians(id) ON DELETE CASCADE, teacher_id TEXT REFERENCES teachers(id) ON DELETE CASCADE, created_at TEXT NOT NULL, CHECK ((guardian_id IS NOT NULL AND teacher_id IS NULL) OR (guardian_id IS NULL AND teacher_id IS NOT NULL)));`,
  `CREATE UNIQUE INDEX IF NOT EXISTS notification_group_guardian_unique ON notification_group_members(notification_group_id, guardian_id) WHERE guardian_id IS NOT NULL;`,
  `CREATE UNIQUE INDEX IF NOT EXISTS notification_group_teacher_unique ON notification_group_members(notification_group_id, teacher_id) WHERE teacher_id IS NOT NULL;`,
  `CREATE INDEX IF NOT EXISTS notification_groups_school_idx ON notification_groups(school_id, name);`,
  `CREATE INDEX IF NOT EXISTS notification_group_members_group_idx ON notification_group_members(notification_group_id);`,
  `ALTER TABLE notifications ADD COLUMN school_id TEXT REFERENCES schools(id);`,
  `ALTER TABLE notifications ADD COLUMN recipient_type TEXT;`,
  `ALTER TABLE notifications ADD COLUMN provider_message_id TEXT;`,
  `ALTER TABLE notifications ADD COLUMN failure_code TEXT;`,
  `ALTER TABLE notifications ADD COLUMN sending_at TEXT;`,
  `ALTER TABLE notifications ADD COLUMN sent_at TEXT;`,
  `UPDATE notifications SET school_id = (SELECT school_id FROM reading_sessions WHERE reading_sessions.id = notifications.session_id) WHERE school_id IS NULL AND session_id IS NOT NULL;`,
  `CREATE INDEX IF NOT EXISTS notifications_school_status_schedule_idx ON notifications(school_id, status, scheduled_for);`,
  `CREATE TABLE IF NOT EXISTS notification_attempts (id TEXT PRIMARY KEY, notification_id TEXT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE, attempt_number INTEGER NOT NULL, provider_key TEXT NOT NULL, outcome TEXT NOT NULL CHECK (outcome IN ('accepted', 'delivered', 'retryable_failure', 'permanent_failure', 'suppressed', 'simulated')), provider_message_id TEXT, safe_failure_code TEXT, started_at TEXT NOT NULL, completed_at TEXT NOT NULL, retry_after TEXT, created_at TEXT NOT NULL, UNIQUE (notification_id, attempt_number));`,
  `CREATE INDEX IF NOT EXISTS notification_attempts_notification_idx ON notification_attempts(notification_id, created_at);`,
  `CREATE TABLE IF NOT EXISTS communication_consents (id TEXT PRIMARY KEY, guardian_id TEXT REFERENCES guardians(id) ON DELETE CASCADE, teacher_id TEXT REFERENCES teachers(id) ON DELETE CASCADE, channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')), status TEXT NOT NULL CHECK (status IN ('granted', 'revoked')), source TEXT NOT NULL, captured_by TEXT, created_at TEXT NOT NULL, CHECK ((guardian_id IS NOT NULL AND teacher_id IS NULL) OR (guardian_id IS NULL AND teacher_id IS NOT NULL)));`,
  `CREATE INDEX IF NOT EXISTS communication_consents_guardian_idx ON communication_consents(guardian_id, channel, created_at);`,
  `CREATE INDEX IF NOT EXISTS communication_consents_teacher_idx ON communication_consents(teacher_id, channel, created_at);`,
];

function createDatabase(filename = ':memory:') {
  const database = new Database(filename);
  database.pragma('foreign_keys = ON');
  database.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
  const applied = database.prepare('SELECT version FROM schema_migrations').all().map(row => row.version);

  migrations.forEach((sql, index) => {
    const version = index + 1;
    if (!applied.includes(version)) {
      database.exec(sql);
      database.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(version, new Date().toISOString());
    }
  });

  return database;
}

module.exports = { createDatabase };
