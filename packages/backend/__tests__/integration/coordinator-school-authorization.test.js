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
    const history = await coordinator('get', '/v1/history/sessions');
    const otherGradeHistory = await coordinator('get', `/v1/history/sessions?gradeId=${secondGrade.body.id}`);
    const otherGroupHistory = await coordinator('get', `/v1/history/sessions?groupId=${secondGroup.body.id}`);
    const assignedDetail = await coordinator('get', `/v1/sessions/${assignedSession.body.id}`);
    const otherDetail = await coordinator('get', `/v1/sessions/${otherSession.body.id}`);
    const otherEdit = await coordinator('patch', `/v1/sessions/${otherSession.body.id}`, { startTime: '10:00' });
    const moveToOtherSchool = await coordinator('patch', `/v1/sessions/${assignedSession.body.id}`, { schoolId: secondSchoolId });
    const otherVolunteer = await coordinator('post', `/v1/sessions/${otherSession.body.id}/volunteers`, { groupId: secondGroup.body.id, guardianId: 'guardian-1', teacherId: 'teacher-1', language: 'en', idempotencyKey: 'other-school-assignment' });
    const otherCreate = await coordinator('post', '/v1/sessions', { schoolId: secondSchoolId, gradeId: secondGrade.body.id, sessionDate: '2030-10-07', startTime: '09:00', endTime: '10:00', assignments: [{ groupId: secondGroup.body.id, language: 'en' }] });
    const crossSchoolGradeCreate = await coordinator('post', '/v1/sessions', { schoolId: firstSchoolId, gradeId: secondGrade.body.id, sessionDate: '2030-10-08', startTime: '09:00', endTime: '10:00', assignments: [{ groupId: secondGroup.body.id, language: 'en' }] });
    const crossSchoolGradeUpdate = await coordinator('patch', `/v1/sessions/${assignedSession.body.id}`, { gradeId: secondGrade.body.id, assignments: [{ groupId: secondGroup.body.id, language: 'en' }] });

    expect(sessions.body.map(session => session.id)).toContain(assignedSession.body.id);
    expect(sessions.body.map(session => session.id)).not.toContain(otherSession.body.id);
    expect(dashboard.body.sessions.map(session => session.id)).toContain(assignedSession.body.id);
    expect(dashboard.body.sessions.map(session => session.id)).not.toContain(otherSession.body.id);
    expect(history.body.data.scope).toBe('school');
    expect(history.body.data.children).toEqual([]);
    expect(history.body.data.sessions.map(session => session.id)).toContain(assignedSession.body.id);
    expect(history.body.data.sessions.map(session => session.id)).not.toContain(otherSession.body.id);
    expect(otherGradeHistory.status).toBe(403);
    expect(otherGroupHistory.status).toBe(403);
    expect(assignedDetail.status).toBe(200);
    expect(otherDetail.status).toBe(403);
    expect(otherEdit.status).toBe(403);
    expect(moveToOtherSchool.status).toBe(403);
    expect(otherVolunteer.status).toBe(403);
    expect(otherCreate.status).toBe(403);
    expect(crossSchoolGradeCreate.status).toBe(400);
    expect(crossSchoolGradeUpdate.status).toBe(400);
    expect(otherEdit.body.error.code).toBe('SCHOOL_ACCESS_DENIED');
  });

  it('limits coordinator student and family-child reads to assigned schools', async () => {
    const { firstSchoolId, secondSchoolId } = await createSchools();
    const firstGrade = await admin('post', '/v1/grades', { schoolId: firstSchoolId, name: 'Assigned Grade' });
    const secondGrade = await admin('post', '/v1/grades', { schoolId: secondSchoolId, name: 'Other Grade' });
    const firstGroup = await admin('post', '/v1/groups', { gradeId: firstGrade.body.id, name: 'Assigned Group' });
    const secondGroup = await admin('post', '/v1/groups', { gradeId: secondGrade.body.id, name: 'Other Group' });
    const firstFamily = await admin('post', '/v1/families', {
      displayName: 'Assigned Family',
      schoolId: firstSchoolId,
      guardians: [{ name: 'Assigned Guardian' }],
      children: [{ name: 'Assigned Student', gradeId: firstGrade.body.id, groupId: firstGroup.body.id }],
    });
    const secondFamily = await admin('post', '/v1/families', {
      displayName: 'Other Family',
      schoolId: secondSchoolId,
      guardians: [{ name: 'Other Guardian' }],
      children: [{ name: 'Other Student', gradeId: secondGrade.body.id, groupId: secondGroup.body.id }],
    });
    await admin('post', '/v1/admin/school-memberships', { userId: 'coordinator-1', schoolId: firstSchoolId });

    const students = await coordinator('get', '/v1/students');
    const assignedChildren = await coordinator('get', `/v1/families/${firstFamily.body.id}/children`);
    const otherChildren = await coordinator('get', `/v1/families/${secondFamily.body.id}/children`);

    expect(students.status).toBe(200);
    expect(students.body.data.map(student => student.name)).toContain('Assigned Student');
    expect(students.body.data.map(student => student.name)).not.toContain('Other Student');
    expect(assignedChildren.status).toBe(200);
    expect(assignedChildren.body.map(child => child.name)).toContain('Assigned Student');
    expect(otherChildren.status).toBe(403);
    expect(otherChildren.body.error.code).toBe('SCHOOL_ACCESS_DENIED');
  });

  it('prevents coordinators from moving their family into an unassigned school', async () => {
    const { firstSchoolId, secondSchoolId } = await createSchools();
    const firstGrade = await admin('post', '/v1/grades', { schoolId: firstSchoolId, name: 'Family Grade' });
    const secondGrade = await admin('post', '/v1/grades', { schoolId: secondSchoolId, name: 'Other Grade' });
    const firstGroup = await admin('post', '/v1/groups', { gradeId: firstGrade.body.id, name: 'Family Group' });
    const secondGroup = await admin('post', '/v1/groups', { gradeId: secondGrade.body.id, name: 'Other Group' });
    const family = await admin('post', '/v1/families', {
      displayName: 'Coordinator Family',
      schoolId: firstSchoolId,
      guardians: [{ name: 'Coordinator Guardian' }],
      children: [{ name: 'Coordinator Child', gradeId: firstGrade.body.id, groupId: firstGroup.body.id }],
    });
    const details = await admin('get', `/v1/admin/families/${family.body.id}`);
    await db.prepare('UPDATE users SET family_id = ? WHERE id = ?').run(family.body.id, 'coordinator-1');
    await admin('post', '/v1/admin/school-memberships', { userId: 'coordinator-1', schoolId: firstSchoolId });

    const moved = await request(app)
      .put('/v1/families/me')
      .set('x-user-role', 'coordinator')
      .set('x-user-id', 'coordinator-1')
      .set('x-family-id', family.body.id)
      .send({
        displayName: details.body.data.displayName,
        schoolId: secondSchoolId,
        guardians: details.body.data.guardians,
        children: [{ ...details.body.data.children[0], gradeId: secondGrade.body.id, groupId: secondGroup.body.id }],
      });

    expect(moved.status).toBe(403);
    expect(moved.body.error.code).toBe('SCHOOL_ACCESS_DENIED');
  });
});