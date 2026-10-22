const { createSessionService } = require('../sessionService');
const { createDatabase } = require('../../../db/database');
const { createDatabaseContract } = require('../../../db/databaseContract');

describe('session service database contract', () => {
  it('exposes async contract methods without legacy synchronous operations', async () => {
    const storage = createDatabaseContract({ driver: 'sqlite', legacy: createDatabase(':memory:') });
    const service = createSessionService(storage);

    expect(service.createAsync).toEqual(expect.any(Function));
    expect(service.getAsync).toEqual(expect.any(Function));
    expect(service.updateAsync).toEqual(expect.any(Function));
    expect(service.create).toBeUndefined();
    expect(service.get).toBeUndefined();
    await expect(service.getAsync('missing-session')).resolves.toBeNull();
    await storage.close();
  });
});
