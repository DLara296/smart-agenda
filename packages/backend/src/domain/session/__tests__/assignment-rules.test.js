const { createAssignmentService } = require('../assignmentService');
const { createDatabase } = require('../../../db/database');
const { createDatabaseContract } = require('../../../db/databaseContract');

describe('assignment rules', () => {
  it('returns the existing assignment for a repeated idempotency key', async () => {
    const storage = createDatabaseContract({ driver: 'sqlite', legacy: createDatabase(':memory:') });
    const service = createAssignmentService(storage);
    const input = { sessionId: 'session-1', groupId: 'group-1', guardianId: 'guardian-1', teacherId: 'teacher-1', language: 'en', idempotencyKey: 'assignment-1' };

    const first = await service.createAsync(input);
    const second = await service.createAsync(input);

    expect(second.id).toBe(first.id);
    expect(await service.listBySessionAsync('session-1')).toHaveLength(1);
    await storage.close();
  });
});
