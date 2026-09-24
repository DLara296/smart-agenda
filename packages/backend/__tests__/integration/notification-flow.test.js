const { createNotificationService } = require('../../src/domain/notification/notificationService');
const { createDatabase } = require('../../src/db/database');

test('notification service records provider failure and retry', () => {
  const database = createDatabase(':memory:');
  const service = createNotificationService(database);
  const notification = service.create({ type: 'reminder', channel: 'email', scheduledFor: '2026-10-01T08:30:00Z', idempotencyKey: 'notify-2' });

  expect(service.fail(notification.id, 'provider unavailable').status).toBe('failed');
  expect(service.retry(notification.id).status).toBe('queued');
});
