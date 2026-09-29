const DEFAULT_SESSION_IMAGE = '/assets/session-default.svg';
const IMAGE_DATA_URL = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+=*$/;
const MAX_IMAGE_LENGTH = 2 * 1024 * 1024;
const DUPLICATE_SESSION_MESSAGE = 'A reading session already exists for this grade and group on the selected date. Each group can have only one reading session per day.';
const PAST_SESSION_MESSAGE = 'You cannot create a reading session for a past date. Please select today or a future date.';

function domainError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function localDateAt(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const fields = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}

function validateCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw domainError('INVALID_SESSION_DATE', 'Choose a valid session date.');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw domainError('INVALID_SESSION_DATE', 'Choose a valid session date.');
}

function validateTeacherAssignments(database, schoolId, assignments) {
  for (const assignment of assignments || []) {
    if (!assignment.teacherId) continue;
    const teacher = database.prepare("SELECT id FROM teachers WHERE id = ? AND school_id = ? AND status = 'active'").get(assignment.teacherId, schoolId);
    if (!teacher) throw domainError('INVALID_SESSION_TEACHER', 'Choose an active teacher registered for the selected school.');
  }
}

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

function createSessionService(database, { clock = () => new Date() } = {}) {
  const runSchedulingTransaction = work => {
    try {
      return database.transaction(work)();
    } catch (error) {
      if (error.message?.includes('SESSION_DUPLICATE')) {
        throw domainError('DUPLICATE_SESSION', DUPLICATE_SESSION_MESSAGE);
      }
      throw error;
    }
  };

  function create(input) {
    const id = makeId('session');
    const currentTime = clock();
    const now = currentTime.toISOString();
    const image = input.image ? validateImage(input.image) : DEFAULT_SESSION_IMAGE;
    // Session times are local school times, so they carry the school's timezone.
    const schoolTimezone = database.prepare('SELECT timezone FROM schools WHERE id = ?').get(input.schoolId)?.timezone;
    const timezone = input.timezone || schoolTimezone || 'UTC';
    validateCalendarDate(input.sessionDate);
    let today;
    try {
      today = localDateAt(currentTime, timezone);
    } catch {
      throw domainError('INVALID_SESSION_TIMEZONE', 'Choose a valid school timezone.');
    }
    if (input.sessionDate < today) throw domainError('PAST_SESSION_DATE', PAST_SESSION_MESSAGE);

    runSchedulingTransaction(() => {
      validateTeacherAssignments(database, input.schoolId, input.assignments);
      database.prepare(`
        INSERT INTO reading_sessions (id, school_id, grade_id, session_date, start_time, end_time, timezone, status, image, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?, ?)
      `).run(id, input.schoolId, input.gradeId || null, input.sessionDate, input.startTime, input.endTime, timezone, image, input.createdBy || null, now, now);

      const insert = database.prepare(`
        INSERT INTO session_group_assignments (id, session_id, group_id, teacher_id, language, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'scheduled', ?, ?)
      `);
      // Families schedule sessions without choosing a teacher; the school assigns one later.
      (input.assignments || []).forEach(assignment => insert.run(makeId('session-group'), id, assignment.groupId, assignment.teacherId || '', assignment.language, now, now));
    });
    return get(id);
  }

  function replaceAssignments(sessionId, assignments) {
    const now = new Date().toISOString();
    database.prepare('DELETE FROM session_group_assignments WHERE session_id = ?').run(sessionId);
    const insert = database.prepare("INSERT INTO session_group_assignments (id, session_id, group_id, teacher_id, language, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'scheduled', ?, ?)");
    assignments.forEach(assignment => insert.run(makeId('session-group'), sessionId, assignment.groupId, assignment.teacherId || '', assignment.language, now, now));
  }

  function get(id) {
    const session = database.prepare('SELECT rs.*, g.name AS grade_name, sc.name AS school_name FROM reading_sessions rs LEFT JOIN grades g ON g.id = rs.grade_id LEFT JOIN schools sc ON sc.id = rs.school_id WHERE rs.id = ?').get(id);
    if (!session) return null;
    const assignments = database.prepare('SELECT sga.*, gr.name AS group_name FROM session_group_assignments sga LEFT JOIN groups gr ON gr.id = sga.group_id WHERE sga.session_id = ?').all(id);
    const volunteerGroups = new Set(database.prepare("SELECT group_id FROM volunteer_assignments WHERE session_id = ? AND status IN ('pending', 'confirmed', 'completed')").all(id).map(row => row.group_id));
    const missingGroups = assignments.filter(row => !volunteerGroups.has(row.group_id)).map(row => row.group_id);
    return {
      id: session.id,
      schoolId: session.school_id,
      schoolName: session.school_name || null,
      gradeId: session.grade_id,
      gradeName: session.grade_name || null,
      groups: assignments.map(row => ({ groupId: row.group_id, groupName: row.group_name || null, ...(row.teacher_id ? { teacherId: row.teacher_id } : {}), language: row.language })),
      sessionDate: session.session_date,
      startTime: session.start_time,
      endTime: session.end_time,
      timezone: session.timezone,
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
      school_id: changes.schoolId ?? current.school_id,
      grade_id: changes.gradeId ?? current.grade_id,
      session_date: changes.sessionDate ?? current.session_date,
      start_time: changes.startTime ?? current.start_time,
      end_time: changes.endTime ?? current.end_time,
      status: changes.status ?? current.status,
      image: changes.image !== undefined ? validateImage(changes.image) : current.image,
    };
    runSchedulingTransaction(() => {
      const assignments = Array.isArray(changes.assignments)
        ? changes.assignments
        : database.prepare('SELECT group_id AS groupId, teacher_id AS teacherId, language FROM session_group_assignments WHERE session_id = ?').all(id);
      validateTeacherAssignments(database, next.school_id, assignments);
      database.prepare('UPDATE reading_sessions SET school_id = ?, grade_id = ?, session_date = ?, start_time = ?, end_time = ?, status = ?, image = ?, updated_at = ? WHERE id = ?')
        .run(next.school_id, next.grade_id, next.session_date, next.start_time, next.end_time, next.status, next.image, clock().toISOString(), id);
      if (Array.isArray(changes.assignments)) replaceAssignments(id, changes.assignments);
    });
    return get(id);
  }

  return { create, get, update };
}

module.exports = { createSessionService, DEFAULT_SESSION_IMAGE };
