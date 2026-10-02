const { createDatabase } = require('./database');
const { createPostgresDatabase } = require('./postgresDatabase');

function createDatabaseFromConfig(config, postgresOptions = {}) {
  if (config.databaseDriver === 'postgres') {
    const database = createPostgresDatabase({
      connectionString: config.database,
      ssl: config.postgres?.sslMode !== 'disable',
      poolOptions: {
        max: config.postgres?.poolMax,
        connectionTimeoutMillis: config.postgres?.connectionTimeoutMs,
        idleTimeoutMillis: config.postgres?.idleTimeoutMs,
      },
      ...postgresOptions,
    });
    return { ...database, driver: 'postgres' };
  }

  const database = createDatabase(config.database || ':memory:');
  database.driver = 'sqlite';
  return database;
}

module.exports = { createDatabaseFromConfig };
