const { createAuthService } = require('../authService');
const { createDatabase } = require('../../../db/database');
const { createDatabaseContract } = require('../../../db/databaseContract');

describe('authentication service database contract', () => {
  it('exposes only asynchronous auth operations', async () => {
    const legacy = createDatabase(':memory:');
    const service = createAuthService(createDatabaseContract({ driver: 'sqlite', legacy }));

    expect(service.registerAsync).toEqual(expect.any(Function));
    expect(service.signInAsync).toEqual(expect.any(Function));
    expect(service.createSessionAsync).toEqual(expect.any(Function));
    expect(service.getUserByTokenAsync).toEqual(expect.any(Function));
    expect(service.revokeAsync).toEqual(expect.any(Function));
    expect(service.ensureDevelopmentAdmin).toBeUndefined();
    expect(service.provisionInitialAdmin).toBeUndefined();
    expect(service.ensureDevelopmentAdminAsync).toEqual(expect.any(Function));
    expect(service.provisionInitialAdminAsync).toEqual(expect.any(Function));
    expect(service.register).toBeUndefined();
    expect(service.signIn).toBeUndefined();
    expect(service.createSession).toBeUndefined();
    expect(service.getUserByToken).toBeUndefined();
    expect(service.revoke).toBeUndefined();

    const user = await service.registerAsync({ name: 'Async Guest', email: 'async@example.test', password: 'correct-horse' });
    expect(await service.signInAsync({ email: user.email, password: 'correct-horse' })).toEqual(expect.objectContaining({ id: user.id }));
    await legacy.close();
  });
  
  it('provisions an initial admin asynchronously and idempotently', async () => {
    const storage = createDatabaseContract({ driver: 'sqlite', legacy: createDatabase(':memory:') });
    const service = createAuthService(storage);
  
    const first = await service.provisionInitialAdminAsync({ email: 'owner@example.test', password: 'secure-bootstrap-password' });
    const second = await service.provisionInitialAdminAsync({ email: 'other@example.test', password: 'different-bootstrap-password' });
  
    expect(first).toEqual(expect.objectContaining({ email: 'owner@example.test', role: 'admin' }));
    expect(second.id).toBe(first.id);
    await storage.close();
  });
});