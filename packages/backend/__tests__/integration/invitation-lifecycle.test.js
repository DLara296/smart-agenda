const { createInvitationService } = require('../../src/domain/family/invitationService');
const crypto = require('crypto');
const { createDatabase } = require('../../src/db/database');
const { createDatabaseContract, withTransaction } = require('../../src/db/databaseContract');
const os = require('os');
const path = require('path');
const fs = require('fs');

describe('admin invitation lifecycle', () => {
  it('generates invitation tokens from 32 cryptographically random bytes', async () => {
    const database = createDatabaseContract({ driver: 'sqlite', legacy: createDatabase(':memory:') });
    const service = createInvitationService(database);
    const randomBytes = jest.spyOn(crypto, 'randomBytes').mockReturnValue(Buffer.alloc(32, 0xab));
    try {
      await database.execute("INSERT INTO schools (id, name, timezone, locale, status, created_at, updated_at) VALUES ('school-1', 'School', 'UTC', 'en', 'active', $1, $1)", [new Date().toISOString()]);
      const invitation = await service.issueAsync({ email: 'secure@example.com', role: 'coordinator', schoolId: 'school-1', issuerId: 'admin-1', expiresAt: new Date(Date.now() + 60_000).toISOString() });

      expect(randomBytes).toHaveBeenCalledWith(32);
      expect(invitation.token).toBe(`invite-${'ab'.repeat(32)}`);
    } finally {
      randomBytes.mockRestore();
      await database.close();
    }
  });

  it('rejects missing, malformed, or expired invitation deadlines', async () => {
    const database = createDatabaseContract({ driver: 'sqlite', legacy: createDatabase(':memory:') });
    const service = createInvitationService(database);
    try {
      const valid = { email: 'expiry@example.com', role: 'admin', issuerId: 'admin-1' };
      for (const expiresAt of [undefined, 'not-a-date', new Date(Date.now() - 1000).toISOString()]) {
        await expect(service.issueAsync({ ...valid, expiresAt })).rejects.toMatchObject({ code: 'INVITATION_EXPIRY_INVALID', status: 400 });
      }
    } finally {
      await database.close();
    }
  });

  it('enforces expiry, single-use acceptance, assigned scope, and revocation', async () => {
    const databasePath = path.join(os.tmpdir(), `smart-agenda-invitation-${process.pid}.db`);
    const storage = createDatabaseContract({ driver: 'sqlite', legacy: createDatabase(databasePath) });
    const service = createInvitationService(storage);
    const now = new Date().toISOString();
    await storage.execute("INSERT INTO schools (id, name, timezone, locale, status, created_at, updated_at) VALUES ('school-1', 'School', 'UTC', 'en', 'active', $1, $1)", [now]);
    await storage.execute("INSERT INTO family_records (id, display_name, status, created_at, updated_at) VALUES ('family-1', 'Family', 'active', $1, $1)", [now]);
    const invitation = await service.issueAsync({ email: 'admin@example.com', role: 'coordinator', householdId: 'family-1', schoolId: 'school-1', issuerId: 'admin-1', expiresAt: new Date(Date.now() + 60_000).toISOString() });

    expect(invitation.status).toBe('pending');
    const acceptance = await withTransaction(storage, transaction => service.acceptAsync(invitation.token, transaction));
    const accepted = acceptance.invitation;
    expect(accepted.status).toBe('accepted');
    expect(accepted.role).toBe('coordinator');
    expect(accepted.householdId).toBe('family-1');
    await expect(withTransaction(storage, transaction => service.acceptAsync(invitation.token, transaction))).rejects.toThrow(/not available/i);

    const revoked = await service.issueAsync({ email: 'other@example.com', role: 'admin', issuerId: 'admin-1', expiresAt: new Date(Date.now() + 60_000).toISOString() });
    const revokedInvitation = await service.revokeAsync(revoked.token);
    expect(revokedInvitation.status).toBe('revoked');
    await expect(withTransaction(storage, transaction => service.acceptAsync(revoked.token, transaction))).rejects.toThrow(/not available/i);

    const expired = await service.issueAsync({ email: 'expired@example.com', role: 'admin', issuerId: 'admin-1', expiresAt: new Date(Date.now() + 60_000).toISOString() });
    await storage.execute('UPDATE invitations SET expires_at = $1 WHERE token = $2', [new Date(Date.now() - 1000).toISOString(), expired.token]);
    const expiry = await withTransaction(storage, transaction => service.acceptAsync(expired.token, transaction));
    expect(expiry).toEqual({ expired: true });
    expect((await service.getAsync(expired.token)).status).toBe('expired');

    await storage.close();
    fs.rmSync(databasePath, { force: true });
  });
});
