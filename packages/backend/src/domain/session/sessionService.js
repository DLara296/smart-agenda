function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createSessionService(database) {
  function create(input) {
    const id = makeId('session');
    const now = new Date().toISOString();
    database.prepare(`
      INSERT INTO reading_sessions (id, school_id, grade_id, session_date, start_time, end_time, timezone, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)
    `).run(id, input.schoolId, input.gradeId || null, input.sessionDate, input.startTime, input.endTime, input.timezone || 'UTC', now, now);

    const insert = database.prepare(`
      INSERT INTO session_group_assignments (id, session_id, group_id, teacher_id, language, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'scheduled', ?, ?)
    `);
    (input.assignments || []).forEach(assignment => insert.run(makeId('session-group'), id, assignment.groupId, assignment.teacherId, assignment.language, now, now));
    return get(id);
  }

  function get(id) {
    const session = database.prepare('SELECT * FROM reading_sessions WHERE id = ?').get(id);
    if (!session) return null;
    const assignments = database.prepare('SELECT * FROM session_group_assignments WHERE session_id = ?').all(id);
    const volunteerGroups = new Set(database.prepare("SELECT group_id FROM volunteer_assignments WHERE session_id = ? AND status IN ('pending', 'confirmed', 'completed')").all(id).map(row => row.group_id));
    const missingGroups = assignments.filter(row => !volunteerGroups.has(row.group_id)).map(row => row.group_id);
    return {
      id: session.id,
      schoolId: session.school_id,
      gradeId: session.grade_id,
      sessionDate: session.session_date,
      startTime: session.start_time,
      endTime: session.end_time,
      status: session.status,
      coverage: { missingGroups, warningCount: missingGroups.length },
    };
  }

  return { create, get };
}

module.exports = { createSessionService };
