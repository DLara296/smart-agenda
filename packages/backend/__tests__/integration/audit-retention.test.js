const request = require('supertest');
const { createApp } = require('../../src/app');

test('session cancellation history remains available after state changes', async () => {
  const { app } = createApp({ database: ':memory:' });
  const session = await request(app).post('/v1/sessions').set('x-user-role', 'coordinator').send({ schoolId: 'school-1', gradeId: 'grade-1', sessionDate: '2026-10-01', startTime: '09:00', endTime: '10:00', assignments: [{ groupId: 'group-1', teacherId: 'teacher-1', language: 'en' }] });
  const assignment = await request(app).post(`/v1/sessions/${session.body.id}/volunteers`).set('x-user-role', 'coordinator').send({ groupId: 'group-1', guardianId: 'guardian-1', teacherId: 'teacher-1', language: 'en', idempotencyKey: 'audit-retention' });
  await request(app).patch(`/v1/sessions/${session.body.id}/volunteers/${assignment.body.id}`).set('x-user-role', 'coordinator').send({ status: 'cancelled', cancellationReason: 'Unavailable' });
  const history = await request(app).get(`/v1/sessions/${session.body.id}/history`).set('x-user-role', 'coordinator');
  expect(history.body.some(entry => entry.action === 'cancelled')).toBe(true);
});
