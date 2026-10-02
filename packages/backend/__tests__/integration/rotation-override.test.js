const { createRotationService } = require('../../src/domain/session/rotationService');
const { createDatabase } = require('../../src/db/database');
const { createDatabaseContract } = require('../../src/db/databaseContract');

describe('rotation overrides', () => {
  it('stores one-off override provenance without changing the baseline rule', async () => {
    const storage = createDatabaseContract({ driver: 'sqlite', legacy: createDatabase(':memory:') });
    const service = createRotationService(storage);
    await service.createRuleAsync({ id: 'rule-1', schoolId: 'school-1', pattern: ['group-1', 'group-2'] });

    const override = await service.createOverrideAsync({
      ruleId: 'rule-1', sessionId: 'session-1', kind: 'one-off',
      reason: 'Holiday schedule', approverId: 'admin-1', affectedScope: 'session-1',
    });

    expect(override.reason).toBe('Holiday schedule');
    expect(override.approverId).toBe('admin-1');
    expect((await service.getRuleAsync('rule-1')).pattern).toEqual(['group-1', 'group-2']);
    await storage.close();
  });
});
