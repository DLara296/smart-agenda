function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createAssignmentService(database) {
  function create(input) {
    const existing = database.prepare('SELECT * FROM volunteer_assignments WHERE idempotency_key = ?').get(input.idempotencyKey);
    if (existing) return toAssignment(existing);
    const id = makeId('assignment');
    const now = new Date().toISOString();
    database.prepare(`
      INSERT INTO volunteer_assignments (id, session_id, group_id, guardian_id, student_id, teacher_id, language, status, idempotency_key, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?)
    `).run(id, input.sessionId, input.groupId, input.guardianId, input.studentId || null, input.teacherId, input.language, input.idempotencyKey, now, now);
    return toAssignment(database.prepare('SELECT * FROM volunteer_assignments WHERE id = ?').get(id));
  }

  function cancel(id, reason) {
    const now = new Date().toISOString();
    database.prepare('UPDATE volunteer_assignments SET status = ?, cancellation_reason = ?, updated_at = ? WHERE id = ?').run('cancelled', reason || null, now, id);
    return toAssignment(database.prepare('SELECT * FROM volunteer_assignments WHERE id = ?').get(id));
  }

  function listBySession(sessionId) {
    return database.prepare('SELECT * FROM volunteer_assignments WHERE session_id = ? ORDER BY created_at').all(sessionId).map(toAssignment);
  }

  function toAssignment(row) {
    if (!row) return null;
    return { id: row.id, sessionId: row.session_id, groupId: row.group_id, guardianId: row.guardian_id, teacherId: row.teacher_id, language: row.language, status: row.status, idempotencyKey: row.idempotency_key, cancellationReason: row.cancellation_reason || null };
  }

  return { create, cancel, listBySession };
}

module.exports = { createAssignmentService };
