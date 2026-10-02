const { createNotificationService } = require('../../src/domain/notification/notificationService');
const { createDatabase } = require('../../src/db/database');
const { createDatabaseContract } = require('../../src/db/databaseContract');

test('notification service queues idempotent sends and supports cancellation', async () => {
  const storage = createDatabaseContract({ driver: 'sqlite', legacy: createDatabase(':memory:') });
  const service = createNotificationService(storage);
  const input = { type: 'reminder', channel: 'email', scheduledFor: '2026-10-01T08:30:00Z', idempotencyKey: 'notify-1' };
  const first = await service.createAsync(input);
  const second = await service.createAsync(input);

  expect(first.status).toBe('queued');
  expect(second.id).toBe(first.id);
  expect((await service.cancelAsync(first.id)).status).toBe('cancelled');
  await storage.close();
});
