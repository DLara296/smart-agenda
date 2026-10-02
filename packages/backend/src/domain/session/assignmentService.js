function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createAssignmentService(database) {
  async function createAsync(input, storage = database) {
    const existing = await storage.one('SELECT * FROM volunteer_assignments WHERE idempotency_key = $1', [input.idempotencyKey]);
    if (existing) return toAssignment(existing);
    const id = makeId('assignment');
    const now = new Date().toISOString();
    await storage.execute(`INSERT INTO volunteer_assignments (id, session_id, group_id, guardian_id, student_id, teacher_id, language, status, idempotency_key, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed', $8, $9, $10)`, [id, input.sessionId, input.groupId, input.guardianId, input.studentId || null, input.teacherId, input.language, input.idempotencyKey, now, now]);
    return toAssignment(await storage.one('SELECT * FROM volunteer_assignments WHERE id = $1', [id]));
  }

  async function cancelAsync(id, reason, storage = database) {
    await storage.execute('UPDATE volunteer_assignments SET status = $1, cancellation_reason = $2, updated_at = $3 WHERE id = $4', ['cancelled', reason || null, new Date().toISOString(), id]);
    return toAssignment(await storage.one('SELECT * FROM volunteer_assignments WHERE id = $1', [id]));
  }

  async function listBySessionAsync(sessionId, storage = database) {
    const rows = await storage.query('SELECT * FROM volunteer_assignments WHERE session_id = $1 ORDER BY created_at', [sessionId]);
    return rows.map(toAssignment);
  }

  function toAssignment(row) {
    if (!row) return null;
    return { id: row.id, sessionId: row.session_id, groupId: row.group_id, guardianId: row.guardian_id, teacherId: row.teacher_id, language: row.language, status: row.status, idempotencyKey: row.idempotency_key, cancellationReason: row.cancellation_reason || null };
  }

  return { createAsync, cancelAsync, listBySessionAsync };
}

module.exports = { createAssignmentService };
