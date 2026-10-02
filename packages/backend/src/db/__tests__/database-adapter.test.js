const { createPostgresDatabase } = require('../postgresDatabase');
const { createDatabaseFromConfig } = require('../databaseFactory');

describe('PostgreSQL database adapter', () => {
  it('selects SQLite by default and PostgreSQL only for an explicit PostgreSQL config', () => {
    const sqlite = createDatabaseFromConfig({ database: ':memory:', databaseDriver: 'sqlite' });
    expect(sqlite.driver).toBe('sqlite');
    sqlite.close();

    const pool = { end: jest.fn(async () => undefined) };
    const postgres = createDatabaseFromConfig({ database: 'postgresql://db.example.test/smartagenda', databaseDriver: 'postgres' }, { pool });
    expect(postgres.driver).toBe('postgres');
    return postgres.close();
  });

  it('supports parameterized queries, transactions, health checks, and shutdown', async () => {
    const calls = [];
    const client = {
      query: async (text, values) => {
        calls.push({ text, values });
        return { rows: [{ ok: true }] };
      },
      release: jest.fn(),
    };
    const pool = {
      connect: jest.fn(async () => client),
      query: jest.fn(async (text, values) => {
        calls.push({ text, values });
        return { rows: [{ ready: true }], rowCount: 1 };
      }),
      end: jest.fn(async () => undefined),
    };
    const database = createPostgresDatabase({ pool });

    await expect(database.query('SELECT $1 AS value', ['test'])).resolves.toEqual([{ ready: true }]);
    await expect(database.one('SELECT $1 AS value', ['one'])).resolves.toEqual({ ready: true });
    await expect(database.execute('UPDATE records SET value = $1', ['updated'])).resolves.toEqual({ changes: 1, rows: [{ ready: true }] });
    await expect(database.transaction(async transaction => transaction.query('SELECT $1 AS value', ['transaction']))).resolves.toEqual([{ ok: true }]);
    await expect(database.isReady()).resolves.toBe(true);
    await database.close();

    expect(pool.connect).toHaveBeenCalledTimes(1);
    expect(client.release).toHaveBeenCalledTimes(1);
    expect(pool.end).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(expect.arrayContaining([
      { text: 'SELECT $1 AS value', values: ['test'] },
      { text: 'BEGIN', values: undefined },
      { text: 'COMMIT', values: undefined },
      { text: 'SELECT 1', values: undefined },
    ]));
  });

  it('rolls back and releases the client when a transaction fails', async () => {
    const client = {
      query: jest.fn(async text => {
        if (text === 'SELECT broken') throw new Error('query failed');
        return { rows: [] };
      }),
      release: jest.fn(),
    };
    const pool = { connect: jest.fn(async () => client), end: jest.fn(async () => undefined) };
    const database = createPostgresDatabase({ pool });

    await expect(database.transaction(transaction => transaction.query('SELECT broken'))).rejects.toThrow('query failed');
    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenNthCalledWith(3, 'ROLLBACK');
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
