const request = require('supertest');
const { createApp } = require('../../src/app');

describe('coordinator school authorization', () => {
  let app;
  let db;
  let close;
  const admin = (method, path, body) => request(app)[method](path).set('x-user-role', 'admin').set('x-user-id', 'admin-1').send(body);
  const coordinator = (method, path, body) => request(app)[method](path)
    .set('x-user-role', 'coordinator')
    .set('x-user-id', 'coordinator-1')
    .send(body);

  beforeEach(() => {
    ({ app, db, close } = createApp({ database: ':memory:' }));
    const now = new Date().toISOString();
    db.prepare('INSERT INTO users (id, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run('admin-1', 'Test Administrator', 'admin', now, now);
    db.prepare('INSERT INTO users (id, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run('coordinator-1', 'Assigned Coordinator', 'coordinator', now, now);
  });

  afterEach(() => close());

  async function createSchools() {
    const first = await admin('post', '/v1/admin/schools', { name: 'Assigned School' });
    const second = await admin('post', '/v1/admin/schools', { name: 'Other School' });
    return { firstSchoolId: first.body.data.id, secondSchoolId: second.body.data.id };
  }

  it('lets an admin grant membership and limits coordinator notification access to assigned schools', async () => {
    const { firstSchoolId, secondSchoolId } = await createSchools();
    const granted = await admin('post', '/v1/admin/school-memberships', { userId: 'coordinator-1', schoolId: firstSchoolId });
    expect(granted.status).toBe(201);
    expect(granted.body.data).toEqual(expect.objectContaining({ userId: 'coordinator-1', schoolId: firstSchoolId, status: 'active' }));

    const allowed = await coordinator('get', `/v1/notification-groups?schoolId=${firstSchoolId}`);
    const denied = await coordinator('get', `/v1/notification-groups?schoolId=${secondSchoolId}`);
    expect(allowed.status).toBe(200);
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe('SCHOOL_ACCESS_DENIED');
  });

  it('allows admins to revoke membership and blocks all school-scoped notification actions afterward', async () => {
    const { firstSchoolId } = await createSchools();
    await admin('post', '/v1/admin/school-memberships', { userId: 'coordinator-1', schoolId: firstSchoolId });

    const revoked = await admin('delete', `/v1/admin/school-memberships/coordinator-1/${firstSchoolId}`);
    const denied = await coordinator('get', `/v1/notifications?schoolId=${firstSchoolId}`);
    expect(revoked.status).toBe(204);
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe('SCHOOL_ACCESS_DENIED');
  });

  it('limits coordinator school detail and update access to assigned schools', async () => {
    const { firstSchoolId, secondSchoolId } = await createSchools();
    await admin('post', '/v1/admin/school-memberships', { userId: 'coordinator-1', schoolId: firstSchoolId });

    const allowedRead = await coordinator('get', `/v1/schools/${firstSchoolId}`);
    const deniedRead = await coordinator('get', `/v1/schools/${secondSchoolId}`);
    const allowedUpdate = await coordinator('patch', `/v1/schools/${firstSchoolId}`, { name: 'Assigned School Updated' });
    const deniedUpdate = await coordinator('patch', `/v1/schools/${secondSchoolId}`, { name: 'Unauthorized Rename' });

    expect(allowedRead.status).toBe(200);
    expect(allowedUpdate.status).toBe(200);
    expect(deniedRead.status).toBe(403);
    expect(deniedUpdate.status).toBe(403);
    expect(deniedUpdate.body.error.code).toBe('SCHOOL_ACCESS_DENIED');
  });

  it('limits coordinator school, grade, and group listings to assigned schools', async () => {
    const { firstSchoolId, secondSchoolId } = await createSchools();
    const firstGrade = await admin('post', '/v1/grades', { schoolId: firstSchoolId, name: 'Assigned Grade' });
    const secondGrade = await admin('post', '/v1/grades', { schoolId: secondSchoolId, name: 'Other Grade' });
    const secondGroup = await admin('post', '/v1/groups', { gradeId: secondGrade.body.id, name: 'Other Group' });
    await admin('post', '/v1/admin/school-memberships', { userId: 'coordinator-1', schoolId: firstSchoolId });

    const schools = await coordinator('get', '/v1/schools');
    const assignedGrades = await coordinator('get', `/v1/schools/${firstSchoolId}/grades`);
    const otherGrades = await coordinator('get', `/v1/schools/${secondSchoolId}/grades`);
    const otherGroups = await coordinator('get', `/v1/grades/${secondGrade.body.id}/groups`);

    expect(schools.body.data.map(school => school.id)).toContain(firstSchoolId);
    expect(schools.body.data.map(school => school.id)).not.toContain(secondSchoolId);
    expect(assignedGrades.status).toBe(200);
    expect(assignedGrades.body.data.map(grade => grade.id)).toContain(firstGrade.body.id);
    expect(otherGrades.status).toBe(403);
    expect(otherGroups.status).toBe(403);
    expect(otherGroups.body.error.code).toBe('SCHOOL_ACCESS_DENIED');
    expect(secondGroup.status).toBe(201);

    const guest = request.agent(app);
    await guest.post('/v1/auth/register').send({ name: 'New Family', familyName: 'Onboarding', email: 'onboarding@example.test', password: 'secure-password' });
    expect((await guest.get('/v1/schools')).status).toBe(200);
    expect((await guest.get(`/v1/schools/${secondSchoolId}/grades`)).status).toBe(200);
    expect((await guest.get(`/v1/grades/${secondGrade.body.id}/groups`)).status).toBe(200);
  });

  it('limits teacher contact listings to an explicitly assigned school', async () => {
    const { firstSchoolId, secondSchoolId } = await createSchools();
    const firstTeacher = await admin('post', '/v1/teachers', { name: 'Assigned Teacher', email: 'assigned@example.test', phone: '+15550000001', schoolId: firstSchoolId });
    await admin('post', '/v1/teachers', { name: 'Other Teacher', email: 'other@example.test', phone: '+15550000002', schoolId: secondSchoolId });
    await admin('post', '/v1/admin/school-memberships', { userId: 'coordinator-1', schoolId: firstSchoolId });

    const assigned = await coordinator('get', `/v1/teachers?schoolId=${firstSchoolId}`);
    const unassigned = await coordinator('get', `/v1/teachers?schoolId=${secondSchoolId}`);
    const unfiltered = await coordinator('get', '/v1/teachers');

    expect(assigned.status).toBe(200);
    expect(assigned.body.data.map(teacher => teacher.id)).toEqual([firstTeacher.body.id]);
    expect(unassigned.status).toBe(403);
    expect(unfiltered.status).toBe(403);
    expect(unfiltered.body.error.code).toBe('SCHOOL_ACCESS_DENIED');
  });

  it('limits coordinator session lists, dashboards, details, and edits to assigned schools', async () => {
    const { firstSchoolId, secondSchoolId } = await createSchools();
    const firstGrade = await admin('post', '/v1/grades', { schoolId: firstSchoolId, name: 'Assigned Grade' });
    const secondGrade = await admin('post', '/v1/grades', { schoolId: secondSchoolId, name: 'Other Grade' });
    const firstGroup = await admin('post', '/v1/groups', { gradeId: firstGrade.body.id, name: 'Assigned Group' });
    const secondGroup = await admin('post', '/v1/groups', { gradeId: secondGrade.body.id, name: 'Other Group' });
    const createSession = (schoolId, gradeId, groupId, idempotencyKey) => admin('post', '/v1/sessions', {
      schoolId,
      gradeId,
      sessionDate: '2030-10-06',
      startTime: '09:00',
      endTime: '10:00',
      assignments: [{ groupId, language: 'en' }],
      idempotencyKey,
    });
    const assignedSession = await createSession(firstSchoolId, firstGrade.body.id, firstGroup.body.id, 'assigned-session');
    const otherSession = await createSession(secondSchoolId, secondGrade.body.id, secondGroup.body.id, 'other-session');
    await admin('post', '/v1/admin/school-memberships', { userId: 'coordinator-1', schoolId: firstSchoolId });

    const sessions = await coordinator('get', '/v1/sessions');
    const dashboard = await coordinator('get', '/v1/dashboard');
    const assignedDetail = await coordinator('get', `/v1/sessions/${assignedSession.body.id}`);
    const otherDetail = await coordinator('get', `/v1/sessions/${otherSession.body.id}`);
    const otherEdit = await coordinator('patch', `/v1/sessions/${otherSession.body.id}`, { startTime: '10:00' });
    const crossSchoolMove = await coordinator('patch', `/v1/sessions/${assignedSession.body.id}`, {
      schoolId: secondSchoolId,
      gradeId: secondGrade.body.id,
      sessionDate: '2030-10-07',
      assignments: [{ groupId: secondGroup.body.id, language: 'en' }],
    });

    expect(sessions.body.map(session => session.id)).toContain(assignedSession.body.id);
    expect(sessions.body.map(session => session.id)).not.toContain(otherSession.body.id);
    expect(dashboard.body.sessions.map(session => session.id)).toContain(assignedSession.body.id);
    expect(dashboard.body.sessions.map(session => session.id)).not.toContain(otherSession.body.id);
    expect(assignedDetail.status).toBe(200);
    expect(otherDetail.status).toBe(403);
    expect(otherEdit.status).toBe(403);
    expect(otherEdit.body.error.code).toBe('SCHOOL_ACCESS_DENIED');
    expect(crossSchoolMove.status).toBe(403);
    expect(crossSchoolMove.body.error.code).toBe('SCHOOL_ACCESS_DENIED');
  });

  it('rejects coordinator session creation with a grade or group from another school', async () => {
    const { firstSchoolId, secondSchoolId } = await createSchools();
    const firstGrade = await admin('post', '/v1/grades', { schoolId: firstSchoolId, name: 'Assigned Grade' });
    const secondGrade = await admin('post', '/v1/grades', { schoolId: secondSchoolId, name: 'Other Grade' });
    const firstGroup = await admin('post', '/v1/groups', { gradeId: firstGrade.body.id, name: 'Assigned Group' });
    const secondGroup = await admin('post', '/v1/groups', { gradeId: secondGrade.body.id, name: 'Other Group' });
    await admin('post', '/v1/admin/school-memberships', { userId: 'coordinator-1', schoolId: firstSchoolId });
    const create = overrides => coordinator('post', '/v1/sessions', {
      schoolId: firstSchoolId,
      gradeId: firstGrade.body.id,
      sessionDate: '2030-10-06',
      startTime: '09:00',
      endTime: '10:00',
      assignments: [{ groupId: firstGroup.body.id, language: 'en' }],
      ...overrides,
    });

    const foreignGrade = await create({ gradeId: secondGrade.body.id, assignments: [{ groupId: secondGroup.body.id, language: 'en' }] });
    const foreignGroup = await create({ assignments: [{ groupId: secondGroup.body.id, language: 'en' }] });

    expect(foreignGrade.status).toBe(400);
    expect(foreignGroup.status).toBe(400);
    expect(foreignGrade.body.error.code).toBe('INVALID_SESSION_ASSIGNMENT');
    expect(foreignGroup.body.error.code).toBe('INVALID_SESSION_ASSIGNMENT');
    expect(db.prepare('SELECT COUNT(*) AS count FROM reading_sessions').get().count).toBe(0);
  });

  it('does not let a coordinator cancel an assignment from another session by swapping IDs', async () => {
    const { firstSchoolId, secondSchoolId } = await createSchools();
    const firstGrade = await admin('post', '/v1/grades', { schoolId: firstSchoolId, name: 'Assigned Grade' });
    const secondGrade = await admin('post', '/v1/grades', { schoolId: secondSchoolId, name: 'Other Grade' });
    const firstGroup = await admin('post', '/v1/groups', { gradeId: firstGrade.body.id, name: 'Assigned Group' });
    const secondGroup = await admin('post', '/v1/groups', { gradeId: secondGrade.body.id, name: 'Other Group' });
    const createSession = (schoolId, gradeId, groupId, sessionDate) => admin('post', '/v1/sessions', {
      schoolId, gradeId, sessionDate, startTime: '09:00', endTime: '10:00', assignments: [{ groupId, language: 'en' }],
    });
    const assignedSession = await createSession(firstSchoolId, firstGrade.body.id, firstGroup.body.id, '2030-10-06');
    const otherSession = await createSession(secondSchoolId, secondGrade.body.id, secondGroup.body.id, '2030-10-06');
    const assignment = await admin('post', `/v1/sessions/${otherSession.body.id}/volunteers`, {
      groupId: secondGroup.body.id, guardianId: 'guardian-other', teacherId: 'teacher-other', language: 'en', idempotencyKey: 'other-school-assignment',
    });
    await admin('post', '/v1/admin/school-memberships', { userId: 'coordinator-1', schoolId: firstSchoolId });

    const swappedCancel = await coordinator('patch', `/v1/sessions/${assignedSession.body.id}/volunteers/${assignment.body.id}`, { cancellationReason: 'Unauthorized cross-school cancellation' });
    const assignmentState = db.prepare('SELECT status FROM volunteer_assignments WHERE id = ?').get(assignment.body.id);

    expect(swappedCancel.status).toBe(404);
    expect(assignmentState.status).toBe('confirmed');
  });

  it('rejects volunteer assignments that reference a group outside the session school', async () => {
    const { firstSchoolId, secondSchoolId } = await createSchools();
    const firstGrade = await admin('post', '/v1/grades', { schoolId: firstSchoolId, name: 'Assigned Grade' });
    const secondGrade = await admin('post', '/v1/grades', { schoolId: secondSchoolId, name: 'Other Grade' });
    const firstGroup = await admin('post', '/v1/groups', { gradeId: firstGrade.body.id, name: 'Assigned Group' });
    const secondGroup = await admin('post', '/v1/groups', { gradeId: secondGrade.body.id, name: 'Other Group' });
    const session = await admin('post', '/v1/sessions', {
      schoolId: firstSchoolId,
      gradeId: firstGrade.body.id,
      sessionDate: '2030-10-06',
      startTime: '09:00',
      endTime: '10:00',
      assignments: [{ groupId: firstGroup.body.id, language: 'en' }],
    });
    const otherSession = await admin('post', '/v1/sessions', {
      schoolId: secondSchoolId,
      gradeId: secondGrade.body.id,
      sessionDate: '2030-10-06',
      startTime: '09:00',
      endTime: '10:00',
      assignments: [{ groupId: secondGroup.body.id, language: 'en' }],
    });
    const otherAssignment = await admin('post', `/v1/sessions/${otherSession.body.id}/volunteers`, {
      groupId: secondGroup.body.id, guardianId: 'guardian-other', teacherId: 'teacher-other', language: 'en', idempotencyKey: 'cross-school-idempotency',
    });
    await admin('post', '/v1/admin/school-memberships', { userId: 'coordinator-1', schoolId: firstSchoolId });

    const foreignGroupAssignment = await coordinator('post', `/v1/sessions/${session.body.id}/volunteers`, {
      groupId: secondGroup.body.id, guardianId: 'guardian-other', teacherId: 'teacher-other', language: 'en', idempotencyKey: 'foreign-group-assignment',
    });
    const duplicateKey = await coordinator('post', `/v1/sessions/${session.body.id}/volunteers`, {
      groupId: firstGroup.body.id, guardianId: 'guardian-assigned', teacherId: 'teacher-assigned', language: 'en', idempotencyKey: 'cross-school-idempotency',
    });

    expect(foreignGroupAssignment.status).toBe(400);
    expect(foreignGroupAssignment.body.error.code).toBe('INVALID_ASSIGNMENT_SCOPE');
    expect(duplicateKey.status).toBe(409);
    expect(duplicateKey.body.error.code).toBe('IDEMPOTENCY_CONFLICT');
    expect(duplicateKey.body.data?.id).not.toBe(otherAssignment.body.id);
    expect(db.prepare('SELECT COUNT(*) AS count FROM volunteer_assignments').get().count).toBe(1);
  });

  it('limits coordinator family registration to assigned schools while preserving guest onboarding', async () => {
    const { firstSchoolId, secondSchoolId } = await createSchools();
    const secondGrade = await admin('post', '/v1/grades', { schoolId: secondSchoolId, name: 'Other Grade' });
    const secondGroup = await admin('post', '/v1/groups', { gradeId: secondGrade.body.id, name: 'Other Group' });
    await admin('post', '/v1/admin/school-memberships', { userId: 'coordinator-1', schoolId: firstSchoolId });

    const assignedFamily = await coordinator('post', '/v1/families', { displayName: 'Assigned Family', schoolId: firstSchoolId });
    const otherFamily = await coordinator('post', '/v1/families', { displayName: 'Other Family', schoolId: secondSchoolId });
    const foreignChildFamily = await coordinator('post', '/v1/families', {
      displayName: 'Mismatched Family', schoolId: firstSchoolId, children: [{ name: 'Other School Child', gradeId: secondGrade.body.id, groupId: secondGroup.body.id }],
    });
    const guest = request.agent(app);
    await guest.post('/v1/auth/register').send({ name: 'Parent', familyName: 'Guest Family', email: 'guest-onboarding@example.test', password: 'secure-password' });
    const guestFamily = await guest.post('/v1/families').send({ displayName: 'Guest Family', schoolId: secondSchoolId });

    expect(assignedFamily.status).toBe(201);
    expect(otherFamily.status).toBe(403);
    expect(otherFamily.body.error.code).toBe('SCHOOL_ACCESS_DENIED');
    expect(foreignChildFamily.status).toBe(400);
    expect(foreignChildFamily.body.error.code).toBe('FAMILY_VALIDATION');
    expect(guestFamily.status).toBe(201);
  });

  it('limits coordinator family child details to assigned schools', async () => {
    const { firstSchoolId, secondSchoolId } = await createSchools();
    const firstGrade = await admin('post', '/v1/grades', { schoolId: firstSchoolId, name: 'Assigned Grade' });
    const secondGrade = await admin('post', '/v1/grades', { schoolId: secondSchoolId, name: 'Other Grade' });
    const firstGroup = await admin('post', '/v1/groups', { gradeId: firstGrade.body.id, name: 'Assigned Group' });
    const secondGroup = await admin('post', '/v1/groups', { gradeId: secondGrade.body.id, name: 'Other Group' });
    const assignedFamily = await admin('post', '/v1/families', {
      displayName: 'Assigned Family', schoolId: firstSchoolId, children: [{ name: 'Assigned Child', gradeId: firstGrade.body.id, groupId: firstGroup.body.id }],
    });
    const otherFamily = await admin('post', '/v1/families', {
      displayName: 'Other Family', schoolId: secondSchoolId, children: [{ name: 'Other Child', gradeId: secondGrade.body.id, groupId: secondGroup.body.id }],
    });
    await admin('post', '/v1/admin/school-memberships', { userId: 'coordinator-1', schoolId: firstSchoolId });

    const assignedChildren = await coordinator('get', `/v1/families/${assignedFamily.body.id}/children`);
    const otherChildren = await coordinator('get', `/v1/families/${otherFamily.body.id}/children`);

    expect(assignedChildren.status).toBe(200);
    expect(assignedChildren.body.map(child => child.name)).toContain('Assigned Child');
    expect(otherChildren.status).toBe(403);
    expect(otherChildren.body.error.code).toBe('SCHOOL_ACCESS_DENIED');
  });

  it('limits coordinator student listings to assigned schools', async () => {
    const { firstSchoolId, secondSchoolId } = await createSchools();
    const firstGrade = await admin('post', '/v1/grades', { schoolId: firstSchoolId, name: 'Assigned Grade' });
    const secondGrade = await admin('post', '/v1/grades', { schoolId: secondSchoolId, name: 'Other Grade' });
    const firstGroup = await admin('post', '/v1/groups', { gradeId: firstGrade.body.id, name: 'Assigned Group' });
    const secondGroup = await admin('post', '/v1/groups', { gradeId: secondGrade.body.id, name: 'Other Group' });
    const assignedStudent = await admin('post', '/v1/students', {
      familyId: 'assigned-family', schoolId: firstSchoolId, gradeId: firstGrade.body.id, groupId: firstGroup.body.id, name: 'Assigned Student',
    });
    const otherStudent = await admin('post', '/v1/students', {
      familyId: 'other-family', schoolId: secondSchoolId, gradeId: secondGrade.body.id, groupId: secondGroup.body.id, name: 'Other Student',
    });
    await admin('post', '/v1/admin/school-memberships', { userId: 'coordinator-1', schoolId: firstSchoolId });

    const coordinatorStudents = await coordinator('get', '/v1/students');
    const adminStudents = await admin('get', '/v1/students');
    await admin('delete', `/v1/admin/school-memberships/coordinator-1/${firstSchoolId}`);
    const revokedCoordinatorStudents = await coordinator('get', '/v1/students');

    expect(coordinatorStudents.status).toBe(200);
    expect(coordinatorStudents.body.data.map(student => student.id)).toContain(assignedStudent.body.id);
    expect(coordinatorStudents.body.data.map(student => student.id)).not.toContain(otherStudent.body.id);
    expect(adminStudents.body.data.map(student => student.id)).toEqual(expect.arrayContaining([assignedStudent.body.id, otherStudent.body.id]));
    expect(revokedCoordinatorStudents.body.data.map(student => student.id)).not.toContain(assignedStudent.body.id);
  });
});