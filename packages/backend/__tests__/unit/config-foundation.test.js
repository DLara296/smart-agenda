const { loadConfig } = require('../../src/config');

describe('configuration foundation', () => {
  it('provides safe development defaults and sandbox provider settings', () => {
    const config = loadConfig({ NODE_ENV: 'test' });

    expect(config).toEqual(expect.objectContaining({
      nodeEnv: 'test',
      port: expect.any(Number),
      database: expect.any(String),
      notificationProvider: 'sandbox',
    }));
  });
});
