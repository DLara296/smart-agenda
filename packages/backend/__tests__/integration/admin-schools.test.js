const request = require('supertest');
const { createApp } = require('../../src/app');

describe('admin school management API', () => {
  let app;
  let close;
  const admin = (method, path, body) => request(app)[method](path).set('x-user-role', 'admin').send(body);

  beforeEach(() => { ({ app, close } = createApp({ database: ':memory:' })); });
  afterEach(() => close());

  it('protects admin school list, detail, creation, and update endpoints', async () => {
    const school = await admin('post', '/v1/admin/schools', { name: 'Green Valley', timezone: 'America/Mexico_City', locale: 'es-MX' });
    const list = await admin('get', '/v1/admin/schools');
    const detail = await admin('get', `/v1/admin/schools/${school.body.data.id}`);
    const guestList = await request(app).get('/v1/admin/schools').set('x-user-role', 'guest');
    const guestCreate = await request(app).post('/v1/admin/schools').set('x-user-role', 'guest').send({ name: 'Forbidden' });
    const coordinatorUpdate = await request(app).patch(`/v1/admin/schools/${school.body.data.id}`).set('x-user-role', 'coordinator').send({ name: 'Forbidden' });

    expect(school.status).toBe(201);
    expect(school.body.data).toEqual(expect.objectContaining({ name: 'Green Valley', timezone: 'America/Mexico_City', locale: 'es-MX' }));
    expect(list.body.data.map(item => item.id)).toContain(school.body.data.id);
    expect(detail.body.data).toEqual(school.body.data);
    expect(guestList.status).toBe(403);
    expect(guestCreate.status).toBe(403);
    expect(coordinatorUpdate.status).toBe(403);
  });

  it('validates create/update and preserves related records after school edits', async () => {
    const school = await admin('post', '/v1/admin/schools', { name: 'Oak School' });
    const invalidCreate = await admin('post', '/v1/admin/schools', { name: '   ' });
    const invalidGrade = await admin('post', '/v1/grades', { schoolId: school.body.data.id, name: '   ' });
    const grade = await admin('post', '/v1/grades', { schoolId: school.body.data.id, name: 'Grade 1' });
    const group = await admin('post', '/v1/groups', { gradeId: grade.body.id, name: 'Group A' });
    const teacher = await admin('post', '/v1/teachers', { name: 'Jordan Lee', email: 'jordan@example.test', schoolId: school.body.data.id });
    const invalidUpdate = await admin('patch', `/v1/admin/schools/${school.body.data.id}`, { timezone: 'Not/A_Timezone' });
    const updated = await admin('patch', `/v1/admin/schools/${school.body.data.id}`, { name: 'Oak School Updated', timezone: 'Europe/Madrid', locale: 'es-ES' });
    const grades = await admin('get', `/v1/schools/${school.body.data.id}/grades`);
    const groups = await admin('get', `/v1/grades/${grade.body.id}/groups`);
    const teachers = await admin('get', `/v1/teachers?schoolId=${school.body.data.id}`);
    const missing = await admin('get', '/v1/admin/schools/missing-school');

    expect(invalidCreate.status).toBe(400);
    expect(invalidCreate.body.error.message).toBe('Enter a school name.');
    expect(invalidGrade.status).toBe(400);
    expect(invalidGrade.body.error.message).toBe('A grade name is required.');
    expect(invalidUpdate.status).toBe(400);
    expect(updated.status).toBe(200);
    expect(updated.body.data).toEqual(expect.objectContaining({ id: school.body.data.id, name: 'Oak School Updated', timezone: 'Europe/Madrid', locale: 'es-ES' }));
    expect(grades.body.data.map(item => item.id)).toContain(grade.body.id);
    expect(groups.body.data.map(item => item.id)).toContain(group.body.id);
    expect(teachers.body.data.map(item => item.id)).toContain(teacher.body.id);
    expect(missing.status).toBe(404);
  });
});
