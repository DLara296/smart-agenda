const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const { createAppAsync } = require('../../src/app');

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
    process.env.FRONTEND_ORIGIN = 'https://app.example.test';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    if (databasePath && fs.existsSync(databasePath)) fs.unlinkSync(databasePath);
  });

  it('does not seed demo schools and provisions the initial admin once', async () => {
    const first = await createAppAsync({ database: databasePath });
    expect(first.db.prepare('SELECT COUNT(*) AS count FROM schools').get().count).toBe(0);
    expect(first.db.prepare('SELECT email, role FROM users WHERE email = ?').get('owner@example.test')).toEqual({ email: 'owner@example.test', role: 'admin' });
    first.close();

    const second = await createAppAsync({ database: databasePath });
    expect(second.db.prepare('SELECT COUNT(*) AS count FROM users WHERE email = ?').get('owner@example.test').count).toBe(1);
    second.close();
  });

  it('enforces production web security policy', async () => {
    const instance = await createAppAsync({ database: databasePath });
    try {
      const registered = await request(instance.app)
        .post('/v1/auth/register')
        .set('Origin', 'https://app.example.test')
        .send({ name: 'Production User', email: 'production-user@example.test', password: 'correct-horse' });
      const denied = await request(instance.app)
        .post('/v1/auth/register')
        .set('Origin', 'https://evil.example.test')
        .send({ name: 'Denied User', email: 'denied@example.test', password: 'correct-horse' });

      expect(registered.status).toBe(201);
      expect(registered.headers['access-control-allow-origin']).toBe('https://app.example.test');
      expect(registered.headers['access-control-allow-credentials']).toBe('true');
      expect(registered.headers['content-security-policy']).toBeDefined();
      expect(registered.headers['x-content-type-options']).toBe('nosniff');
      expect(registered.headers['set-cookie'][0]).toEqual(expect.stringContaining('HttpOnly'));
      expect(registered.headers['set-cookie'][0]).toEqual(expect.stringContaining('SameSite=Lax'));
      expect(registered.headers['set-cookie'][0]).toEqual(expect.stringContaining('Secure'));
      expect(denied.status).toBe(403);
      expect(denied.body.error.code).toBe('ORIGIN_DENIED');
    } finally {
      instance.close();
    }
  });
});