const { loadMigrations, migrationStatus, migrateUp, recoverMigrations } = require('../migrate');

function createFakeDatabase({ failVersion = null } = {}) {
  const applied = [];
  const executed = [];
  return {
    applied,
    executed,
    async execute(sql) {
      executed.push(sql);
      return { changes: 0, rows: [] };
    },
    async query() {
      return applied.map(record => ({ ...record, appliedAt: record.appliedAt }));
    },
    async transaction(work) {
      const snapshot = applied.slice();
      try {
        return await work({
          execute: async (sql, values = []) => {
            executed.push(sql);
            if (failVersion && sql.includes(`migration-${failVersion}-failure`)) throw new Error('migration failed');
            if (sql.startsWith('INSERT INTO schema_migrations')) {
              applied.push({ version: values[0], name: values[1], checksum: values[2], appliedAt: values[3] });
            }
            return { changes: 1, rows: [] };
          },
        });
      } catch (error) {
        applied.splice(0, applied.length, ...snapshot);
        throw error;
      }
    },
  };
}

describe('PostgreSQL migrations', () => {
  it('loads ordered, checksummed migrations containing the complete application schema', () => {
    const migrations = loadMigrations();
    const sql = migrations.map(migration => migration.sql).join('\n');

    expect(migrations.map(migration => migration.version)).toEqual([1, 2]);
    expect(migrations.every(migration => /^[a-f0-9]{64}$/.test(migration.checksum))).toBe(true);
    expect(sql).toEqual(expect.stringContaining('CREATE TABLE schools'));
    expect(sql).toEqual(expect.stringContaining('CREATE TABLE auth_sessions'));
    expect(sql).toEqual(expect.stringContaining('CREATE TABLE notification_attempts'));
    expect(sql).toEqual(expect.stringContaining('CREATE TABLE communication_consents'));
    expect(sql).toEqual(expect.stringContaining('CREATE TABLE user_school_memberships'));
    expect(sql).toEqual(expect.stringContaining('CREATE TRIGGER enforce_session_group_schedule_assignment'));
  });

  it('reports status and applies each pending migration once in version order', async () => {
    const database = createFakeDatabase();
    const migrations = loadMigrations();

    await expect(migrationStatus(database, migrations)).resolves.toEqual(migrations.map(migration => expect.objectContaining({ version: migration.version, status: 'pending' })));
    await expect(migrateUp(database, migrations)).resolves.toEqual([1, 2]);
    await expect(migrateUp(database, migrations)).resolves.toEqual([]);
    expect(database.applied.map(migration => migration.version)).toEqual([1, 2]);
  });

  it('rejects changed applied migrations', async () => {
    const database = createFakeDatabase();
    const migrations = loadMigrations();
    database.applied.push({ version: 1, name: migrations[0].name, checksum: 'changed', appliedAt: '2026-09-30T00:00:00.000Z' });

    await expect(migrationStatus(database, migrations)).rejects.toThrow('Checksum mismatch for migration 1_initial_schema.');
  });

  it('leaves a failed migration pending so recovery can apply it', async () => {
    const migrations = [{ version: 1, name: 'failure', checksum: 'checksum', sql: 'migration-1-failure' }];
    const failingDatabase = createFakeDatabase({ failVersion: 1 });

    await expect(migrateUp(failingDatabase, migrations)).rejects.toThrow('migration failed');
    expect(failingDatabase.applied).toEqual([]);

    const recoveredDatabase = createFakeDatabase();
    await expect(recoverMigrations(recoveredDatabase, migrations)).resolves.toEqual([1]);
    expect(recoveredDatabase.applied).toHaveLength(1);
  });
});
