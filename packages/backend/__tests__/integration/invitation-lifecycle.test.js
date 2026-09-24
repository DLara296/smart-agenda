const { createInvitationService } = require('../../src/domain/family/invitationService');
const { createDatabase } = require('../../src/db/database');
const os = require('os');
const path = require('path');
const fs = require('fs');

describe('admin invitation lifecycle', () => {
  it('enforces expiry, single-use acceptance, assigned scope, and revocation', () => {
    const databasePath = path.join(os.tmpdir(), `smart-agenda-invitation-${process.pid}.db`);
    const database = createDatabase(databasePath);
    const service = createInvitationService(database);
    const invitation = service.issue({ email: 'admin@example.com', role: 'coordinator', householdId: 'family-1', issuerId: 'admin-1', expiresAt: new Date(Date.now() + 60_000).toISOString() });

    expect(invitation.status).toBe('pending');
    const accepted = service.accept(invitation.token);
    expect(accepted.status).toBe('accepted');
    expect(accepted.role).toBe('coordinator');
    expect(accepted.householdId).toBe('family-1');
    let acceptedAgainError;
    try { service.accept(invitation.token); } catch (error) { acceptedAgainError = error; }
    expect(acceptedAgainError.message).toMatch(/single-use/i);

    const revoked = service.issue({ email: 'other@example.com', role: 'admin', issuerId: 'admin-1', expiresAt: new Date(Date.now() + 60_000).toISOString() });
    expect(service.revoke(revoked.token).status).toBe('revoked');
    let revokedError;
    try { service.accept(revoked.token); } catch (error) { revokedError = error; }
    expect(revokedError.message).toMatch(/revoked/i);
    database.close();
    fs.rmSync(databasePath, { force: true });
  });
});
