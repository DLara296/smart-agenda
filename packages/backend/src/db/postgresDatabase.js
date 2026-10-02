const { Pool } = require('pg');

function createPostgresDatabase({ connectionString = process.env.DATABASE_URL, ssl = process.env.PGSSLMODE !== 'disable', poolOptions = {}, pool = null } = {}) {
  if (!pool && !connectionString) throw new Error('PostgreSQL DATABASE_URL is required.');
  const clientPool = pool || new Pool({
    connectionString,
    ssl: ssl ? { rejectUnauthorized: false } : undefined,
    max: Number(poolOptions.max || process.env.PG_POOL_MAX || 10),
    connectionTimeoutMillis: Number(poolOptions.connectionTimeoutMillis || process.env.PG_CONNECTION_TIMEOUT_MS || 5000),
    idleTimeoutMillis: Number(poolOptions.idleTimeoutMillis || process.env.PG_IDLE_TIMEOUT_MS || 10000),
  });

  async function query(text, values) {
    const result = await clientPool.query(text, values);
    return result.rows;
  }

  async function one(text, values) {
    const result = await clientPool.query(text, values);
    return result.rows[0] || null;
  }

  async function execute(text, values) {
    const result = await clientPool.query(text, values);
    return { changes: result.rowCount, rows: result.rows };
  }

  async function transaction(work) {
    const client = await clientPool.connect();
    try {
      await client.query('BEGIN');
      const transactionDatabase = {
        query: async (text, values) => (await client.query(text, values)).rows,
        one: async (text, values) => (await client.query(text, values)).rows[0] || null,
        execute: async (text, values) => {
          const result = await client.query(text, values);
          return { changes: result.rowCount, rows: result.rows };
        },
      };
      const result = await work(transactionDatabase);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async function isReady() {
    try {
      await clientPool.query('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }

  async function close() {
    await clientPool.end();
  }

  return { driver: 'postgres', query, one, execute, transaction, isReady, close, pool: clientPool };
}

module.exports = { createPostgresDatabase };
