const { createNotificationService } = require('../../src/domain/notification/notificationService');
const { createDatabase } = require('../../src/db/database');
const { createDatabaseContract } = require('../../src/db/databaseContract');

test('notification service records provider failure and retry', async () => {
  const storage = createDatabaseContract({ driver: 'sqlite', legacy: createDatabase(':memory:') });
  const service = createNotificationService(storage);
  const notification = await service.createAsync({ type: 'reminder', channel: 'email', scheduledFor: '2026-10-01T08:30:00Z', idempotencyKey: 'notify-2' });

  expect((await service.updateAsync(notification.id, 'failed', 'provider unavailable')).status).toBe('failed');
  expect((await service.retryAsync(notification.id)).status).toBe('queued');
  await storage.close();
});
