const DEFAULT_SESSION_IMAGE = '/assets/session-default.svg';
const IMAGE_DATA_URL = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+=*$/;
const MAX_IMAGE_LENGTH = 2 * 1024 * 1024;

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function validateImage(image) {
  if (image === DEFAULT_SESSION_IMAGE) return image;
  if (typeof image !== 'string' || image.length > MAX_IMAGE_LENGTH || !IMAGE_DATA_URL.test(image)) {
    const error = new Error('Session image must be a PNG, JPEG, WEBP, or GIF under 1.5 MB.');
    error.code = 'INVALID_SESSION_IMAGE';
    throw error;
  }
  return image;
}

function createSessionService(database) {
  function create(input) {
    const id = makeId('session');
    const now = new Date().toISOString();
    const image = input.image ? validateImage(input.image) : DEFAULT_SESSION_IMAGE;
    database.prepare(`
      INSERT INTO reading_sessions (id, school_id, grade_id, session_date, start_time, end_time, timezone, status, image, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, ?)
    `).run(id, input.schoolId, input.gradeId || null, input.sessionDate, input.startTime, input.endTime, input.timezone || 'UTC', image, input.createdBy || null, now, now);

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
      image: session.image || DEFAULT_SESSION_IMAGE,
      createdBy: session.created_by,
      coverage: { missingGroups, warningCount: missingGroups.length },
    };
  }

  function update(id, changes) {
    const current = database.prepare('SELECT * FROM reading_sessions WHERE id = ?').get(id);
    if (!current) return null;
    const next = {
      grade_id: changes.gradeId ?? current.grade_id,
      session_date: changes.sessionDate ?? current.session_date,
      start_time: changes.startTime ?? current.start_time,
      end_time: changes.endTime ?? current.end_time,
      status: changes.status ?? current.status,
      image: changes.image !== undefined ? validateImage(changes.image) : current.image,
    };
    database.prepare('UPDATE reading_sessions SET grade_id = ?, session_date = ?, start_time = ?, end_time = ?, status = ?, image = ?, updated_at = ? WHERE id = ?')
      .run(next.grade_id, next.session_date, next.start_time, next.end_time, next.status, next.image, new Date().toISOString(), id);
    return get(id);
  }

  return { create, get, update };
}

module.exports = { createSessionService, DEFAULT_SESSION_IMAGE };
