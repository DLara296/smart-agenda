function createEntityManagementService(database, auditRepository) {
  const fail = (code, message, status = 400, details = null) => {
    const error = new Error(message);
    error.code = code;
    error.status = status;
    error.details = details;
    throw error;
  };

  async function impactAsync(entityType, id, storage = database) {
    const count = async (sql, values = [id]) => Number((await storage.one(sql, values))?.count || 0);
    if (entityType === 'school') {
      if (!await storage.one("SELECT id FROM schools WHERE id = $1 AND status = 'active'", [id])) return null;
      const [grades, groups, teachers, students, sessions, notificationGroups] = await Promise.all([
        count("SELECT COUNT(*) AS count FROM grades WHERE school_id = $1 AND status = 'active'"),
        count("SELECT COUNT(*) AS count FROM groups g JOIN grades gr ON gr.id = g.grade_id WHERE gr.school_id = $1 AND gr.status = 'active' AND g.status = 'active'"),
        count("SELECT COUNT(*) AS count FROM teachers WHERE school_id = $1 AND status = 'active'"),
        count("SELECT COUNT(*) AS count FROM students WHERE school_id = $1 AND status = 'active'"),
        count("SELECT COUNT(*) AS count FROM reading_sessions WHERE school_id = $1 AND status <> 'cancelled'"),
        count('SELECT COUNT(*) AS count FROM notification_groups WHERE school_id = $1'),
      ]);
      return { grades, groups, teachers, students, sessions, notificationGroups };
    }
    if (entityType === 'family') {
      if (!await storage.one("SELECT id FROM family_records WHERE id = $1 AND status = 'active'", [id])) return null;
      const [guardians, students, linkedAccounts, invitations] = await Promise.all([
        count("SELECT COUNT(*) AS count FROM guardians WHERE family_id = $1 AND status = 'active'"),
        count("SELECT COUNT(*) AS count FROM students WHERE family_id = $1 AND status = 'active'"),
        count("SELECT COUNT(*) AS count FROM users WHERE family_id = $1 AND status = 'active'"),
        count("SELECT COUNT(*) AS count FROM invitations WHERE household_id = $1 AND status IN ('pending', 'sent')"),
      ]);
      return { guardians, students, linkedAccounts, invitations };
    }
    return null;
  }

  async function writeAudit(entityType, entityId, actorId, metadata, storage) {
    const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await storage.execute('INSERT INTO audit_records (id, entity_type, entity_id, action, actor_id, metadata, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)', [id, entityType, entityId, 'archived', actorId, JSON.stringify(metadata), new Date().toISOString()]);
  }

  async function archiveTeacherAsync(id, actorId, storage = database) {
    return storage.transaction(async transaction => {
      const teacher = await transaction.one("SELECT id, name FROM teachers WHERE id = $1 AND status = 'active'", [id]);
      if (!teacher) return null;
      await transaction.execute("UPDATE teachers SET status = 'inactive', updated_at = $1 WHERE id = $2", [new Date().toISOString(), id]);
      await writeAudit('teacher', id, actorId, { policy: 'soft_delete_preserve_assignments_and_group_memberships' }, transaction);
      return teacher;
    });
  }

  async function archiveStudentAsync(id, actorId, storage = database) {
    return storage.transaction(async transaction => {
      const student = await transaction.one("SELECT id, name FROM students WHERE id = $1 AND status = 'active'", [id]);
      if (!student) return null;
      await transaction.execute("UPDATE students SET status = 'inactive', updated_at = $1 WHERE id = $2", [new Date().toISOString(), id]);
      await writeAudit('student', id, actorId, { policy: 'soft_delete_preserve_family_and_history_references' }, transaction);
      return student;
    });
  }

  async function archiveSchoolAsync(id, actorId, storage = database) {
    return storage.transaction(async transaction => {
      const school = await transaction.one("SELECT id, name FROM schools WHERE id = $1 AND status = 'active'", [id]);
      if (!school) return null;
      const counts = await impactAsync('school', id, transaction);
      const blockers = counts.teachers + counts.students + counts.sessions + counts.notificationGroups;
      if (blockers > 0) fail('SCHOOL_DELETE_BLOCKED', 'This school still has active teachers, students, reading sessions, or notification groups. Resolve those records before deleting the school.', 409, counts);
      const now = new Date().toISOString();
      await transaction.execute('UPDATE groups SET status = \'inactive\', updated_at = $1 WHERE grade_id IN (SELECT id FROM grades WHERE school_id = $2)', [now, id]);
      await transaction.execute("UPDATE grades SET status = 'inactive', updated_at = $1 WHERE school_id = $2", [now, id]);
      await transaction.execute("UPDATE schools SET status = 'inactive', updated_at = $1 WHERE id = $2", [now, id]);
      await writeAudit('school', id, actorId, { policy: 'archive_school_grades_groups', impact: counts }, transaction);
      return school;
    });
  }

  async function archiveFamilyAsync(id, actorId, storage = database) {
    return storage.transaction(async transaction => {
      const family = await transaction.one("SELECT id, display_name AS name FROM family_records WHERE id = $1 AND status = 'active'", [id]);
      if (!family) return null;
      const counts = await impactAsync('family', id, transaction);
      if (counts.linkedAccounts || counts.invitations) fail('FAMILY_DELETE_BLOCKED', 'This family has linked accounts or outstanding invitations. Resolve them before deleting the family.', 409, counts);
      const now = new Date().toISOString();
      await transaction.execute("UPDATE guardians SET status = 'inactive', updated_at = $1 WHERE family_id = $2 AND status = 'active'", [now, id]);
      await transaction.execute("UPDATE students SET status = 'inactive', updated_at = $1 WHERE family_id = $2 AND status = 'active'", [now, id]);
      await transaction.execute("UPDATE family_records SET status = 'inactive', updated_at = $1 WHERE id = $2", [now, id]);
      await writeAudit('family', id, actorId, { policy: 'archive_family_guardians_and_students', impact: counts }, transaction);
      return family;
    });
  }

  async function archiveSessionAsync(id, actorId, notificationService, storage = database) {
    return storage.transaction(async transaction => {
      const session = await transaction.one("SELECT id FROM reading_sessions WHERE id = $1 AND status <> 'cancelled'", [id]);
      if (!session) return null;
      await transaction.execute("UPDATE reading_sessions SET status = 'cancelled', updated_at = $1 WHERE id = $2", [new Date().toISOString(), id]);
      await notificationService.cancelQueuedForSessionAsync(id, transaction);
      await writeAudit('reading_session', id, actorId, { policy: 'cancel_preserve_assignments_history_and_related_records' }, transaction);
      return session;
    });
  }

  return { impactAsync, archiveTeacherAsync, archiveStudentAsync, archiveSchoolAsync, archiveFamilyAsync, archiveSessionAsync };
}

module.exports = { createEntityManagementService };