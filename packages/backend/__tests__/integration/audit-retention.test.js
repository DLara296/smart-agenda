const request = require('supertest');
const { createApp } = require('../../src/app');

test('session cancellation history remains available after state changes', async () => {
  const { app, db } = createApp({ database: ':memory:', clock: () => new Date('2026-09-01T12:00:00.000Z') });
  const now = new Date().toISOString();
  db.prepare('INSERT INTO users (id, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run('admin-1', 'Administrator', 'admin', now, now);
  db.prepare('INSERT INTO users (id, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run('coordinator-1', 'Coordinator', 'coordinator', now, now);
  const admin = (method, path, body) => request(app)[method](path).set('x-user-role', 'admin').set('x-user-id', 'admin-1').send(body);
  const school = await admin('post', '/v1/admin/schools', { name: 'Audit Retention School' });
  const grade = await admin('post', '/v1/grades', { schoolId: school.body.data.id, name: 'Grade 1' });
  const group = await admin('post', '/v1/groups', { gradeId: grade.body.id, name: 'Group A' });
  await admin('post', '/v1/admin/school-memberships', { userId: 'coordinator-1', schoolId: school.body.data.id });
  const coordinator = (method, path, body) => request(app)[method](path).set('x-user-role', 'coordinator').set('x-user-id', 'coordinator-1').send(body);
  const session = await coordinator('post', '/v1/sessions', { schoolId: school.body.data.id, gradeId: grade.body.id, sessionDate: '2026-10-01', startTime: '09:00', endTime: '10:00', assignments: [{ groupId: group.body.id, language: 'en' }] });
  const assignment = await coordinator('post', `/v1/sessions/${session.body.id}/volunteers`, { groupId: group.body.id, guardianId: 'guardian-1', teacherId: 'teacher-1', language: 'en', idempotencyKey: 'audit-retention' });
  await coordinator('patch', `/v1/sessions/${session.body.id}/volunteers/${assignment.body.id}`, { status: 'cancelled', cancellationReason: 'Unavailable' });
  const history = await coordinator('get', `/v1/sessions/${session.body.id}/history`);
  expect(history.body.some(entry => entry.action === 'cancelled')).toBe(true);
});
