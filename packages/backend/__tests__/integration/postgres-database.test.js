const { Pool } = require('pg');
const { createPostgresDatabase } = require('../../src/db/postgresDatabase');
const { loadMigrations, migrateUp, migrationStatus } = require('../../src/db/migrate');
const { createAuthService } = require('../../src/domain/auth/authService');
const { createSchoolMembershipService } = require('../../src/domain/auth/schoolMembershipService');
const { createCommunicationConsentService } = require('../../src/domain/notification/communicationConsentService');
const { createNotificationService } = require('../../src/domain/notification/notificationService');
const { createAuditRepository } = require('../../src/domain/audit/auditRepository');

const connectionString = process.env.POSTGRES_TEST_DATABASE_URL;
const describePostgres = connectionString ? describe : describe.skip;

describePostgres('PostgreSQL persistence integration', () => {
  const schema = `smartagenda_test_${process.pid}_${Date.now()}`;
  let adminPool;
  let database;

  function connectToSchema(schemaName = schema) {
    const pool = new Pool({ connectionString, ssl: false, options: `-c search_path=${schemaName}` });
    return createPostgresDatabase({ pool });
  }

  beforeAll(async () => {
    adminPool = new Pool({ connectionString, ssl: false });
    await adminPool.query(`CREATE SCHEMA "${schema}"`);
    database = connectToSchema();
    await migrateUp(database);
  });

  afterAll(async () => {
    if (database) await database.close();
    if (adminPool) {
      await adminPool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await adminPool.end();
    }
  });

  it('applies fresh migrations and preserves data across reconnect', async () => {
    const status = await migrationStatus(database);
    expect(status.every(migration => migration.status === 'applied')).toBe(true);

    const now = new Date().toISOString();
    await database.execute("INSERT INTO schools (id, name, timezone, locale, status, created_at, updated_at) VALUES ($1, $2, 'UTC', 'en', 'active', $3, $3)", ['school-persisted', 'Persisted School', now]);
    await database.close();

    database = connectToSchema();
    await expect(database.one('SELECT name FROM schools WHERE id = $1', ['school-persisted'])).resolves.toEqual({ name: 'Persisted School' });
  });

  it('rolls back failed transactions and enforces uniqueness and foreign keys', async () => {
    const now = new Date().toISOString();
    await expect(database.transaction(async transaction => {
      await transaction.execute("INSERT INTO schools (id, name, timezone, locale, status, created_at, updated_at) VALUES ($1, $2, 'UTC', 'en', 'active', $3, $3)", ['school-rolled-back', 'Rolled Back', now]);
      throw new Error('rollback requested');
    })).rejects.toThrow('rollback requested');
    await expect(database.one('SELECT id FROM schools WHERE id = $1', ['school-rolled-back'])).resolves.toBeNull();

    await expect(database.execute("INSERT INTO grades (id, school_id, name, status, created_at, updated_at) VALUES ('grade-invalid', 'missing-school', 'Invalid', 'active', $1, $1)", [now])).rejects.toMatchObject({ code: '23503' });
    await database.execute("INSERT INTO users (id, name, role, email, status, email_verified, notify_whatsapp, notify_email, created_at, updated_at) VALUES ('user-unique-1', 'First', 'guest', 'unique@example.test', 'active', 0, 0, 0, $1, $1)", [now]);
    await expect(database.execute("INSERT INTO users (id, name, role, email, status, email_verified, notify_whatsapp, notify_email, created_at, updated_at) VALUES ('user-unique-2', 'Second', 'guest', 'unique@example.test', 'active', 0, 0, 0, $1, $1)", [now])).rejects.toMatchObject({ code: '23505' });
  });

  it('upgrades a database stopped after the previous migration', async () => {
    const upgradeSchema = `${schema}_upgrade`;
    await adminPool.query(`CREATE SCHEMA "${upgradeSchema}"`);
    const upgradeDatabase = connectToSchema(upgradeSchema);
    const migrations = loadMigrations();
    try {
      await upgradeDatabase.execute('CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, checksum TEXT NOT NULL, applied_at TEXT NOT NULL)');
      await upgradeDatabase.transaction(async transaction => {
        await transaction.execute(migrations[0].sql);
        await transaction.execute('INSERT INTO schema_migrations (version, name, checksum, applied_at) VALUES ($1, $2, $3, $4)', [migrations[0].version, migrations[0].name, migrations[0].checksum, new Date().toISOString()]);
      });

      await expect(migrateUp(upgradeDatabase, migrations)).resolves.toEqual([2]);
      await expect(migrationStatus(upgradeDatabase, migrations)).resolves.toEqual(migrations.map(migration => expect.objectContaining({ version: migration.version, status: 'applied' })));
      await expect(upgradeDatabase.one("SELECT tgname AS name FROM pg_trigger WHERE tgname = 'enforce_session_group_schedule_assignment'", [])).resolves.toEqual({ name: 'enforce_session_group_schedule_assignment' });
    } finally {
      await upgradeDatabase.close();
      await adminPool.query(`DROP SCHEMA IF EXISTS "${upgradeSchema}" CASCADE`);
    }
  });

  it('enforces group schedule uniqueness across sessions on the same date', async () => {
    const now = new Date().toISOString();
    await database.execute("INSERT INTO schools (id, name, timezone, locale, status, created_at, updated_at) VALUES ('school-schedule', 'Schedule School', 'UTC', 'en', 'active', $1, $1)", [now]);
    await database.execute("INSERT INTO grades (id, school_id, name, status, created_at, updated_at) VALUES ('grade-schedule', 'school-schedule', 'Grade', 'active', $1, $1)", [now]);
    await database.execute("INSERT INTO groups (id, grade_id, name, code, status, created_at, updated_at) VALUES ('group-schedule', 'grade-schedule', 'Group', 'G', 'active', $1, $1)", [now]);
    await database.execute("INSERT INTO teachers (id, name, email, school_id, status, created_at, updated_at) VALUES ('teacher-schedule', 'Teacher', 'schedule-teacher@example.test', 'school-schedule', 'active', $1, $1)", [now]);
    for (const id of ['session-schedule-1', 'session-schedule-2']) {
      await database.execute("INSERT INTO reading_sessions (id, school_id, grade_id, session_date, start_time, end_time, timezone, status, created_at, updated_at) VALUES ($1, 'school-schedule', 'grade-schedule', '2026-10-01', '09:00', '10:00', 'UTC', 'scheduled', $2, $2)", [id, now]);
    }
    await database.execute("INSERT INTO session_group_assignments (id, session_id, group_id, teacher_id, language, status, created_at, updated_at) VALUES ('session-group-1', 'session-schedule-1', 'group-schedule', 'teacher-schedule', 'en', 'active', $1, $1)", [now]);
    await expect(database.execute("INSERT INTO session_group_assignments (id, session_id, group_id, teacher_id, language, status, created_at, updated_at) VALUES ('session-group-2', 'session-schedule-2', 'group-schedule', 'teacher-schedule', 'en', 'active', $1, $1)", [now])).rejects.toMatchObject({ code: '23505', message: expect.stringContaining('SESSION_DUPLICATE') });
  });

  it('persists auth sessions, school scope, notifications, consents, and audit history', async () => {
    const now = new Date().toISOString();
    const authService = createAuthService(database);
    const user = await authService.registerAsync({ name: 'Postgres User', familyName: 'Postgres', email: 'postgres-user@example.test', password: 'secure-password' });
    const session = await authService.createSessionAsync(user.id);
    await expect(authService.getUserByTokenAsync(session.rawToken)).resolves.toEqual(expect.objectContaining({ id: user.id, email: user.email }));

    await database.execute("INSERT INTO users (id, name, role, email, status, email_verified, notify_whatsapp, notify_email, created_at, updated_at) VALUES ('user-coordinator-pg', 'Coordinator', 'coordinator', 'coordinator-pg@example.test', 'active', 1, 0, 1, $1, $1)", [now]);
    const memberships = createSchoolMembershipService(database);
    await memberships.grantAsync({ userId: 'user-coordinator-pg', schoolId: 'school-persisted', grantedBy: user.id });
    await expect(memberships.hasAccessAsync('user-coordinator-pg', 'school-persisted')).resolves.toBe(true);

    await database.execute("INSERT INTO family_records (id, display_name, status, created_at, updated_at) VALUES ('family-pg', 'Postgres Family', 'active', $1, $1)", [now]);
    await database.execute("INSERT INTO guardians (id, family_id, name, email, supported_languages, status, created_at, updated_at) VALUES ('guardian-pg', 'family-pg', 'Guardian', 'guardian-pg@example.test', '[]', 'active', $1, $1)", [now]);
    const consents = createCommunicationConsentService(database);
    await consents.recordAsync({ type: 'guardian', id: 'guardian-pg', channel: 'email', status: 'granted', source: 'postgres_integration', capturedBy: user.id });
    await expect(consents.hasConsentAsync({ type: 'guardian', id: 'guardian-pg', channel: 'email' })).resolves.toBe(true);

    const notifications = createNotificationService(database, { enabledChannels: ['email'] });
    const notificationInput = { schoolId: 'school-persisted', recipientId: 'guardian-pg', recipientType: 'guardian', type: 'reminder', channel: 'email', message: 'Test', scheduledFor: now, idempotencyKey: 'postgres-notification-idempotency' };
    const first = await notifications.createAsync(notificationInput);
    const duplicate = await notifications.createAsync(notificationInput);
    expect(duplicate.id).toBe(first.id);
    await expect(notifications.listAsync({ schoolId: 'school-persisted' })).resolves.toEqual([expect.objectContaining({ id: first.id, status: 'queued' })]);

    const audit = createAuditRepository(database);
    await audit.recordAsync({ entityType: 'notification', entityId: first.id, action: 'created', actorId: user.id, metadata: { schoolId: 'school-persisted' } });
    await expect(audit.listAsync('notification', first.id)).resolves.toEqual([expect.objectContaining({ action: 'created', metadata: { schoolId: 'school-persisted' } })]);
  });
});
