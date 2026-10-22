function sqliteQuery(text, values = []) {
  const normalizedValues = Array.isArray(values) && values.length === 1 && Array.isArray(values[0]) ? values[0] : values;
  const bindings = [];
  const sql = text.replace(/\$(\d+)/g, (placeholder, index) => {
    bindings.push(normalizedValues[Number(index) - 1]);
    return '?';
  });
  return { sql, values: bindings.length > 0 ? bindings : normalizedValues };
}

function createSqliteDatabaseContract(database) {
  let transactionQueue = Promise.resolve();
  return {
    driver: 'sqlite',
    querySync(text, values = []) {
      const statement = sqliteQuery(text, values);
      return database.prepare(statement.sql).all(...statement.values);
    },
    oneSync(text, values = []) {
      const statement = sqliteQuery(text, values);
      return database.prepare(statement.sql).get(...statement.values) || null;
    },
    executeSync(text, values = []) {
      const statement = sqliteQuery(text, values);
      const result = database.prepare(statement.sql).run(...statement.values);
      return { changes: result.changes, lastInsertRowid: result.lastInsertRowid };
    },
    transactionSync(work) {
      return database.transaction(() => work(this))();
    },
    async query(text, values = []) {
      const statement = sqliteQuery(text, values);
      const flattenedValues = Array.isArray(statement.values) ? statement.values : [statement.values];
      return database.prepare(statement.sql).all(...flattenedValues);
    },
    async execute(text, values = []) {
      const statement = sqliteQuery(text, values);
      const flattenedValues = Array.isArray(statement.values) ? statement.values : [statement.values];
      const result = database.prepare(statement.sql).run(...flattenedValues);
      return { changes: result.changes, lastInsertRowid: result.lastInsertRowid };
    },
    async one(text, values = []) {
      const rows = await this.query(text, values);
      return rows[0] || null;
    },
    async transaction(work) {
      const run = async () => {
        database.exec('BEGIN');
        try {
          const result = await work(this);
          database.exec('COMMIT');
          return result;
        } catch (error) {
          database.exec('ROLLBACK');
          throw error;
        }
      };
      transactionQueue = transactionQueue.then(run, run);
      return transactionQueue;
    },
    async isReady() {
      database.prepare('SELECT 1').get();
      return true;
    },
    async close() {
      database.close();
    },
    legacy: database,
  };
}

function createPostgresDatabaseContract(database) {
  return {
    ...database,
    driver: 'postgres',
    execute: async (text, values = []) => {
      const result = await database.pool.query(text, values);
      return { changes: result.rowCount, rows: result.rows };
    },
    one: async (text, values = []) => {
      const rows = await database.query(text, values);
      return rows[0] || null;
    },
  };
}

function createDatabaseContract(database) {
  if (!database) throw new Error('A database adapter is required.');
  if (database.driver === 'postgres') return createPostgresDatabaseContract(database);
  if (database.driver === 'sqlite') return createSqliteDatabaseContract(database.legacy || database);
  throw new Error(`Unsupported database driver: ${database.driver || 'unknown'}`);
}

function withTransaction(database, work) {
  return database.transaction(work);
}

module.exports = { createDatabaseContract, createSqliteDatabaseContract, createPostgresDatabaseContract, withTransaction };
