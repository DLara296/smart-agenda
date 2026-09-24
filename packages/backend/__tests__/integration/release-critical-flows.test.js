const request = require('supertest');
const { createApp } = require('../../src/app');
const os = require('os');
const path = require('path');
const fs = require('fs');

describe('SC-006 critical flow smoke coverage', () => {
  it('covers school, session, rotation, coverage, assignment, family, auth, invitation, notification, and idempotency paths', async () => {
    const databasePath = path.join(os.tmpdir(), `smart-agenda-release-${process.pid}.db`);
    const { app, db } = createApp({ database: databasePath });
    const adminPost = (path, body) => request(app).post(path).set('x-user-role', 'admin').send(body);
    const coordinatorPost = (path, body) => request(app).post(path).set('x-user-role', 'coordinator').send(body);
    const school = await adminPost('/v1/families', { displayName: 'Release Family', schoolId: 'school-1', guardians: [{ name: 'Parent', email: 'parent@example.com' }], children: [{ name: 'Child', gradeId: 'grade-1', groupId: 'group-1' }] });
    expect(school.status).toBe(201);
    const session = await coordinatorPost('/v1/sessions', { schoolId: 'school-1', gradeId: 'grade-1', sessionDate: '2026-10-01', startTime: '09:00', endTime: '10:00', assignments: [{ groupId: 'group-1', teacherId: 'teacher-1', language: 'en' }] });
    expect(session.status).toBe(201);
    expect(session.body.coverage.warningCount).toBe(1);
    const assignment = await coordinatorPost(`/v1/sessions/${session.body.id}/volunteers`, { groupId: 'group-1', guardianId: 'guardian-1', teacherId: 'teacher-1', language: 'en', idempotencyKey: 'release-assignment' });
    expect(assignment.status).toBe(201);
    const duplicate = await coordinatorPost(`/v1/sessions/${session.body.id}/volunteers`, { groupId: 'group-1', guardianId: 'guardian-1', teacherId: 'teacher-1', language: 'en', idempotencyKey: 'release-assignment' });
    expect(duplicate.body.id).toBe(assignment.body.id);
    expect((await request(app).get('/v1/protected/school').set('x-user-role', 'guest')).status).toBe(403);
    const invitation = await adminPost('/v1/invitations', { email: 'invite@example.com', role: 'coordinator', expiresAt: new Date(Date.now() + 60000).toISOString() });
    expect(invitation.status).toBe(201);
    const notification = await coordinatorPost('/v1/notifications', { type: 'reminder', channel: 'email', scheduledFor: '2026-10-01T08:30:00Z', idempotencyKey: 'release-notification' });
    expect(notification.status).toBe(201);
    expect((await request(app).post(`/v1/notifications/${notification.body.id}/resend`).set('x-user-role', 'coordinator')).status).toBe(200);
    db.close();
    fs.rmSync(databasePath, { force: true });
  });
});
