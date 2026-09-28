const VIEWS = ['all', 'children', 'child'];

function historyError(message, code, status) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function createHistoryService(database) {
  function listChildren(familyId) {
    if (!familyId) return [];
    return database.prepare(`
      SELECT s.id, s.name, s.grade_id AS gradeId, s.group_id AS groupId, g.name AS gradeName, gr.name AS groupName
      FROM students s
      LEFT JOIN grades g ON g.id = s.grade_id
      LEFT JOIN groups gr ON gr.id = s.group_id
      WHERE s.family_id = ? AND s.status = 'active'
      ORDER BY s.name
    `).all(familyId);
  }

  function describeSession(row, children, familyId) {
    const groups = database.prepare(`
      SELECT sga.group_id AS groupId, gr.name AS groupName, t.name AS teacherName, sga.language
      FROM session_group_assignments sga
      LEFT JOIN groups gr ON gr.id = sga.group_id
      LEFT JOIN teachers t ON t.id = sga.teacher_id
      WHERE sga.session_id = ?
      ORDER BY gr.name
    `).all(row.id);
    const volunteers = database.prepare(`
      SELECT va.group_id AS groupId, va.student_id AS studentId, gu.name AS guardianName, gu.family_id AS guardianFamilyId
      FROM volunteer_assignments va
      LEFT JOIN guardians gu ON gu.id = va.guardian_id
      WHERE va.session_id = ? AND va.status IN ('pending', 'confirmed', 'completed')
    `).all(row.id);

    const sessionGroupIds = new Set(groups.map(group => group.groupId));
    const volunteerStudentIds = new Set(volunteers.map(volunteer => volunteer.studentId).filter(Boolean));
    const relatedChildren = children
      .filter(child => (child.gradeId === row.grade_id && sessionGroupIds.has(child.groupId)) || volunteerStudentIds.has(child.id))
      .map(child => ({ id: child.id, name: child.name }));

    return {
      id: row.id,
      sessionDate: row.session_date,
      startTime: row.start_time,
      endTime: row.end_time,
      timezone: row.timezone,
      status: row.status,
      schoolName: row.schoolName || null,
      gradeId: row.grade_id,
      gradeName: row.gradeName || null,
      groups: groups.map(group => {
        const reader = volunteers.find(volunteer => volunteer.groupId === group.groupId);
        return {
          groupId: group.groupId,
          groupName: group.groupName,
          teacherName: group.teacherName,
          language: group.language,
          // Reader names from other families are private; only confirm that one is assigned.
          reader: reader ? (reader.guardianFamilyId === familyId ? reader.guardianName : 'Assigned') : null,
        };
      }),
      relatedChildren,
    };
  }

  function listSessions({ familyId, view = 'all', childId, gradeId, groupId, status }) {
    if (!VIEWS.includes(view)) throw historyError('Unknown history view.', 'INVALID_FILTER', 400);
    const children = listChildren(familyId);
    const grades = [...new Map(children.map(child => [child.gradeId, { id: child.gradeId, name: child.gradeName }])).values()];
    const authorizedGradeIds = grades.map(grade => grade.id);
    const groups = authorizedGradeIds.length === 0 ? [] : database.prepare(`
      SELECT gr.id, gr.name, gr.grade_id AS gradeId, g.name AS gradeName
      FROM groups gr
      LEFT JOIN grades g ON g.id = gr.grade_id
      WHERE gr.grade_id IN (${authorizedGradeIds.map(() => '?').join(', ')}) AND gr.status = 'active'
      ORDER BY g.name, gr.name
    `).all(...authorizedGradeIds);

    if (gradeId && !authorizedGradeIds.includes(gradeId)) throw historyError('You do not have access to that grade.', 'FORBIDDEN', 403);
    if (groupId && !groups.some(group => group.id === groupId)) throw historyError('You do not have access to that group.', 'FORBIDDEN', 403);
    if (view === 'child' && !children.some(child => child.id === childId)) throw historyError('You do not have access to that child.', 'FORBIDDEN', 403);

    const scopedGradeIds = gradeId ? [gradeId] : authorizedGradeIds;
    const rows = scopedGradeIds.length === 0 ? [] : database.prepare(`
      SELECT rs.*, sc.name AS schoolName, g.name AS gradeName
      FROM reading_sessions rs
      LEFT JOIN schools sc ON sc.id = rs.school_id
      LEFT JOIN grades g ON g.id = rs.grade_id
      WHERE rs.grade_id IN (${scopedGradeIds.map(() => '?').join(', ')})
      ORDER BY rs.session_date, rs.start_time, rs.id
    `).all(...scopedGradeIds);

    const sessions = rows
      .map(row => describeSession(row, children, familyId))
      .filter(session => !status || session.status === status)
      .filter(session => !groupId || session.groups.some(group => group.groupId === groupId))
      .filter(session => view === 'all'
        || (view === 'children' && session.relatedChildren.length > 0)
        || (view === 'child' && session.relatedChildren.some(child => child.id === childId)));

    return {
      children: children.map(({ id, name, gradeId: childGradeId, gradeName, groupId, groupName }) => ({ id, name, gradeId: childGradeId, gradeName, groupId, groupName })),
      grades,
      groups,
      sessions,
    };
  }

  return { listSessions };
}

module.exports = { createHistoryService };
