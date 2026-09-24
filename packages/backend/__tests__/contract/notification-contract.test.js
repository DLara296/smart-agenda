const { createNotificationService } = require('../../src/domain/notification/notificationService');
const { createDatabase } = require('../../src/db/database');

test('notification service queues idempotent sends and supports cancellation', () => {
  const database = createDatabase(':memory:');
  const service = createNotificationService(database);
  const input = { type: 'reminder', channel: 'email', scheduledFor: '2026-10-01T08:30:00Z', idempotencyKey: 'notify-1' };
  const first = service.create(input);
  const second = service.create(input);

  expect(first.status).toBe('queued');
  expect(second.id).toBe(first.id);
  expect(service.cancel(first.id).status).toBe('cancelled');
});
