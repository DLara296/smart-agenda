const request = require('supertest');
const { createApp } = require('../../src/app');

describe('session flow', () => {
  it('updates coverage after a volunteer assignment and preserves cancellation history', async () => {
    const { app, close } = createApp({ database: ':memory:', clock: () => new Date('2026-09-01T12:00:00.000Z') });
    const session = await request(app)
      .post('/v1/sessions')
      .set('x-user-role', 'coordinator')
      .send({
        schoolId: 'school-1', gradeId: 'grade-1', sessionDate: '2026-10-01',
        startTime: '09:00', endTime: '10:30',
        assignments: [{ groupId: 'group-1', language: 'en' }],
      });

    const assignment = await request(app)
      .post(`/v1/sessions/${session.body.id}/volunteers`)
      .set('x-user-role', 'coordinator')
      .send({ groupId: 'group-1', guardianId: 'guardian-1', teacherId: 'teacher-1', language: 'en', idempotencyKey: 'assignment-1' });

    expect(assignment.status).toBe(201);
    expect(assignment.body.status).toBe('confirmed');

    const cancelled = await request(app)
      .patch(`/v1/sessions/${session.body.id}/volunteers/${assignment.body.id}`)
      .set('x-user-role', 'coordinator')
      .send({ status: 'cancelled', cancellationReason: 'Sick' });

    expect(cancelled.status).toBe(200);
    const history = await request(app)
      .get(`/v1/sessions/${session.body.id}/history`)
      .set('x-user-role', 'coordinator');
    expect(history.status).toBe(200);
    expect(history.body.some(entry => entry.action === 'cancelled')).toBe(true);
    close();
  });
});
