function createInvitationService(database) {
  async function issueAsync({ email, role, householdId = null, issuerId, expiresAt }, storage = database) {
    const token = `invite-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const id = `invitation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await storage.execute("INSERT INTO invitations (id, token, email, role, household_id, issuer_id, status, expires_at, created_at) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8)", [id, token, email, role, householdId, issuerId, expiresAt, new Date().toISOString()]);
    return getAsync(token, storage);
  }

  async function getAsync(token, storage = database) {
    const row = await storage.one('SELECT * FROM invitations WHERE token = $1', [token]);
    if (!row) throw new Error('Invitation not found');
    return toInvitation(row);
  }

  async function acceptAsync(token, storage = database) {
    const invitation = await getAsync(token, storage);
    if (invitation.status !== 'pending') throw new Error('Invitation is not available');
    if (new Date(invitation.expiresAt) <= new Date()) {
      await storage.execute("UPDATE invitations SET status = 'expired' WHERE token = $1 AND status = 'pending'", [token]);
      return { expired: true };
    }
    const accepted = await storage.execute("UPDATE invitations SET status = 'accepted' WHERE token = $1 AND status = 'pending'", [token]);
    if (accepted.changes !== 1) throw new Error('Invitation is not available');
    return { invitation: await getAsync(token, storage) };
  }

  async function revokeAsync(token, storage = database) {
    await getAsync(token, storage);
    const revoked = await storage.execute("UPDATE invitations SET status = 'revoked' WHERE token = $1 AND status = 'pending'", [token]);
    if (revoked.changes !== 1) throw new Error('Invitation is not available');
    return getAsync(token, storage);
  }

  function toInvitation(row) {
    return { id: row.id, token: row.token, email: row.email, role: row.role, householdId: row.household_id, issuerId: row.issuer_id, status: row.status, expiresAt: row.expires_at };
  }

  return { issueAsync, getAsync, acceptAsync, revokeAsync };
}

module.exports = { createInvitationService };
