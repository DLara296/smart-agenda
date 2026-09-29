const { loadConfig } = require('../../src/config');

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
});
