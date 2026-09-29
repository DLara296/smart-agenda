const request = require('supertest');
const { createApp } = require('../../src/app');

describe('entity management deletion policies', () => {
  let app;
  let db;
  let close;
  const admin = (method, path, body) => request(app)[method](path).set('x-user-role', 'admin').set('x-user-id', 'admin-actor').send(body);
  const coordinator = (method, path, body) => request(app)[method](path).set('x-user-role', 'coordinator').send(body);

  beforeEach(() => { ({ app, db, close } = createApp({ database: ':memory:', clock: () => new Date('2026-09-29T12:00:00.000Z') })); });
  afterEach(() => close());

  async function createSchoolStructure(name = 'Managed School') {
    const school = await admin('post', '/v1/admin/schools', { name });
    const schoolId = school.body.data.id;
    const grade = await admin('post', '/v1/grades', { schoolId, name: 'Grade 1' });
    const group = await admin('post', '/v1/groups', { gradeId: grade.body.id, name: 'Group A' });
    return { schoolId, gradeId: grade.body.id, groupId: group.body.id };
  }

  it('archives teachers and students while preserving existing referenced records; rejects non-admin deletion', async () => {
    const { schoolId, gradeId, groupId } = await createSchoolStructure();
    const family = await admin('post', '/v1/families', {
      displayName: 'River Family', schoolId,
      guardians: [{ name: 'Parent One', email: 'parent-one@example.test' }],
      children: [{ name: 'Child One', gradeId, groupId }],
    });
    const studentId = db.prepare('SELECT id FROM students WHERE family_id = ?').get(family.body.id).id;
    const teacher = await admin('post', '/v1/teachers', { name: 'Teacher One', email: 'teacher-one@example.test', schoolId });
    const editedTeacher = await admin('patch', `/v1/teachers/${teacher.body.id}`, { name: 'Teacher Updated', email: 'teacher-updated@example.test', phone: '+15551231234', schoolId });
    const editedStudent = await admin('patch', `/v1/students/${studentId}`, { name: 'Child Updated', familyId: family.body.id, schoolId, gradeId, groupId });
    expect(editedTeacher.body.data.name).toBe('Teacher Updated');
    expect(editedStudent.body.data.name).toBe('Child Updated');

    expect((await coordinator('delete', `/v1/teachers/${teacher.body.id}`)).status).toBe(403);
    expect((await admin('delete', `/v1/teachers/${teacher.body.id}`)).status).toBe(200);
    expect(db.prepare('SELECT status FROM teachers WHERE id = ?').get(teacher.body.id).status).toBe('inactive');
    expect((await request(app).get('/v1/teachers').set('x-user-role', 'admin')).body.data).toHaveLength(0);

    expect((await admin('delete', `/v1/students/${studentId}`)).status).toBe(200);
    expect(db.prepare('SELECT status FROM students WHERE id = ?').get(studentId).status).toBe('inactive');
    expect(db.prepare("SELECT action, actor_id FROM audit_records WHERE entity_type = 'student' AND entity_id = ? AND action = 'archived'").get(studentId)).toEqual({ action: 'archived', actor_id: 'admin-actor' });
  });

  it('uses backend relationship counts to block unsafe school deletion and archives empty school structure', async () => {
    const blocked = await createSchoolStructure('Blocked School');
    await admin('post', '/v1/teachers', { name: 'Dependent Teacher', email: 'dependent@example.test', schoolId: blocked.schoolId });
    const impact = await admin('get', `/v1/admin/schools/${blocked.schoolId}/delete-impact`);
    expect(impact.body.data).toEqual(expect.objectContaining({ grades: 1, groups: 1, teachers: 1 }));
    const blockedDelete = await admin('delete', `/v1/admin/schools/${blocked.schoolId}`);
    expect(blockedDelete.status).toBe(409);
    expect(db.prepare('SELECT status FROM schools WHERE id = ?').get(blocked.schoolId).status).toBe('active');

    const empty = await createSchoolStructure('Empty School');
    const archived = await admin('delete', `/v1/admin/schools/${empty.schoolId}`);
    expect(archived.status).toBe(200);
    expect(db.prepare('SELECT status FROM schools WHERE id = ?').get(empty.schoolId).status).toBe('inactive');
    expect(db.prepare('SELECT status FROM grades WHERE id = ?').get(empty.gradeId).status).toBe('inactive');
    expect(db.prepare('SELECT status FROM groups WHERE id = ?').get(empty.groupId).status).toBe('inactive');
    const staleSchedule = await coordinator('post', '/v1/sessions', { schoolId: empty.schoolId, gradeId: empty.gradeId, sessionDate: '2026-12-01', startTime: '09:00', endTime: '10:00', assignments: [{ groupId: empty.groupId, language: 'en' }] });
    expect(staleSchedule.status).toBe(400);
  });

  it('blocks family archival with pending invitations and archives household people transactionally otherwise', async () => {
    const { schoolId, gradeId, groupId } = await createSchoolStructure('Family School');
    const family = await admin('post', '/v1/families', {
      displayName: 'Lake Family', schoolId,
      guardians: [{ name: 'Parent Lake', email: 'parent-lake@example.test' }],
      children: [{ name: 'Child Lake', gradeId, groupId }],
    });
    const guardianId = db.prepare('SELECT id FROM guardians WHERE family_id = ?').get(family.body.id).id;
    const studentId = db.prepare('SELECT id FROM students WHERE family_id = ?').get(family.body.id).id;
    const familyDetails = await admin('get', `/v1/admin/families/${family.body.id}`);
    const editedFamily = await admin('patch', `/v1/admin/families/${family.body.id}`, familyDetails.body.data);
    expect(editedFamily.body.data.displayName).toBe('Lake Family');
    await admin('post', '/v1/invitations', { email: 'pending@example.test', role: 'guest', householdId: family.body.id, expiresAt: '2027-01-01T00:00:00.000Z' });

    expect((await admin('get', `/v1/admin/families/${family.body.id}/delete-impact`)).body.data.invitations).toBe(1);
    expect((await admin('delete', `/v1/admin/families/${family.body.id}`)).status).toBe(409);
    db.prepare("UPDATE invitations SET status = 'revoked' WHERE household_id = ?").run(family.body.id);

    expect((await admin('delete', `/v1/admin/families/${family.body.id}`)).status).toBe(200);
    expect(db.prepare('SELECT status FROM family_records WHERE id = ?').get(family.body.id).status).toBe('inactive');
    expect(db.prepare('SELECT status FROM guardians WHERE id = ?').get(guardianId).status).toBe('inactive');
    expect(db.prepare('SELECT status FROM students WHERE id = ?').get(studentId).status).toBe('inactive');
  });

  it('cancels sessions and queued notifications without deleting history; protects the endpoint', async () => {
    const { schoolId, gradeId, groupId } = await createSchoolStructure('Session School');
    const session = await admin('post', '/v1/sessions', { schoolId, gradeId, sessionDate: '2026-12-01', startTime: '09:00', endTime: '10:00', assignments: [{ groupId, language: 'en' }] });
    db.prepare("INSERT INTO notifications (id, session_id, type, channel, status, scheduled_for, retry_count, idempotency_key, created_at, updated_at) VALUES ('reminder-test', ?, 'session_reminder', 'email', 'queued', '2026-12-01T08:00:00Z', 0, 'reminder-test', '2026-09-29T12:00:00Z', '2026-09-29T12:00:00Z')").run(session.body.id);

    expect((await coordinator('delete', `/v1/sessions/${session.body.id}`)).status).toBe(403);
    expect((await admin('delete', `/v1/sessions/${session.body.id}`)).status).toBe(200);
    expect(db.prepare('SELECT status FROM reading_sessions WHERE id = ?').get(session.body.id).status).toBe('cancelled');
    expect(db.prepare('SELECT status FROM notifications WHERE id = ?').get('reminder-test').status).toBe('cancelled');
    expect(db.prepare("SELECT action FROM audit_records WHERE entity_type = 'reading_session' AND entity_id = ? AND action = 'archived'").get(session.body.id)).toBeTruthy();
  });
});
