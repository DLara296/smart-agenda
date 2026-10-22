const { createAuditRepository } = require('../../src/domain/audit/auditRepository');
const { createDatabase } = require('../../src/db/database');
const { createDatabaseContract } = require('../../src/db/databaseContract');

describe('audit foundation', () => {
  it('stores actor, action, entity, and provenance metadata', async () => {
    const storage = createDatabaseContract({ driver: 'sqlite', legacy: createDatabase(':memory:') });
    const audit = createAuditRepository(storage);
    const record = await audit.recordAsync({
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

    await storage.close();
  });
});
