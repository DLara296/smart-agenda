function createSchoolMembershipService(database) {
  function fail(code, message, status = 400) {
    const error = new Error(message);
    error.code = code;
    error.status = status;
    throw error;
  }

  function map(row) {
    return row ? {
      id: row.id,
      userId: row.userId,
      schoolId: row.schoolId,
      role: row.role,
      status: row.status,
      grantedBy: row.grantedBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    } : null;
  }

  function get(userId, schoolId) {
    return map(database.prepare(`
      SELECT id, user_id AS userId, school_id AS schoolId, role, status,
        granted_by AS grantedBy, created_at AS createdAt, updated_at AS updatedAt
      FROM user_school_memberships WHERE user_id = ? AND school_id = ?
    `).get(userId, schoolId));
  }

  function hasAccess(userId, schoolId) {
    return Boolean(database.prepare(`
      SELECT id FROM user_school_memberships
      WHERE user_id = ? AND school_id = ? AND role = 'coordinator' AND status = 'active'
    `).get(userId, schoolId));
  }

  function grant({ userId, schoolId, grantedBy }) {
    const user = database.prepare("SELECT id, role FROM users WHERE id = ?").get(userId);
    if (!user || user.role !== 'coordinator') fail('COORDINATOR_NOT_FOUND', 'Only coordinator users can receive school membership.', 404);
    if (!database.prepare("SELECT id FROM schools WHERE id = ? AND status = 'active'").get(schoolId)) fail('SCHOOL_NOT_FOUND', 'School not found.', 404);
    const now = new Date().toISOString();
    const existing = get(userId, schoolId);
    if (existing) {
      database.prepare("UPDATE user_school_memberships SET status = 'active', granted_by = ?, updated_at = ? WHERE id = ?").run(grantedBy || null, now, existing.id);
      return get(userId, schoolId);
    }
    const id = `school-membership-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    database.prepare(`
      INSERT INTO user_school_memberships (id, user_id, school_id, role, status, granted_by, created_at, updated_at)
      VALUES (?, ?, ?, 'coordinator', 'active', ?, ?, ?)
    `).run(id, userId, schoolId, grantedBy || null, now, now);
    return get(userId, schoolId);
  }

  function revoke(userId, schoolId) {
    const result = database.prepare("UPDATE user_school_memberships SET status = 'revoked', updated_at = ? WHERE user_id = ? AND school_id = ? AND status = 'active'").run(new Date().toISOString(), userId, schoolId);
    return result.changes > 0;
  }

  function list({ userId = null, schoolId = null } = {}) {
    const clauses = [];
    const values = [];
    if (userId) { clauses.push('user_id = ?'); values.push(userId); }
    if (schoolId) { clauses.push('school_id = ?'); values.push(schoolId); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    return database.prepare(`
      SELECT id, user_id AS userId, school_id AS schoolId, role, status,
        granted_by AS grantedBy, created_at AS createdAt, updated_at AS updatedAt
      FROM user_school_memberships ${where} ORDER BY created_at DESC
    `).all(...values).map(map);
  }

  return { get, hasAccess, grant, revoke, list };
}

module.exports = { createSchoolMembershipService };