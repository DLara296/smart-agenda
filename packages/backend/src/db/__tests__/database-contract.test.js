const { createDatabase } = require('../database');
const { createPostgresDatabase } = require('../postgresDatabase');
const { createDatabaseContract } = require('../databaseContract');

describe('shared database contract', () => {
  it('supports the contract for SQLite', async () => {
    const database = createDatabase(':memory:');
    const contract = createDatabaseContract({ driver: 'sqlite', legacy: database });
    await contract.execute('CREATE TABLE contract_values (value TEXT NOT NULL)', []);
    await contract.execute('INSERT INTO contract_values (value) VALUES (?)', ['ok']);
    await expect(contract.query('SELECT value FROM contract_values', [])).resolves.toEqual([{ value: 'ok' }]);
    await expect(contract.transaction(async transaction => transaction.query('SELECT 1'))).resolves.toBeDefined();
    await expect(contract.isReady()).resolves.toBe(true);
    await contract.close();
  });

  it('supports the contract for PostgreSQL', async () => {
    const database = createPostgresDatabase({
      pool: {
        query: jest.fn(async () => ({ rows: [{ value: 1 }], rowCount: 1 })),
        connect: jest.fn(async () => ({ query: jest.fn(async () => ({ rows: [] })), release: jest.fn() })),
        end: jest.fn(async () => undefined),
      },
    });
    const contract = createDatabaseContract(database);
    await expect(contract.query('SELECT $1 AS value', ['ok'])).resolves.toEqual([{ value: 1 }]);
    await expect(contract.execute('UPDATE values SET value = $1', ['ok'])).resolves.toEqual({ changes: 1, rows: [{ value: 1 }] });
    await expect(contract.transaction(async transaction => transaction.query('SELECT 1'))).resolves.toBeDefined();
    await expect(contract.isReady()).resolves.toBe(true);
    await contract.close();
  });
});
