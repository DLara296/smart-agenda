const { startServer } = require('../../src/server');

describe('server lifecycle', () => {
  it('listens on the configured port and closes HTTP and database resources once', async () => {
    const server = { close: jest.fn(callback => callback()) };
    const app = { listen: jest.fn((port, callback) => { callback(); return server; }) };
    const close = jest.fn(async () => undefined);
    const createApplication = jest.fn(() => ({ app, close, notificationWorker: { processPending: jest.fn() } }));
    const logger = { log: jest.fn(), error: jest.fn() };
    const config = { port: 4040, database: './data/test.sqlite', enabledNotificationChannels: [], notificationWorkerIntervalMs: 5000 };

    const running = await startServer({ config, createApplication, logger, registerSignalHandlers: false });
    await running.shutdown('test');
    await running.shutdown('test-again');

    expect(createApplication).toHaveBeenCalledWith({ database: config.database });
    expect(app.listen).toHaveBeenCalledWith(4040, expect.any(Function));
    expect(server.close).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });
});
