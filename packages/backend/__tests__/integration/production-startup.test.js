const fs = require('fs');
const os = require('os');
const path = require('path');
const { createApp } = require('../../src/app');

describe('production startup', () => {
  const originalEnv = { ...process.env };
  let databasePath;

  beforeEach(() => {
    databasePath = path.join(os.tmpdir(), `smartagenda-production-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = databasePath;
    process.env.SESSION_SECRET = 'a-secure-session-secret-with-sufficient-length';
    process.env.INITIAL_ADMIN_EMAIL = 'owner@example.test';
    process.env.INITIAL_ADMIN_PASSWORD = 'a-secure-password';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    if (databasePath && fs.existsSync(databasePath)) fs.unlinkSync(databasePath);
  });

  it('does not seed demo schools and provisions the initial admin once', () => {
    const first = createApp({ database: databasePath });
    expect(first.db.prepare('SELECT COUNT(*) AS count FROM schools').get().count).toBe(0);
    expect(first.db.prepare('SELECT email, role FROM users WHERE email = ?').get('owner@example.test')).toEqual({ email: 'owner@example.test', role: 'admin' });
    first.close();

    const second = createApp({ database: databasePath });
    expect(second.db.prepare('SELECT COUNT(*) AS count FROM users WHERE email = ?').get('owner@example.test').count).toBe(1);
    second.close();
  });
});