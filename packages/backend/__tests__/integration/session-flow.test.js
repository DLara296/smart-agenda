const request = require('supertest');
const { createApp } = require('../../src/app');

describe('session flow', () => {
  it('updates coverage after a volunteer assignment and preserves cancellation history', async () => {
    const { app, db, close } = createApp({ database: ':memory:', clock: () => new Date('2026-09-01T12:00:00.000Z') });
    const now = new Date().toISOString();
    db.prepare('INSERT INTO users (id, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run('admin-1', 'Administrator', 'admin', now, now);
    db.prepare('INSERT INTO users (id, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run('coordinator-1', 'Coordinator', 'coordinator', now, now);
    const admin = (method, path, body) => request(app)[method](path).set('x-user-role', 'admin').set('x-user-id', 'admin-1').send(body);
    const school = await admin('post', '/v1/admin/schools', { name: 'Session Flow School' });
    const grade = await admin('post', '/v1/grades', { schoolId: school.body.data.id, name: 'Grade 1' });
    const group = await admin('post', '/v1/groups', { gradeId: grade.body.id, name: 'Group A' });
    await admin('post', '/v1/admin/school-memberships', { userId: 'coordinator-1', schoolId: school.body.data.id });
    const session = await request(app)
      .post('/v1/sessions')
      .set('x-user-role', 'coordinator')
      .set('x-user-id', 'coordinator-1')
      .send({
        schoolId: school.body.data.id, gradeId: grade.body.id, sessionDate: '2026-10-01',
        startTime: '09:00', endTime: '10:30',
        assignments: [{ groupId: group.body.id, language: 'en' }],
      });

    const assignment = await request(app)
      .post(`/v1/sessions/${session.body.id}/volunteers`)
      .set('x-user-role', 'coordinator')
      .set('x-user-id', 'coordinator-1')
      .send({ groupId: group.body.id, guardianId: 'guardian-1', teacherId: 'teacher-1', language: 'en', idempotencyKey: 'assignment-1' });

    expect(assignment.status).toBe(201);
    expect(assignment.body.status).toBe('confirmed');

    const cancelled = await request(app)
      .patch(`/v1/sessions/${session.body.id}/volunteers/${assignment.body.id}`)
      .set('x-user-role', 'coordinator')
      .set('x-user-id', 'coordinator-1')
      .send({ status: 'cancelled', cancellationReason: 'Sick' });

    expect(cancelled.status).toBe(200);
    const history = await request(app)
      .get(`/v1/sessions/${session.body.id}/history`)
      .set('x-user-role', 'coordinator')
      .set('x-user-id', 'coordinator-1');
    expect(history.status).toBe(200);
    expect(history.body.some(entry => entry.action === 'cancelled')).toBe(true);
    close();
  });
});
