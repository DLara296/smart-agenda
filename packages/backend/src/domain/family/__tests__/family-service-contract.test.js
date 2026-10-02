const { createFamilyService } = require('../familyService');
const { createDatabase } = require('../../../db/database');
const { createDatabaseContract } = require('../../../db/databaseContract');

describe('family service database contract', () => {
  it('exposes async contract methods without legacy synchronous operations', async () => {
    const storage = createDatabaseContract({ driver: 'sqlite', legacy: createDatabase(':memory:') });
    const service = createFamilyService(storage);

    expect(service.createAsync).toEqual(expect.any(Function));
    expect(service.getDetailsAsync).toEqual(expect.any(Function));
    expect(service.create).toBeUndefined();
    expect(service.getDetails).toBeUndefined();
    await expect(service.getDetailsAsync('missing-family')).resolves.toBeNull();
    await storage.close();
  });
});
