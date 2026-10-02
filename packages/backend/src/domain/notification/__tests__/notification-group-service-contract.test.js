const { createNotificationGroupService } = require('../notificationGroupService');
const { createDatabase } = require('../../../db/database');
const { createDatabaseContract } = require('../../../db/databaseContract');

describe('notification group database contract', () => {
  it('exposes async contract methods without legacy synchronous operations', async () => {
    const storage = createDatabaseContract({ driver: 'sqlite', legacy: createDatabase(':memory:') });
    const service = createNotificationGroupService(storage);

    expect(service.listRecipientsAsync).toEqual(expect.any(Function));
    expect(service.saveAsync).toEqual(expect.any(Function));
    expect(service.resolveRecipientsAsync).toEqual(expect.any(Function));
    expect(service.listRecipients).toBeUndefined();
    expect(service.save).toBeUndefined();
    await storage.close();
  });
});
