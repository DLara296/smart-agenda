const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { loadConfig } = require('../config');
const { createPostgresDatabase } = require('./postgresDatabase');

const DEFAULT_MIGRATIONS_DIRECTORY = path.join(__dirname, 'migrations');

function loadMigrations(directory = DEFAULT_MIGRATIONS_DIRECTORY) {
  return fs.readdirSync(directory)
    .filter(file => /^\d+_[a-z0-9_-]+\.sql$/i.test(file))
    .sort((left, right) => Number(left.split('_')[0]) - Number(right.split('_')[0]))
    .map(file => {
      const sql = fs.readFileSync(path.join(directory, file), 'utf8');
      return {
        version: Number(file.split('_')[0]),
        name: file.replace(/^\d+_|\.sql$/g, ''),
        checksum: crypto.createHash('sha256').update(sql).digest('hex'),
        sql,
      };
    });
}

async function ensureMigrationTable(database) {
  await database.execute(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    checksum TEXT NOT NULL,
    applied_at TEXT NOT NULL
  )`);
}

async function migrationStatus(database, migrations = loadMigrations()) {
  await ensureMigrationTable(database);
  const applied = await database.query('SELECT version, name, checksum, applied_at AS "appliedAt" FROM schema_migrations ORDER BY version');
  const appliedByVersion = new Map(applied.map(migration => [Number(migration.version), migration]));
  return migrations.map(migration => {
    const record = appliedByVersion.get(migration.version);
    if (record && record.checksum !== migration.checksum) {
      throw new Error(`Checksum mismatch for migration ${migration.version}_${migration.name}.`);
    }
    return { version: migration.version, name: migration.name, checksum: migration.checksum, appliedAt: record?.appliedAt || null, status: record ? 'applied' : 'pending' };
  });
}

async function migrateUp(database, migrations = loadMigrations()) {
  const status = await migrationStatus(database, migrations);
  const applied = [];
  for (const migration of status.filter(item => item.status === 'pending')) {
    const source = migrations.find(item => item.version === migration.version);
    await database.transaction(async transaction => {
      await transaction.execute(source.sql);
      await transaction.execute('INSERT INTO schema_migrations (version, name, checksum, applied_at) VALUES ($1, $2, $3, $4)', [source.version, source.name, source.checksum, new Date().toISOString()]);
    });
    applied.push(migration.version);
  }
  return applied;
}

async function recoverMigrations(database, migrations = loadMigrations()) {
  return migrateUp(database, migrations);
}

async function runCli() {
  const action = process.argv[2] || 'status';
  if (!['status', 'up', 'recover'].includes(action)) throw new Error('Migration command must be one of: status, up, recover.');
  const config = loadConfig();
  if (config.databaseDriver !== 'postgres') throw new Error('PostgreSQL DATABASE_URL is required for migration commands.');
  const database = createPostgresDatabase({
    connectionString: config.database,
    ssl: config.postgres.sslMode !== 'disable',
    poolOptions: {
      max: config.postgres.poolMax,
      connectionTimeoutMillis: config.postgres.connectionTimeoutMs,
      idleTimeoutMillis: config.postgres.idleTimeoutMs,
    },
  });
  try {
    const result = action === 'status'
      ? await migrationStatus(database)
      : action === 'up'
        ? await migrateUp(database)
        : await recoverMigrations(database);
    console.log(JSON.stringify({ action, result }, null, 2));
  } finally {
    await database.close();
  }
}

if (require.main === module) {
  runCli().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { loadMigrations, migrationStatus, migrateUp, recoverMigrations };
