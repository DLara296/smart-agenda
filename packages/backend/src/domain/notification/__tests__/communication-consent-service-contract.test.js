const { createCommunicationConsentService } = require('../communicationConsentService');
const { createDatabase } = require('../../../db/database');
const { createDatabaseContract } = require('../../../db/databaseContract');

describe('communication consent database contract', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('exposes async consent operations and preserves append-only grant/revoke state', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-01T12:00:00.000Z'));
    jest.spyOn(Math, 'random').mockReturnValueOnce(0.9).mockReturnValueOnce(0.1);
    const legacy = createDatabase(':memory:');
    const storage = createDatabaseContract({ driver: 'sqlite', legacy });
    const service = createCommunicationConsentService(storage);

    expect(service.record).toBeUndefined();
    expect(service.hasConsent).toBeUndefined();
    expect(service.current).toBeUndefined();
    await storage.execute("INSERT INTO family_records (id, display_name, status, created_at, updated_at) VALUES ('family-consent', 'Consent Family', 'active', $1, $1)", [new Date().toISOString()]);
    await storage.execute("INSERT INTO guardians (id, family_id, name, supported_languages, status, created_at, updated_at) VALUES ('guardian-consent', 'family-consent', 'Guardian', '[]', 'active', $1, $1)", [new Date().toISOString()]);

    const grant = await service.recordAsync({ type: 'guardian', id: 'guardian-consent', channel: 'email', status: 'granted', source: 'test' });
    await expect(service.hasConsentAsync({ type: 'guardian', id: 'guardian-consent', channel: 'email' })).resolves.toBe(true);
    const revocation = await service.recordAsync({ type: 'guardian', id: 'guardian-consent', channel: 'email', status: 'revoked', source: 'test' });
    expect(Date.parse(revocation.capturedAt)).toBeGreaterThan(Date.parse(grant.capturedAt));
    await expect(service.currentAsync({ type: 'guardian', id: 'guardian-consent', channel: 'email' })).resolves.toEqual(expect.objectContaining({ status: 'revoked' }));
    await expect(storage.one('SELECT COUNT(*) AS count FROM communication_consents')).resolves.toEqual({ count: 2 });

    const tiedAt = '2026-10-01T13:00:00.000Z';
    await storage.execute("INSERT INTO communication_consents (id, guardian_id, channel, status, source, created_at) VALUES ('consent-z-grant', 'guardian-consent', 'sms', 'granted', 'test', $1)", [tiedAt]);
    await storage.execute("INSERT INTO communication_consents (id, guardian_id, channel, status, source, created_at) VALUES ('consent-a-revoke', 'guardian-consent', 'sms', 'revoked', 'test', $1)", [tiedAt]);
    await expect(service.currentAsync({ type: 'guardian', id: 'guardian-consent', channel: 'sms' })).resolves.toEqual(expect.objectContaining({ status: 'revoked' }));

    await storage.close();
  });
});