const request = require('supertest');
const { createApp } = require('../../src/app');

describe('session teacher assignment', () => {
  let app;
  let close;
  let schoolA;
  let schoolB;
  let teacherA;
  let teacherB;

  const call = (role, method, path, body) => request(app)[method](path).set('x-user-role', role).send(body);

  beforeEach(async () => {
    ({ app, close } = createApp({ database: ':memory:', clock: () => new Date('2026-09-01T12:00:00.000Z') }));
    schoolA = (await call('admin', 'post', '/v1/schools', { name: 'Lakeside Academy' })).body;
    schoolB = (await call('admin', 'post', '/v1/schools', { name: 'Northview Primary' })).body;
    teacherA = (await call('admin', 'post', '/v1/teachers', { name: 'Mariela Garcia', email: 'mariela@example.test', schoolId: schoolA.id })).body;
    teacherB = (await call('admin', 'post', '/v1/teachers', { name: 'Jordan Lee', email: 'jordan@example.test', schoolId: schoolB.id })).body;
  });

  afterEach(() => close());

  it('allows only admins to register teachers and filters active teacher choices by school', async () => {
    const filteredA = await call('coordinator', 'get', `/v1/teachers?schoolId=${schoolA.id}`);
    const filteredB = await call('admin', 'get', `/v1/teachers?schoolId=${schoolB.id}`);
    const unfiltered = await call('admin', 'get', '/v1/teachers');
    const denied = await call('coordinator', 'post', '/v1/teachers', { name: 'Not Admin', email: 'not-admin@example.test', schoolId: schoolA.id });

    expect(filteredA.body.data.map(teacher => teacher.id)).toEqual([teacherA.id]);
    expect(filteredB.body.data.map(teacher => teacher.id)).toEqual([teacherB.id]);
    expect(unfiltered.body.data).toHaveLength(2);
    expect(denied.status).toBe(403);
  });

  it('saves a school teacher on the group and rejects invalid or other-school teachers', async () => {
    const sessionBody = teacherId => ({
      schoolId: schoolA.id,
      gradeId: 'grade-a',
      sessionDate: '2026-10-06',
      startTime: '07:40',
      endTime: '08:40',
      assignments: [{ groupId: 'group-a', teacherId, language: 'es' }],
    });
    const created = await call('admin', 'post', '/v1/sessions', sessionBody(teacherA.id));
    const wrongSchool = await call('admin', 'post', '/v1/sessions', sessionBody(teacherB.id));
    const unknown = await call('admin', 'post', '/v1/sessions', sessionBody('teacher-unknown'));
    const updated = await call('admin', 'patch', `/v1/sessions/${created.body.id}`, { assignments: [{ groupId: 'group-a', teacherId: teacherA.id, language: 'en' }] });
    const rejectedUpdate = await call('admin', 'patch', `/v1/sessions/${created.body.id}`, { assignments: [{ groupId: 'group-a', teacherId: teacherB.id, language: 'en' }] });
    const current = await call('admin', 'get', `/v1/sessions/${created.body.id}`);

    expect(created.status).toBe(201);
    expect(created.body.groups[0]).toEqual(expect.objectContaining({ teacherId: teacherA.id }));
    expect(wrongSchool.status).toBe(400);
    expect(unknown.status).toBe(400);
    expect(wrongSchool.body.error).toEqual({ code: 'INVALID_SESSION_TEACHER', message: 'Choose an active teacher registered for the selected school.' });
    expect(updated.status).toBe(200);
    expect(updated.body.groups[0].teacherId).toBe(teacherA.id);
    expect(rejectedUpdate.status).toBe(400);
    expect(current.body.groups[0].teacherId).toBe(teacherA.id);
  });
});