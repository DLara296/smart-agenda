function createEntityManagementService(database, auditRepository) {
  const fail = (code, message, status = 400, details = null) => {
    const error = new Error(message);
    error.code = code;
    error.status = status;
    error.details = details;
    throw error;
  };

  function record(entityType, entityId, actorId, metadata = {}) {
    auditRepository.record({ entityType, entityId, action: 'archived', actorId, metadata });
  }

  function impact(entityType, id) {
    if (entityType === 'school') {
      const school = database.prepare('SELECT id FROM schools WHERE id = ? AND status = \'active\'').get(id);
      if (!school) return null;
      return {
        grades: database.prepare("SELECT COUNT(*) AS count FROM grades WHERE school_id = ? AND status = 'active'").get(id).count,
        groups: database.prepare("SELECT COUNT(*) AS count FROM groups g JOIN grades gr ON gr.id = g.grade_id WHERE gr.school_id = ? AND gr.status = 'active' AND g.status = 'active'").get(id).count,
        teachers: database.prepare("SELECT COUNT(*) AS count FROM teachers WHERE school_id = ? AND status = 'active'").get(id).count,
        students: database.prepare("SELECT COUNT(*) AS count FROM students WHERE school_id = ? AND status = 'active'").get(id).count,
        sessions: database.prepare("SELECT COUNT(*) AS count FROM reading_sessions WHERE school_id = ? AND status <> 'cancelled'").get(id).count,
        notificationGroups: database.prepare('SELECT COUNT(*) AS count FROM notification_groups WHERE school_id = ?').get(id).count,
      };
    }
    if (entityType === 'family') {
      const family = database.prepare("SELECT id FROM family_records WHERE id = ? AND status = 'active'").get(id);
      if (!family) return null;
      return {
        guardians: database.prepare("SELECT COUNT(*) AS count FROM guardians WHERE family_id = ? AND status = 'active'").get(id).count,
        students: database.prepare("SELECT COUNT(*) AS count FROM students WHERE family_id = ? AND status = 'active'").get(id).count,
        linkedAccounts: database.prepare("SELECT COUNT(*) AS count FROM users WHERE family_id = ? AND status = 'active'").get(id).count,
        invitations: database.prepare("SELECT COUNT(*) AS count FROM invitations WHERE household_id = ? AND status IN ('pending', 'sent')").get(id).count,
      };
    }
    return null;
  }

  function archiveTeacher(id, actorId) {
    return database.transaction(() => {
      const teacher = database.prepare("SELECT id, name FROM teachers WHERE id = ? AND status = 'active'").get(id);
      if (!teacher) return null;
      database.prepare("UPDATE teachers SET status = 'inactive', updated_at = ? WHERE id = ?").run(new Date().toISOString(), id);
      record('teacher', id, actorId, { policy: 'soft_delete_preserve_assignments_and_group_memberships' });
      return teacher;
    })();
  }

  function archiveStudent(id, actorId) {
    return database.transaction(() => {
      const student = database.prepare("SELECT id, name FROM students WHERE id = ? AND status = 'active'").get(id);
      if (!student) return null;
      database.prepare("UPDATE students SET status = 'inactive', updated_at = ? WHERE id = ?").run(new Date().toISOString(), id);
      record('student', id, actorId, { policy: 'soft_delete_preserve_family_and_history_references' });
      return student;
    })();
  }

  function archiveSchool(id, actorId) {
    return database.transaction(() => {
      const school = database.prepare("SELECT id, name FROM schools WHERE id = ? AND status = 'active'").get(id);
      if (!school) return null;
      const counts = impact('school', id);
      const blockers = counts.teachers + counts.students + counts.sessions + counts.notificationGroups;
      if (blockers > 0) fail('SCHOOL_DELETE_BLOCKED', 'This school still has active teachers, students, reading sessions, or notification groups. Resolve those records before deleting the school.', 409, counts);
      const now = new Date().toISOString();
      database.prepare("UPDATE groups SET status = 'inactive', updated_at = ? WHERE grade_id IN (SELECT id FROM grades WHERE school_id = ?)").run(now, id);
      database.prepare("UPDATE grades SET status = 'inactive', updated_at = ? WHERE school_id = ?").run(now, id);
      database.prepare("UPDATE schools SET status = 'inactive', updated_at = ? WHERE id = ?").run(now, id);
      record('school', id, actorId, { policy: 'archive_school_grades_groups', impact: counts });
      return school;
    })();
  }

  function archiveFamily(id, actorId) {
    return database.transaction(() => {
      const family = database.prepare("SELECT id, display_name AS name FROM family_records WHERE id = ? AND status = 'active'").get(id);
      if (!family) return null;
      const counts = impact('family', id);
      if (counts.linkedAccounts || counts.invitations) fail('FAMILY_DELETE_BLOCKED', 'This family has linked accounts or outstanding invitations. Resolve them before deleting the family.', 409, counts);
      const now = new Date().toISOString();
      database.prepare("UPDATE guardians SET status = 'inactive', updated_at = ? WHERE family_id = ? AND status = 'active'").run(now, id);
      database.prepare("UPDATE students SET status = 'inactive', updated_at = ? WHERE family_id = ? AND status = 'active'").run(now, id);
      database.prepare("UPDATE family_records SET status = 'inactive', updated_at = ? WHERE id = ?").run(now, id);
      record('family', id, actorId, { policy: 'archive_family_guardians_and_students', impact: counts });
      return family;
    })();
  }

  function archiveSession(id, actorId, notificationService) {
    return database.transaction(() => {
      const session = database.prepare("SELECT id FROM reading_sessions WHERE id = ? AND status <> 'cancelled'").get(id);
      if (!session) return null;
      database.prepare("UPDATE reading_sessions SET status = 'cancelled', updated_at = ? WHERE id = ?").run(new Date().toISOString(), id);
      notificationService.cancelQueuedForSession(id);
      record('reading_session', id, actorId, { policy: 'cancel_preserve_assignments_history_and_related_records' });
      return session;
    })();
  }

  return { impact, archiveTeacher, archiveStudent, archiveSchool, archiveFamily, archiveSession };
}

module.exports = { createEntityManagementService };