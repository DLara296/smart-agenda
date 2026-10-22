const crypto = require('crypto');

function createInvitationService(database) {
  function fail(code, message, status = 400) {
    const error = new Error(message);
    error.code = code;
    error.status = status;
    throw error;
  }

  async function issueAsync({ email, role, householdId = null, schoolId = null, issuerId, expiresAt }, storage = database) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) fail('INVITATION_EMAIL_INVALID', 'Enter a valid invitation email.');
    if (!['admin', 'coordinator'].includes(role)) fail('INVITATION_ROLE_INVALID', 'Only administrator or coordinator invitations are supported.');
    const expiryTimestamp = Date.parse(expiresAt || '');
    if (!Number.isFinite(expiryTimestamp) || expiryTimestamp <= Date.now()) fail('INVITATION_EXPIRY_INVALID', 'Invitation expiry must be a future date.');
    if (role === 'coordinator' && !schoolId) fail('INVITATION_SCHOOL_REQUIRED', 'Choose a school for the coordinator invitation.');
    if (schoolId && !await storage.one("SELECT id FROM schools WHERE id = $1 AND status = 'active'", [schoolId])) fail('SCHOOL_NOT_FOUND', 'The invitation school is not active.', 404);
    if (householdId && !await storage.one("SELECT id FROM family_records WHERE id = $1 AND status = 'active'", [householdId])) fail('HOUSEHOLD_NOT_FOUND', 'The invitation household is not active.', 404);
    const token = `invite-${crypto.randomBytes(32).toString('hex')}`;
    const id = `invitation-${crypto.randomUUID()}`;
    await storage.execute("INSERT INTO invitations (id, token, email, role, household_id, school_id, issuer_id, status, expires_at, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9)", [id, token, normalizedEmail, role, householdId, schoolId, issuerId, expiresAt, new Date().toISOString()]);
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

  async function linkAcceptedUserAsync(token, userId, storage = database) {
    const linked = await storage.execute("UPDATE invitations SET accepted_user_id = $1 WHERE token = $2 AND status = 'accepted' AND accepted_user_id IS NULL", [userId, token]);
    if (linked.changes !== 1) fail('INVITATION_ACCOUNT_LINK_FAILED', 'The invitation could not be linked to this account.', 409);
    return getAsync(token, storage);
  }

  function toInvitation(row) {
    return { id: row.id, token: row.token, email: row.email, role: row.role, householdId: row.household_id, schoolId: row.school_id || null, acceptedUserId: row.accepted_user_id || null, issuerId: row.issuer_id, status: row.status, expiresAt: row.expires_at };
  }

  return { issueAsync, getAsync, acceptAsync, revokeAsync, linkAcceptedUserAsync };
}

module.exports = { createInvitationService };
