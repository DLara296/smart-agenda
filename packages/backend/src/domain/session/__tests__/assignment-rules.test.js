const { createAssignmentService } = require('../assignmentService');
const { createDatabase } = require('../../../db/database');

describe('assignment rules', () => {
  it('returns the existing assignment for a repeated idempotency key', () => {
    const database = createDatabase(':memory:');
    const service = createAssignmentService(database);
    const input = { sessionId: 'session-1', groupId: 'group-1', guardianId: 'guardian-1', teacherId: 'teacher-1', language: 'en', idempotencyKey: 'assignment-1' };

    const first = service.create(input);
    const second = service.create(input);

    expect(second.id).toBe(first.id);
    expect(service.listBySession('session-1')).toHaveLength(1);
  });
});
