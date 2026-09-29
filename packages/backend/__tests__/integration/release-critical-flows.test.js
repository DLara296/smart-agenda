const request = require('supertest');
const { createApp } = require('../../src/app');
const os = require('os');
const path = require('path');
const fs = require('fs');

describe('SC-006 critical flow smoke coverage', () => {
  it('covers school, session, rotation, coverage, assignment, family, auth, invitation, notification, and idempotency paths', async () => {
    const databasePath = path.join(os.tmpdir(), `smart-agenda-release-${process.pid}.db`);
    const { app, db } = createApp({ database: databasePath, clock: () => new Date('2026-09-01T12:00:00.000Z') });
    const adminPost = (path, body) => request(app).post(path).set('x-user-role', 'admin').send(body);
    const coordinatorPost = (path, body) => request(app).post(path).set('x-user-role', 'coordinator').send(body);
    const createdSchool = await adminPost('/v1/admin/schools', { name: 'Release School' });
    const schoolId = createdSchool.body.data.id;
    const grade = await adminPost('/v1/grades', { schoolId, name: 'Release Grade' });
    const group = await adminPost('/v1/groups', { gradeId: grade.body.id, name: 'Release Group' });
    const teacher = await adminPost('/v1/teachers', { name: 'Release Teacher', email: 'release-teacher@example.com', schoolId });
    const family = await adminPost('/v1/families', { displayName: 'Release Family', schoolId, guardians: [{ name: 'Parent', email: 'parent@example.com' }], children: [{ name: 'Child', gradeId: grade.body.id, groupId: group.body.id }] });
    expect(family.status).toBe(201);
    const guardianId = db.prepare('SELECT id FROM guardians WHERE family_id = ?').get(family.body.id).id;
    const session = await coordinatorPost('/v1/sessions', { schoolId, gradeId: grade.body.id, sessionDate: '2026-10-01', startTime: '09:00', endTime: '10:00', assignments: [{ groupId: group.body.id, teacherId: teacher.body.id, language: 'en' }] });
    expect(session.status).toBe(201);
    expect(session.body.coverage.warningCount).toBe(1);
    const assignment = await coordinatorPost(`/v1/sessions/${session.body.id}/volunteers`, { groupId: group.body.id, guardianId, teacherId: teacher.body.id, language: 'en', idempotencyKey: 'release-assignment' });
    expect(assignment.status).toBe(201);
    const duplicate = await coordinatorPost(`/v1/sessions/${session.body.id}/volunteers`, { groupId: group.body.id, guardianId, teacherId: teacher.body.id, language: 'en', idempotencyKey: 'release-assignment' });
    expect(duplicate.body.id).toBe(assignment.body.id);
    expect((await request(app).get('/v1/protected/school').set('x-user-role', 'guest')).status).toBe(403);
    const invitation = await adminPost('/v1/invitations', { email: 'invite@example.com', role: 'coordinator', expiresAt: new Date(Date.now() + 60000).toISOString() });
    expect(invitation.status).toBe(201);
    const notification = await coordinatorPost('/v1/notifications', { schoolId, message: 'Release notification', idempotencyKey: 'release-notification', recipients: [{ id: guardianId, type: 'guardian', channel: 'email' }] });
    expect(notification.status).toBe(201);
    expect((await request(app).post(`/v1/notifications/${notification.body.data.notifications[0].id}/resend`).set('x-user-role', 'coordinator')).status).toBe(200);
    db.close();
    fs.rmSync(databasePath, { force: true });
  });
});
