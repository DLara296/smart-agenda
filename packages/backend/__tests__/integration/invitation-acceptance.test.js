const request = require('supertest');
const { createApp } = require('../../src/app');

describe('invitation acceptance API', () => {
  it('accepts an invitation once and returns its exact assigned scope', async () => {
    const { app, db, close } = createApp({ database: ':memory:' });
    try {
      const school = await request(app)
        .post('/v1/admin/schools')
        .set('x-user-role', 'admin')
        .set('x-user-id', 'admin-test')
        .send({ name: 'Invited Coordinator School' });
      const now = new Date().toISOString();
      db.prepare('INSERT INTO users (id, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run('admin-test', 'Administrator', 'admin', now, now);
      const family = await request(app)
        .post('/v1/families')
        .set('x-user-role', 'admin')
        .set('x-user-id', 'admin-test')
        .send({ displayName: 'Invited Household', schoolId: school.body.data.id });
      const issued = await request(app)
        .post('/v1/invitations')
        .set('x-user-role', 'admin')
        .set('x-user-id', 'admin-test')
        .send({ email: 'coordinator@example.test', role: 'coordinator', householdId: family.body.id, schoolId: school.body.data.id, expiresAt: new Date(Date.now() + 60_000).toISOString() });
      const invitee = request.agent(app);
      const accepted = await invitee.post('/v1/invitations/accept').send({ token: issued.body.token, name: 'Invited Coordinator', password: 'correct-horse' });
      const replayed = await invitee.post('/v1/invitations/accept').send({ token: issued.body.token, name: 'Invited Coordinator', password: 'correct-horse' });
      const currentUser = await invitee.get('/v1/auth/me');
      const visibleSchools = await invitee.get('/v1/schools');

      expect(school.status).toBe(201);
      expect(issued.status).toBe(201);
      expect(accepted.status).toBe(200);
      expect(accepted.body.data.invitation).toEqual(expect.objectContaining({ email: 'coordinator@example.test', role: 'coordinator', householdId: family.body.id, schoolId: school.body.data.id, status: 'accepted', acceptedUserId: accepted.body.data.user.id }));
      expect(accepted.body.data.invitation).not.toHaveProperty('token');
      expect(accepted.body.data.invitation).not.toHaveProperty('issuerId');
      expect(accepted.body.data.user).toEqual(expect.objectContaining({ email: 'coordinator@example.test', role: 'coordinator', familyId: family.body.id }));
      expect(currentUser.body.data).toEqual(expect.objectContaining({ id: accepted.body.data.user.id, role: 'coordinator', familyId: family.body.id }));
      expect(visibleSchools.body.data.map(item => item.id)).toEqual([school.body.data.id]);
      expect(replayed.status).toBe(400);
      expect(replayed.body.error).toEqual({ code: 'INVALID_INVITATION', message: 'The invitation is invalid or no longer available.' });
      expect(db.prepare('SELECT status FROM invitations WHERE token = ?').get(issued.body.token).status).toBe('accepted');
      expect(db.prepare('SELECT role, family_id FROM users WHERE email = ?').get('coordinator@example.test')).toEqual({ role: 'coordinator', family_id: family.body.id });
    } finally {
      close();
    }
  });

  it('persists an expired terminal state while returning a generic rejection', async () => {
    const { app, db, close } = createApp({ database: ':memory:' });
    try {
      const now = new Date().toISOString();
      db.prepare('INSERT INTO users (id, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run('admin-test', 'Administrator', 'admin', now, now);
      const issued = await request(app)
        .post('/v1/invitations')
        .set('x-user-role', 'admin')
        .set('x-user-id', 'admin-test')
        .send({ email: 'expired@example.test', role: 'admin', expiresAt: new Date(Date.now() + 60_000).toISOString() });
      db.prepare('UPDATE invitations SET expires_at = ? WHERE token = ?').run(new Date(Date.now() - 1000).toISOString(), issued.body.token);
      const response = await request(app).post('/v1/invitations/accept').send({ token: issued.body.token });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_INVITATION');
      expect(db.prepare('SELECT status FROM invitations WHERE token = ?').get(issued.body.token).status).toBe('expired');
    } finally {
      close();
    }
  });

  it('does not consume an invitation or alter an existing account on duplicate email', async () => {
    const { app, db, close } = createApp({ database: ':memory:' });
    try {
      const now = new Date().toISOString();
      db.prepare('INSERT INTO users (id, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run('admin-test', 'Administrator', 'admin', now, now);
      const school = await request(app).post('/v1/admin/schools').set('x-user-role', 'admin').set('x-user-id', 'admin-test').send({ name: 'Duplicate Invite School' });
      const existingAccount = request.agent(app);
      await existingAccount.post('/v1/auth/register').send({ name: 'Existing Guest', email: 'existing@example.test', password: 'correct-horse' });
      const issued = await request(app).post('/v1/invitations').set('x-user-role', 'admin').set('x-user-id', 'admin-test').send({
        email: 'existing@example.test', role: 'coordinator', schoolId: school.body.data.id, expiresAt: new Date(Date.now() + 60_000).toISOString(),
      });

      const accepted = await request(app).post('/v1/invitations/accept').send({ token: issued.body.token, name: 'Impostor', password: 'another-secure-password' });
      const user = db.prepare('SELECT role, name FROM users WHERE email = ?').get('existing@example.test');
      const invitation = db.prepare('SELECT status, accepted_user_id FROM invitations WHERE id = ?').get(issued.body.id);

      expect(accepted.status).toBe(400);
      expect(accepted.body.error).toEqual({ code: 'INVALID_INVITATION', message: 'The invitation is invalid or no longer available.' });
      expect(user).toEqual({ role: 'guest', name: 'Existing Guest' });
      expect(invitation).toEqual({ status: 'pending', accepted_user_id: null });
    } finally {
      close();
    }
  });
});
