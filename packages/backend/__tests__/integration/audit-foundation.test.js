const { createAuditRepository } = require('../../src/domain/audit/auditRepository');
const { createDatabase } = require('../../src/db/database');

describe('audit foundation', () => {
  it('stores actor, action, entity, and provenance metadata', () => {
    const database = createDatabase(':memory:');
    const audit = createAuditRepository(database);
    const record = audit.record({
      entityType: 'school',
      entityId: 'school-1',
      action: 'created',
      actorId: 'admin-1',
      metadata: { source: 'test' },
    });

    expect(record).toEqual(expect.objectContaining({
      entityType: 'school',
      entityId: 'school-1',
      action: 'created',
      actorId: 'admin-1',
      metadata: { source: 'test' },
    }));

    database.close();
  });
});
