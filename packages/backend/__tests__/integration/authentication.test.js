const request = require('supertest');
const { createApp } = require('../../src/app');

describe('local authentication sessions', () => {
  let app;
  let close;

  beforeEach(() => {
    ({ app, close } = createApp({ database: ':memory:', clock: () => new Date('2026-09-01T12:00:00.000Z') }));
  });

  afterEach(() => close());

  it('registers, restores, and logs out a user session', async () => {
    const agent = request.agent(app);
    const registered = await agent.post('/v1/auth/register').send({ name: 'Mariela Garcia', familyName: 'Garcia', email: 'mariela@example.com', password: 'correct-horse' });
    const current = await agent.get('/v1/auth/me');
    const protectedResponse = await agent.get('/v1/protected/school');
    const logout = await agent.post('/v1/auth/logout');
    const expired = await agent.get('/v1/auth/me');

    expect(registered.status).toBe(201);
    expect(registered.body.data.name).toBe('Mariela Garcia');
    expect(registered.body.data.familyName).toBe('Garcia');
    expect(current.status).toBe(200);
    expect(protectedResponse.status).toBe(403);
    expect(logout.status).toBe(204);
    expect(expired.status).toBe(401);
  });

  it('rejects duplicate email registration and unauthenticated protected access', async () => {
    const payload = { name: 'First User', familyName: 'First', email: 'same@example.com', password: 'correct-horse' };
    const first = await request(app).post('/v1/auth/register').send(payload);
    const duplicate = await request(app).post('/v1/auth/register').send({ ...payload, name: 'Second User' });
    const unauthenticated = await request(app).get('/v1/protected/school');

    expect(first.status).toBe(201);
    expect(duplicate.status).toBe(409);
    expect(unauthenticated.status).toBe(401);
  });

  it('allows a registered guest to create and list reading sessions for their child grade', async () => {
    const agent = request.agent(app);
    await agent.post('/v1/auth/register').send({ name: 'Guest Parent', familyName: 'Parent', email: 'guest-session@example.com', password: 'correct-horse' });
    const schoolId = (await agent.get('/v1/schools')).body.data[0].id;
    const grade = await agent.post('/v1/grades').send({ schoolId, name: 'Grade 1' });
    const group = await agent.post('/v1/groups').send({ gradeId: grade.body.id, name: 'Group A' });
    await agent.post('/v1/families').send({ displayName: 'Parent Family', schoolId, children: [{ name: 'Juliette', gradeId: grade.body.id, groupId: group.body.id }] });
    const created = await agent.post('/v1/sessions').send({ gradeId: grade.body.id, sessionDate: '2026-10-06', startTime: '07:40', endTime: '07:40', assignments: [{ groupId: group.body.id, language: 'es' }] });
    const listed = await agent.get('/v1/sessions');

    expect(created.status).toBe(201);
    expect(listed.body.map(session => session.id)).toContain(created.body.id);
  });

  it('allows a registered guest to add a grade and read school reference lists', async () => {
    const agent = request.agent(app);
    await agent.post('/v1/auth/register').send({ name: 'Guest Parent', familyName: 'Parent', email: 'guest-grade@example.com', password: 'correct-horse' });
    const schools = await agent.get('/v1/schools');
    const schoolId = schools.body.data[0].id;
    const created = await agent.post('/v1/grades').send({ schoolId, name: 'Grade 4' });
    const group = await agent.post('/v1/groups').send({ gradeId: created.body.id, name: ' Group C ' });
    const groups = await agent.get(`/v1/grades/${created.body.id}/groups`);
    const orphanGroup = await agent.post('/v1/groups').send({ gradeId: 'grade-missing', name: 'Group D' });
    const unnamedGroup = await agent.post('/v1/groups').send({ gradeId: created.body.id, name: '  ' });
    const grades = await agent.get(`/v1/schools/${schoolId}/grades`);
    const invalid = await agent.post('/v1/grades').send({ schoolId: 'school-missing', name: 'Grade 5' });
    const teacher = await agent.post('/v1/teachers').send({ name: 'Nope', email: 'nope@example.com', schoolId });

    expect(schools.status).toBe(200);
    expect(created.status).toBe(201);
    expect(grades.body.data.map(grade => grade.name)).toContain('Grade 4');
    expect(invalid.status).toBe(400);
    expect(group.status).toBe(201);
    expect(group.body).toEqual(expect.objectContaining({ name: 'Group C', code: 'GROUP-C' }));
    expect(groups.body.data.map(item => item.name)).toEqual(['Group C']);
    expect(orphanGroup.status).toBe(400);
    expect(unnamedGroup.status).toBe(400);
    expect(teacher.status).toBe(403);
  });

  it('rejects a family name longer than 15 characters', async () => {
    const response = await request(app).post('/v1/auth/register').send({ name: 'Long Name', familyName: 'A'.repeat(16), email: 'long@example.com', password: 'correct-horse' });
    expect(response.status).toBe(400);
  });

  it('scopes a guest to the family created by that account', async () => {
    const agent = request.agent(app);
    await agent.post('/v1/auth/register').send({ name: 'Guest Parent', familyName: 'Parent', email: 'parent@example.com', password: 'correct-horse' });
    const created = await agent.post('/v1/families').send({ displayName: 'Parent Family', schoolId: 'school-1' });
    const current = await agent.get('/v1/auth/me');
    const own = await agent.get(`/v1/families/${created.body.id}`);
    const other = await agent.get('/v1/families/family-other');
    const duplicate = await agent.post('/v1/families').send({ displayName: 'Second Family', schoolId: 'school-1' });

    expect(created.status).toBe(201);
    expect(current.body.data.familyId).toBe(created.body.id);
    expect(own.status).toBe(200);
    expect(other.status).toBe(403);
    expect(duplicate.status).toBe(409);
  });
});
