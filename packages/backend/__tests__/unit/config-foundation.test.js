const { loadConfig, validateProductionConfig } = require('../../src/config');

describe('configuration foundation', () => {
  it('provides safe development defaults and sandbox provider settings', () => {
    const config = loadConfig({ NODE_ENV: 'test' });

    expect(config).toEqual(expect.objectContaining({
      nodeEnv: 'test',
      port: expect.any(Number),
      database: expect.any(String),
      notificationProvider: 'sandbox',
      enabledNotificationChannels: [],
    }));
  });

  it('enables Gmail Email capability only when sender and OAuth2 credentials are all configured', () => {
    const config = loadConfig({
      NODE_ENV: 'test',
      GMAIL_SENDER_EMAIL: 'sender@example.test',
      GMAIL_OAUTH_CLIENT_ID: 'client-id',
      GMAIL_OAUTH_CLIENT_SECRET: 'client-secret',
      GMAIL_OAUTH_REFRESH_TOKEN: 'refresh-token',
    });

    expect(config.enabledNotificationChannels).toEqual(['email']);
    expect(config.gmail.senderEmail).toBe('sender@example.test');
    expect(loadConfig({ GMAIL_SENDER_EMAIL: 'sender@example.test' }).enabledNotificationChannels).toEqual([]);
  });

  it('rejects unsafe production configuration before startup', () => {
    expect(() => validateProductionConfig(loadConfig({ NODE_ENV: 'production' })))
      .toThrow('Production requires an explicit durable DATABASE_URL.');
    expect(() => validateProductionConfig(loadConfig({ NODE_ENV: 'production', DATABASE_URL: './data/prod.sqlite' })))
      .toThrow('Production requires SESSION_SECRET.');
  });

  it('accepts explicit durable production configuration', () => {
    expect(() => validateProductionConfig(loadConfig({
      NODE_ENV: 'production',
      DATABASE_URL: './data/prod.sqlite',
      SESSION_SECRET: 'a-secure-session-secret-with-sufficient-length',
      INITIAL_ADMIN_EMAIL: 'owner@example.test',
      INITIAL_ADMIN_PASSWORD: 'a-secure-password',
      FRONTEND_ORIGIN: 'https://app.example.test',
    }))).not.toThrow();
  });

  it('requires one explicit HTTPS frontend origin in production', () => {
    const base = {
      NODE_ENV: 'production',
      DATABASE_URL: './data/prod.sqlite',
      SESSION_SECRET: 'a-secure-session-secret-with-sufficient-length',
      INITIAL_ADMIN_EMAIL: 'owner@example.test',
      INITIAL_ADMIN_PASSWORD: 'a-secure-password',
    };
    expect(() => validateProductionConfig(loadConfig(base))).toThrow('Production requires FRONTEND_ORIGIN');
    expect(() => validateProductionConfig(loadConfig({ ...base, FRONTEND_ORIGIN: 'http://app.example.test' }))).toThrow('Production FRONTEND_ORIGIN must be an HTTPS origin without a path');
    expect(() => validateProductionConfig(loadConfig({ ...base, FRONTEND_ORIGIN: 'https://app.example.test/path' }))).toThrow('Production FRONTEND_ORIGIN must be an HTTPS origin without a path');
  });

  it('does not treat a PostgreSQL URL as a SQLite filename', () => {
    expect(() => validateProductionConfig(loadConfig({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://user:password@db.example.test/smartagenda',
      SESSION_SECRET: 'a-secure-session-secret-with-sufficient-length',
      INITIAL_ADMIN_EMAIL: 'owner@example.test',
      INITIAL_ADMIN_PASSWORD: 'a-secure-password',
      FRONTEND_ORIGIN: 'https://app.example.test',
    }))).toThrow('PostgreSQL DATABASE_URL requires the PostgreSQL adapter before production use.');
  });

  it('loads PostgreSQL pool and SSL settings without enabling the adapter implicitly', () => {
    const config = loadConfig({
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://user:password@db.example.test/smartagenda',
      PGSSLMODE: 'require',
      PG_POOL_MAX: '4',
      PG_CONNECTION_TIMEOUT_MS: '2500',
      PG_IDLE_TIMEOUT_MS: '7000',
    });
    expect(config.databaseDriver).toBe('postgres');
    expect(config.postgres).toEqual({ sslMode: 'require', poolMax: 4, connectionTimeoutMs: 2500, idleTimeoutMs: 7000 });
  });

  it.each([
    [{ NODE_ENV: 'preview' }, 'NODE_ENV must be one of'],
    [{ PORT: 'not-a-port' }, 'PORT must be an integer between 1 and 65535'],
    [{ PORT: '70000' }, 'PORT must be an integer between 1 and 65535'],
    [{ PGSSLMODE: 'unknown' }, 'PGSSLMODE must be require or disable'],
    [{ PG_POOL_MAX: '0' }, 'PG_POOL_MAX must be an integer between 1 and 100'],
    [{ PG_CONNECTION_TIMEOUT_MS: 'invalid' }, 'PG_CONNECTION_TIMEOUT_MS must be an integer between 100 and 120000'],
    [{ PG_IDLE_TIMEOUT_MS: '500' }, 'PG_IDLE_TIMEOUT_MS must be an integer between 1000 and 600000'],
    [{ NOTIFICATION_WORKER_INTERVAL_MS: '0' }, 'NOTIFICATION_WORKER_INTERVAL_MS must be an integer between 1000 and 3600000'],
    [{ NOTIFICATION_MAX_ATTEMPTS: '2.5' }, 'NOTIFICATION_MAX_ATTEMPTS must be an integer between 1 and 20'],
    [{ SESSION_REMINDER_LEAD_HOURS: '-1' }, 'SESSION_REMINDER_LEAD_HOURS must be a number between 0 and 720'],
  ])('rejects invalid runtime environment values', (environment, message) => {
    expect(() => loadConfig(environment)).toThrow(message);
  });
});
