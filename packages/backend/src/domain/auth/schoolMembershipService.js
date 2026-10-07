function createSchoolMembershipService(database) {
  function fail(code, message, status = 400) {
    const error = new Error(message);
    error.code = code;
    error.status = status;
    throw error;
  }

  async function getAsync(userId, schoolId) {
    return database.one(`SELECT id, user_id AS "userId", school_id AS "schoolId", role, status,
      granted_by AS "grantedBy", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM user_school_memberships WHERE user_id = $1 AND school_id = $2`, [userId, schoolId]);
  }

  async function hasAccessAsync(userId, schoolId) {
    return Boolean(await database.one(`SELECT id FROM user_school_memberships
      WHERE user_id = $1 AND school_id = $2 AND role = 'coordinator' AND status = 'active'`, [userId, schoolId]));
  }

  async function listSchoolsAsync(userId) {
    return database.query(`SELECT s.id, s.name, s.timezone, s.locale, s.status
      FROM schools s INNER JOIN user_school_memberships m ON m.school_id = s.id
      WHERE m.user_id = $1 AND m.role = 'coordinator' AND m.status = 'active' AND s.status = 'active'
      ORDER BY s.name`, [userId]);
  }

  async function grantAsync({ userId, schoolId, grantedBy }) {
    const user = await database.one('SELECT id, role FROM users WHERE id = $1', [userId]);
    if (!user || user.role !== 'coordinator') fail('COORDINATOR_NOT_FOUND', 'Only coordinator users can receive school membership.', 404);
    if (!await database.one("SELECT id FROM schools WHERE id = $1 AND status = 'active'", [schoolId])) fail('SCHOOL_NOT_FOUND', 'School not found.', 404);
    const now = new Date().toISOString();
    const existing = await database.one('SELECT id FROM user_school_memberships WHERE user_id = $1 AND school_id = $2', [userId, schoolId]);
    if (existing) {
      await database.execute("UPDATE user_school_memberships SET status = 'active', granted_by = $1, updated_at = $2 WHERE id = $3", [grantedBy || null, now, existing.id]);
      return getAsync(userId, schoolId);
    }
    const id = `school-membership-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await database.execute(`INSERT INTO user_school_memberships (id, user_id, school_id, role, status, granted_by, created_at, updated_at)
      VALUES ($1, $2, $3, 'coordinator', 'active', $4, $5, $6)`, [id, userId, schoolId, grantedBy || null, now, now]);
    return getAsync(userId, schoolId);
  }

  async function revokeAsync(userId, schoolId) {
    const result = await database.execute("UPDATE user_school_memberships SET status = 'revoked', updated_at = $1 WHERE user_id = $2 AND school_id = $3 AND status = 'active'", [new Date().toISOString(), userId, schoolId]);
    return result.changes > 0;
  }

  return { getAsync, hasAccessAsync, listSchoolsAsync, grantAsync, revokeAsync };
}

module.exports = { createSchoolMembershipService };