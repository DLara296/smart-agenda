const request = require('supertest');
const { createApp } = require('../../src/app');

describe('authorization boundaries', () => {
  let app;
  let close;

  beforeEach(() => {
    ({ app, close } = createApp({ database: ':memory:' }));
  });

  afterEach(() => close());

  it('allows administrators and coordinators to access protected school routes', async () => {
    const admin = await request(app).get('/v1/protected/school').set('x-user-role', 'admin');
    const coordinator = await request(app).get('/v1/protected/school').set('x-user-role', 'coordinator');

    expect(admin.status).toBe(200);
    expect(coordinator.status).toBe(200);
  });

  it('denies guests from school-wide data and permits only their family scope', async () => {
    const denied = await request(app).get('/v1/protected/school').set('x-user-role', 'guest');
    const allowed = await request(app)
      .get('/v1/families/family-1')
      .set('x-user-role', 'guest')
      .set('x-family-id', 'family-1');
    const forbidden = await request(app)
      .get('/v1/families/family-2')
      .set('x-user-role', 'guest')
      .set('x-family-id', 'family-1');

    expect(denied.status).toBe(403);
    expect(allowed.status).toBe(200);
    expect(forbidden.status).toBe(403);
  });
});
