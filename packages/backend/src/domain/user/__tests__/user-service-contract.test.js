const { createUserService } = require('../userService');
const { createDatabase } = require('../../../db/database');
const { createDatabaseContract } = require('../../../db/databaseContract');

describe('user service database contract', () => {
  it('exposes bootstrap, profile, and preference operations asynchronously', async () => {
    const legacy = createDatabase(':memory:');
    const service = createUserService(createDatabaseContract({ driver: 'sqlite', legacy }));

    expect(service.ensureUser).toBeUndefined();
    expect(service.getUser).toBeUndefined();
    expect(service.ensureUserAsync).toEqual(expect.any(Function));
    expect(service.updateUserAsync).toEqual(expect.any(Function));
    expect(service.updateNotificationPreferencesAsync).toEqual(expect.any(Function));
    expect(service.updateAppearancePreferencesAsync).toEqual(expect.any(Function));
    expect(service.updateUser).toBeUndefined();
    expect(service.getNotificationPreferences).toBeUndefined();
    expect(service.updateNotificationPreferences).toBeUndefined();
    expect(service.getAppearancePreferences).toBeUndefined();
    expect(service.updateAppearancePreferences).toBeUndefined();
    await expect(service.ensureUserAsync({ id: 'async-user', name: 'Async User' })).resolves.toEqual(expect.objectContaining({ id: 'async-user', name: 'Async User' }));
    legacy.close();
  });
});
