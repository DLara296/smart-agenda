const request = require('supertest');
const { createApp } = require('../../src/app');

describe('invitation acceptance API', () => {
  it('accepts an invitation once and returns its exact assigned scope', async () => {
    const { app, db, close } = createApp({ database: ':memory:' });
    try {
      const issued = await request(app)
        .post('/v1/invitations')
        .set('x-user-role', 'admin')
        .set('x-user-id', 'admin-test')
        .send({ email: 'coordinator@example.test', role: 'coordinator', householdId: 'family-1', expiresAt: new Date(Date.now() + 60_000).toISOString() });
      const accepted = await request(app).post('/v1/invitations/accept').send({ token: issued.body.token });
      const replayed = await request(app).post('/v1/invitations/accept').send({ token: issued.body.token });

      expect(issued.status).toBe(201);
      expect(accepted.status).toBe(200);
      expect(accepted.body.data).toEqual(expect.objectContaining({ email: 'coordinator@example.test', role: 'coordinator', householdId: 'family-1', status: 'accepted' }));
      expect(replayed.status).toBe(400);
      expect(replayed.body.error).toEqual({ code: 'INVALID_INVITATION', message: 'The invitation is invalid or no longer available.' });
      expect(db.prepare('SELECT status FROM invitations WHERE token = ?').get(issued.body.token).status).toBe('accepted');
    } finally {
      close();
    }
  });

  it('persists an expired terminal state while returning a generic rejection', async () => {
    const { app, db, close } = createApp({ database: ':memory:' });
    try {
      const issued = await request(app)
        .post('/v1/invitations')
        .set('x-user-role', 'admin')
        .send({ email: 'expired@example.test', role: 'coordinator', expiresAt: new Date(Date.now() - 1000).toISOString() });
      const response = await request(app).post('/v1/invitations/accept').send({ token: issued.body.token });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_INVITATION');
      expect(db.prepare('SELECT status FROM invitations WHERE token = ?').get(issued.body.token).status).toBe('expired');
    } finally {
      close();
    }
  });
});
