require('dotenv').config();
const { createApp } = require('./app');
const { loadConfig } = require('./config');

const config = loadConfig();
const PORT = config.port;
const { app, notificationWorker } = createApp({ database: config.database });

if (config.enabledNotificationChannels.length > 0 && config.notificationWorkerIntervalMs > 0) {
  const workerTimer = setInterval(() => {
    notificationWorker.processPending().then(summary => {
      if (summary.processed > 0) console.log(JSON.stringify({ event: 'notification_dispatch_batch', ...summary }));
    }).catch(() => console.error(JSON.stringify({ event: 'notification_dispatch_error', code: 'WORKER_BATCH_FAILED' })));
  }, config.notificationWorkerIntervalMs);
  workerTimer.unref();
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Smart Agenda API available at http://localhost:${PORT}/v1`);
});