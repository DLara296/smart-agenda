const fs = require('fs');
const os = require('os');
const path = require('path');
const { countSqliteCalls, findRegressions, checkBoundary } = require('../../scripts/check-database-boundary');

describe('SQLite database boundary guard', () => {
  it('passes against the approved legacy-call baseline', () => {
    expect(checkBoundary()).toBe(true);
  });

  it('detects new direct prepare and transaction usage', () => {
    const baseline = { 'src/service.js': 1 };
    const current = { 'src/service.js': countSqliteCalls('database.prepare("SELECT 1"); database.transaction(() => {});') };
    expect(findRegressions(current, baseline)).toEqual(['src/service.js: 2 direct SQLite calls (baseline 1)']);
  });

  it('fails for a newly added source module using SQLite APIs', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'smartagenda-db-guard-'));
    const databaseDir = path.join(tempRoot, 'db');
    fs.mkdirSync(databaseDir);
    const baselinePath = path.join(databaseDir, 'sqlite-call-baseline.json');
    fs.writeFileSync(baselinePath, '{}');
    fs.writeFileSync(path.join(tempRoot, 'newService.js'), 'database.prepare("SELECT 1")');
    expect(() => checkBoundary({ sourceRoot: tempRoot, baselinePath })).toThrow(/newService\.js: 1 direct SQLite calls/);
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });
});
