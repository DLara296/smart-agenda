const { createInvitationService } = require('../../src/domain/family/invitationService');
const { createDatabase } = require('../../src/db/database');
const { createDatabaseContract, withTransaction } = require('../../src/db/databaseContract');
const os = require('os');
const path = require('path');
const fs = require('fs');

describe('admin invitation lifecycle', () => {
  it('enforces expiry, single-use acceptance, assigned scope, and revocation', async () => {
    const databasePath = path.join(os.tmpdir(), `smart-agenda-invitation-${process.pid}.db`);
    const storage = createDatabaseContract({ driver: 'sqlite', legacy: createDatabase(databasePath) });
    const service = createInvitationService(storage);
    const invitation = await service.issueAsync({ email: 'admin@example.com', role: 'coordinator', householdId: 'family-1', issuerId: 'admin-1', expiresAt: new Date(Date.now() + 60_000).toISOString() });

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

    const expired = await service.issueAsync({ email: 'expired@example.com', role: 'admin', issuerId: 'admin-1', expiresAt: new Date(Date.now() - 1000).toISOString() });
    const expiry = await withTransaction(storage, transaction => service.acceptAsync(expired.token, transaction));
    expect(expiry).toEqual({ expired: true });
    expect((await service.getAsync(expired.token)).status).toBe('expired');

    await storage.close();
    fs.rmSync(databasePath, { force: true });
  });
});
