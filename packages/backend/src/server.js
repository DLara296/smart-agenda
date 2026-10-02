const { createAppAsync } = require('./app');
const { loadConfig } = require('./config');

async function startServer({ config = loadConfig(), createApplication = createAppAsync, logger = console, registerSignalHandlers = true } = {}) {
  const instance = await createApplication({ database: config.database });
  const server = instance.app.listen(config.port, () => {
    logger.log(`Server running on port ${config.port}`);
    logger.log(`Smart Agenda API available at http://localhost:${config.port}/v1`);
  });
  const workerTimer = config.enabledNotificationChannels.length > 0 && config.notificationWorkerIntervalMs > 0
    ? setInterval(() => {
      instance.notificationWorker.processPending().then(summary => {
        if (summary.processed > 0) logger.log(JSON.stringify({ event: 'notification_dispatch_batch', ...summary }));
      }).catch(() => logger.error(JSON.stringify({ event: 'notification_dispatch_error', code: 'WORKER_BATCH_FAILED' })));
    }, config.notificationWorkerIntervalMs)
    : null;
  workerTimer?.unref();

  let shutdownPromise = null;
  const shutdown = signal => {
    if (shutdownPromise) return shutdownPromise;
    shutdownPromise = (async () => {
      if (workerTimer) clearInterval(workerTimer);
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      await instance.close();
      logger.log(JSON.stringify({ event: 'server_shutdown', signal }));
    })();
    return shutdownPromise;
  };

  if (registerSignalHandlers) {
    for (const signal of ['SIGTERM', 'SIGINT']) {
      process.once(signal, () => shutdown(signal).catch(error => {
        logger.error(JSON.stringify({ event: 'server_shutdown_error', signal, message: error.message }));
        process.exitCode = 1;
      }));
    }
  }

  return { ...instance, server, shutdown };
}

module.exports = { startServer };
