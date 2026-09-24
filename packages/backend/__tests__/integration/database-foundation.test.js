const { createDatabase } = require('../../src/db/database');

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
});
