function createInvitationService(database) {
  function issue({ email, role, householdId = null, issuerId, expiresAt }) {
    const token = `invite-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const id = `invitation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    database.prepare(`INSERT INTO invitations (id, token, email, role, household_id, issuer_id, status, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`)
      .run(id, token, email, role, householdId, issuerId, expiresAt, new Date().toISOString());
    return get(token);
  }

  function get(token) {
    const row = database.prepare('SELECT * FROM invitations WHERE token = ?').get(token);
    if (!row) throw new Error('Invitation not found');
    return toInvitation(row);
  }

  function accept(token) {
    const invitation = get(token);
    if (invitation.status === 'revoked') throw new Error('Invitation is revoked');
    if (invitation.status === 'accepted') throw new Error('Invitation is single-use and already accepted');
    if (new Date(invitation.expiresAt) <= new Date()) {
      database.prepare("UPDATE invitations SET status = 'expired' WHERE token = ?").run(token);
      throw new Error('Invitation is expired');
    }
    database.prepare("UPDATE invitations SET status = 'accepted' WHERE token = ?").run(token);
    return get(token);
  }

  function revoke(token) {
    get(token);
    database.prepare("UPDATE invitations SET status = 'revoked' WHERE token = ?").run(token);
    return get(token);
  }

  function toInvitation(row) {
    return { id: row.id, token: row.token, email: row.email, role: row.role, householdId: row.household_id, issuerId: row.issuer_id, status: row.status, expiresAt: row.expires_at };
  }

  return { issue, get, accept, revoke };
}

module.exports = { createInvitationService };
