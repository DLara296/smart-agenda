const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const backupScript = path.resolve(__dirname, '../../scripts/backup-postgres.sh');
const restoreScript = path.resolve(__dirname, '../../scripts/restore-postgres.sh');

describe('PostgreSQL backup scripts', () => {
  let temporaryDirectory;
  let binDirectory;
  let outputDirectory;
  let capturePath;

  function addExecutable(name, source) {
    const executablePath = path.join(binDirectory, name);
    fs.writeFileSync(executablePath, source);
    fs.chmodSync(executablePath, 0o755);
  }

  function run(script, args = [], env = {}) {
    return spawnSync('bash', [script, ...args], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${binDirectory}:${process.env.PATH}`,
        ...env,
      },
    });
  }

  beforeEach(() => {
    temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'smartagenda-backup-'));
    binDirectory = path.join(temporaryDirectory, 'bin');
    outputDirectory = path.join(temporaryDirectory, 'backups');
    capturePath = path.join(temporaryDirectory, 'restored.dump');
    fs.mkdirSync(binDirectory);

    addExecutable('pg_dump', `#!/usr/bin/env node\nprocess.stdout.write('database-archive');\n`);
    addExecutable('age', `#!/usr/bin/env node
const fs = require('fs');
const input = fs.readFileSync(0);
const args = process.argv.slice(2);
if (args.includes('--decrypt')) {
  if (!args.includes('--identity') || !input.toString().startsWith('encrypted:')) process.exit(2);
  process.stdout.write(input.subarray('encrypted:'.length));
} else {
  if (!args.includes('--encrypt') || !args.includes('--recipient')) process.exit(3);
  process.stdout.write(Buffer.concat([Buffer.from('encrypted:'), input]));
}
`);
    addExecutable('pg_restore', `#!/usr/bin/env node
const fs = require('fs');
  const archivePath = process.argv[process.argv.length - 1];
  fs.writeFileSync(process.env.RESTORE_CAPTURE_PATH, fs.readFileSync(archivePath));
`);
    addExecutable('psql', `#!/usr/bin/env node
  process.stdout.write(process.env.TARGET_OBJECT_COUNT || '0');
  `);
  });

  afterEach(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

  it('writes only an encrypted atomic archive and never exposes the database URL', () => {
    const databaseUrl = 'postgresql://private-user:private-password@db.example.test/smartagenda';
    const result = run(backupScript, [], {
      DATABASE_URL: databaseUrl,
      BACKUP_AGE_RECIPIENT: 'age1publicrecipient',
      BACKUP_OUTPUT_DIR: outputDirectory,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain(databaseUrl);
    const files = fs.readdirSync(outputDirectory);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^smartagenda-\d{8}T\d{6}Z\.dump\.age$/);
    expect(fs.readFileSync(path.join(outputDirectory, files[0]), 'utf8')).toBe('encrypted:database-archive');
  });

  it('requires explicit confirmation of an isolated empty restore target', () => {
    const archivePath = path.join(temporaryDirectory, 'backup.dump.age');
    const identityPath = path.join(temporaryDirectory, 'identity.txt');
    fs.writeFileSync(archivePath, 'encrypted:database-archive');
    fs.writeFileSync(identityPath, 'test identity');

    const result = run(restoreScript, [archivePath], {
      RESTORE_DATABASE_URL: 'postgresql:///isolated_restore_test',
      BACKUP_AGE_IDENTITY_FILE: identityPath,
      RESTORE_CAPTURE_PATH: capturePath,
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('isolated empty database');
    expect(fs.existsSync(capturePath)).toBe(false);
  });

  it('refuses to restore over a target database containing user objects', () => {
    const archivePath = path.join(temporaryDirectory, 'backup.dump.age');
    const identityPath = path.join(temporaryDirectory, 'identity.txt');
    fs.writeFileSync(archivePath, 'encrypted:database-archive');
    fs.writeFileSync(identityPath, 'test identity');

    const result = run(restoreScript, [archivePath], {
      RESTORE_DATABASE_URL: 'postgresql:///isolated_restore_test',
      RESTORE_TARGET_CONFIRMED: 'isolated-empty-database',
      BACKUP_AGE_IDENTITY_FILE: identityPath,
      TARGET_OBJECT_COUNT: '3',
      RESTORE_CAPTURE_PATH: capturePath,
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('not empty');
    expect(fs.existsSync(capturePath)).toBe(false);
  });

  it('decrypts an archive and restores into the explicitly confirmed empty target', () => {
    const archivePath = path.join(temporaryDirectory, 'backup.dump.age');
    const identityPath = path.join(temporaryDirectory, 'identity.txt');
    fs.writeFileSync(archivePath, 'encrypted:database-archive');
    fs.writeFileSync(identityPath, 'test identity');

    const result = run(restoreScript, [archivePath], {
      RESTORE_DATABASE_URL: 'postgresql:///isolated_restore_test',
      RESTORE_TARGET_CONFIRMED: 'isolated-empty-database',
      BACKUP_AGE_IDENTITY_FILE: identityPath,
      RESTORE_CAPTURE_PATH: capturePath,
    });

    expect(result.status).toBe(0);
    expect(fs.readFileSync(capturePath, 'utf8')).toBe('database-archive');
  });
});