const request = require('supertest');
const { createApp } = require('../../src/app');

describe('local authentication sessions', () => {
  let app;
  let close;

  beforeEach(() => {
    ({ app, close } = createApp({ database: ':memory:' }));
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

  it('allows a registered guest to create and list reading sessions', async () => {
    const agent = request.agent(app);
    await agent.post('/v1/auth/register').send({ name: 'Guest Parent', familyName: 'Parent', email: 'guest-session@example.com', password: 'correct-horse' });
    const created = await agent.post('/v1/sessions').send({ schoolId: 'school-1', gradeId: 'Grade 1', sessionDate: '2026-10-06', startTime: '07:40', endTime: '07:40', assignments: [] });
    const listed = await agent.get('/v1/sessions');

    expect(created.status).toBe(201);
    expect(listed.body.map(session => session.id)).toContain(created.body.id);
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
