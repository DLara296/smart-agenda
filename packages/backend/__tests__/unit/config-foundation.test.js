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
    }))).not.toThrow();
  });
});
