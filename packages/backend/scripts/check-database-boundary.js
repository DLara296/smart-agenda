const fs = require('fs');
const path = require('path');

const API_CALL = /(?:\.prepare\s*\(|\.transaction\s*\()/g;
const BACKEND_ROOT = path.resolve(__dirname, '..');
const REPOSITORY_ROOT = path.resolve(BACKEND_ROOT, '../..');
const SOURCE_ROOT = path.join(BACKEND_ROOT, 'src');
const BASELINE_PATH = path.join(SOURCE_ROOT, 'db', 'sqlite-call-baseline.json');

function walkJavaScript(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === 'db' ? [] : walkJavaScript(fullPath);
    return entry.name.endsWith('.js') ? [fullPath] : [];
  });
}

function countSqliteCalls(source) {
  return (source.match(API_CALL) || []).length;
}

function scanSource(root = SOURCE_ROOT) {
  return Object.fromEntries(walkJavaScript(root).map(file => [
    path.relative(REPOSITORY_ROOT, file).split(path.sep).join('/'),
    countSqliteCalls(fs.readFileSync(file, 'utf8')),
  ]).filter(([, count]) => count > 0));
}

function findRegressions(current, baseline) {
  return Object.entries(current)
    .filter(([file, count]) => count > (baseline[file] || 0))
    .map(([file, count]) => `${file}: ${count} direct SQLite calls (baseline ${baseline[file] || 0})`);
}

function checkBoundary({ sourceRoot = SOURCE_ROOT, baselinePath = BASELINE_PATH } = {}) {
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  const regressions = findRegressions(scanSource(sourceRoot), baseline);
  if (regressions.length) throw new Error(`SQLite database boundary regression:\n${regressions.join('\n')}`);
  return true;
}

if (require.main === module) {
  try {
    checkBoundary();
    console.log('SQLite database boundary check passed.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { countSqliteCalls, findRegressions, scanSource, checkBoundary };
