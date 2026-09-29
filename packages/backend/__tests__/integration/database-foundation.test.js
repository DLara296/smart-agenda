const { createDatabase } = require('../../src/db/database');
const Database = require('better-sqlite3');
const fs = require('fs');
const os = require('os');
const path = require('path');

describe('database foundation', () => {
  it('creates the core relational tables and migration record', () => {
    const database = createDatabase(':memory:');
    const tables = database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map(row => row.name);

    expect(tables).toEqual(expect.arrayContaining([
      'schema_migrations',
      'schools',
      'family_records',
      'reading_sessions',
      'notifications',
      'audit_records',
    ]));
    expect(database.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get().count).toBeGreaterThan(0);

    database.close();
  });

  it('upgrades a database stopped after its first migration', () => {
    const filename = path.join(os.tmpdir(), `smart-agenda-migration-${process.pid}.db`);
    const legacy = new Database(filename);
    legacy.exec('CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL); CREATE TABLE schools (id TEXT PRIMARY KEY, name TEXT NOT NULL, timezone TEXT NOT NULL, locale TEXT NOT NULL, status TEXT NOT NULL DEFAULT \'active\', created_at TEXT NOT NULL, updated_at TEXT NOT NULL); INSERT INTO schema_migrations (version, applied_at) VALUES (1, \'2026-01-01T00:00:00.000Z\');');
    legacy.close();

    const upgraded = createDatabase(filename);
    expect(upgraded.prepare('SELECT MAX(version) AS version FROM schema_migrations').get().version).toBeGreaterThan(1);
    expect(upgraded.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('notifications', 'notification_attempts', 'communication_consents')").all().map(row => row.name)).toEqual(expect.arrayContaining(['notifications', 'notification_attempts', 'communication_consents']));

    upgraded.close();
    fs.rmSync(filename, { force: true });
  });
});
