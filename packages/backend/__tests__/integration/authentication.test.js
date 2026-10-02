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
    const registered = await agent.post('/v1/auth/register').send({ name: 'Mariela Garcia', email: 'mariela@example.com', password: 'correct-horse' });
    const current = await agent.get('/v1/auth/me');
    const protectedResponse = await agent.get('/v1/protected/school');
    const logout = await agent.post('/v1/auth/logout');
    const expired = await agent.get('/v1/auth/me');

    expect(registered.status).toBe(201);
    expect(registered.body.data.name).toBe('Mariela Garcia');
    expect(current.status).toBe(200);
    expect(protectedResponse.status).toBe(403);
    expect(logout.status).toBe(204);
    expect(expired.status).toBe(401);
  });

  it('rejects duplicate email registration and unauthenticated protected access', async () => {
    const payload = { name: 'First User', email: 'same@example.com', password: 'correct-horse' };
    const first = await request(app).post('/v1/auth/register').send(payload);
    const duplicate = await request(app).post('/v1/auth/register').send({ ...payload, name: 'Second User' });
    const unauthenticated = await request(app).get('/v1/protected/school');

    expect(first.status).toBe(201);
    expect(duplicate.status).toBe(409);
    expect(unauthenticated.status).toBe(401);
  });

  it('scopes a guest to the family created by that account', async () => {
    const agent = request.agent(app);
    await agent.post('/v1/auth/register').send({ name: 'Guest Parent', email: 'parent@example.com', password: 'correct-horse' });
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

  it('rate limits repeated authentication attempts with a safe error contract', async () => {
    close();
    process.env.AUTH_RATE_LIMIT_MAX = '2';
    ({ app, close } = createApp({ database: ':memory:' }));

    const first = await request(app).post('/v1/auth/sign-in').send({ email: 'unknown@example.test', password: 'incorrect-password' });
    const second = await request(app).post('/v1/auth/sign-in').send({ email: 'unknown@example.test', password: 'incorrect-password' });
    const limited = await request(app).post('/v1/auth/sign-in').send({ email: 'unknown@example.test', password: 'incorrect-password' });

    delete process.env.AUTH_RATE_LIMIT_MAX;
    expect(first.status).toBe(401);
    expect(second.status).toBe(401);
    expect(limited.status).toBe(429);
    expect(limited.body.error).toEqual({ code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' });
  });
});
