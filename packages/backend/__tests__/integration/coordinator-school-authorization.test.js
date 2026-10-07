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
});