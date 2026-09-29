const request = require('supertest');
const { createApp } = require('../../src/app');

describe('notification groups', () => {
  let app;
  let db;
  let close;
  const admin = (method, path, body) => request(app)[method](path).set('x-user-role', 'admin').send(body);

  beforeEach(() => {
    ({ app, db, close } = createApp({ database: ':memory:' }));
  });
  afterEach(() => close());

  async function createContacts() {
    const school = await admin('post', '/v1/admin/schools', { name: 'Cedar School' });
    const schoolId = school.body.data.id;
    const grade = await admin('post', '/v1/grades', { schoolId, name: 'Grade 1' });
    const group = await admin('post', '/v1/groups', { gradeId: grade.body.id, name: 'Group A' });
    const family = await admin('post', '/v1/families', {
      displayName: 'Gonzalez Family',
      schoolId,
      guardians: [{ name: 'Maria Gonzalez', email: 'maria@example.test', phone: '+15551234567', relationship: 'Parent' }],
      children: [{ name: 'Leo Gonzalez', gradeId: grade.body.id, groupId: group.body.id }],
    });
    const guardianId = db.prepare('SELECT id FROM guardians WHERE family_id = ?').get(family.body.id).id;
    const teacher = await admin('post', '/v1/teachers', { name: 'Paola Ruiz', email: 'paola@example.test', phone: '+15557654321', schoolId });
    return { schoolId, guardianId, teacherId: teacher.body.id };
  }

  it('creates and edits a persistent group and resolves its members without duplicate delivery', async () => {
    const { schoolId, guardianId, teacherId } = await createContacts();
    const recipients = await admin('get', `/v1/notification-recipients?schoolId=${schoolId}`);
    expect(recipients.status).toBe(200);
    expect(recipients.body.data.find(member => member.id === guardianId).eligibleChannels).toEqual(['email', 'sms', 'whatsapp']);
    expect(recipients.body.data.find(member => member.id === guardianId).email).toBeUndefined();

    const created = await admin('post', '/v1/notification-groups', {
      schoolId, name: 'Grade 1 Families', channel: 'email', members: [{ id: guardianId, type: 'guardian' }, { id: teacherId, type: 'teacher' }],
    });
    expect(created.status).toBe(201);
    expect(created.body.data.members).toHaveLength(2);
    const listed = await admin('get', `/v1/notification-groups?schoolId=${schoolId}`);
    expect(listed.body.data[0].name).toBe('Grade 1 Families');

    const edited = await admin('patch', `/v1/notification-groups/${created.body.data.id}`, {
      schoolId, name: 'Grade 1 Contacts', channel: 'whatsapp', members: [{ id: guardianId, type: 'guardian' }],
    });
    expect(edited.status).toBe(200);
    expect(edited.body.data).toEqual(expect.objectContaining({ name: 'Grade 1 Contacts', channel: 'whatsapp' }));

    const sent = await admin('post', '/v1/notifications', {
      schoolId,
      message: 'Reading session reminder',
      idempotencyKey: 'group-send-1',
      recipients: [{ groupId: created.body.data.id }, { id: guardianId, type: 'guardian', channel: 'whatsapp' }],
    });
    expect(sent.status).toBe(201);
    expect(sent.body.data.recipientCount).toBe(1);
    expect(sent.body.data.notifications[0]).toEqual(expect.objectContaining({ recipientId: guardianId, channel: 'whatsapp', status: 'queued' }));

    const deleted = await request(app).delete(`/v1/notification-groups/${created.body.data.id}?schoolId=${schoolId}`).set('x-user-role', 'admin');
    expect(deleted.status).toBe(204);
    expect(db.prepare('SELECT id FROM guardians WHERE id = ?').get(guardianId)).toBeTruthy();
    expect(db.prepare('SELECT id FROM notification_group_members WHERE notification_group_id = ?').get(created.body.data.id)).toBeUndefined();
  });

  it('rejects invalid channels, ineligible contacts, cross-school members, and non-admin group access', async () => {
    const { schoolId, guardianId } = await createContacts();
    const emailOnlyFamily = await admin('post', '/v1/families', {
      displayName: 'Email Only Family', schoolId,
      guardians: [{ name: 'Alex Parent', email: 'alex@example.test', relationship: 'Parent' }],
      children: [{ name: 'Sam Parent', gradeId: db.prepare('SELECT id FROM grades WHERE school_id = ?').get(schoolId).id, groupId: db.prepare('SELECT g.id FROM groups g JOIN grades gr ON gr.id = g.grade_id WHERE gr.school_id = ?').get(schoolId).id }],
    });
    const emailOnlyId = db.prepare('SELECT id FROM guardians WHERE family_id = ?').get(emailOnlyFamily.body.id).id;
    const otherSchool = await admin('post', '/v1/admin/schools', { name: 'Maple School' });
    const otherTeacher = await admin('post', '/v1/teachers', { name: 'Out of scope teacher', email: 'other@example.test', schoolId: otherSchool.body.data.id });
    const invalidChannel = await admin('post', '/v1/notification-groups', { schoolId, name: 'Bad Channel', channel: 'fax', members: [{ id: guardianId, type: 'guardian' }] });
    const invalidMember = await admin('post', '/v1/notification-groups', { schoolId, name: 'No Phone', channel: 'whatsapp', members: [{ id: emailOnlyId, type: 'guardian' }] });
    const outOfSchoolMember = await admin('post', '/v1/notification-groups', { schoolId, name: 'Out of school', channel: 'email', members: [{ id: otherTeacher.body.id, type: 'teacher' }] });
    const spoofedRecipient = await admin('post', '/v1/notifications', { schoolId, message: 'Hello', recipients: [{ id: otherTeacher.body.id, type: 'teacher', channel: 'email' }] });
    const coordinator = await request(app).get(`/v1/notification-groups?schoolId=${schoolId}`).set('x-user-role', 'coordinator');
    const noRecipients = await admin('post', '/v1/notifications', { schoolId, message: 'Hello', recipients: [] });

    expect(invalidChannel.status).toBe(400);
    expect(invalidMember.status).toBe(400);
    expect(outOfSchoolMember.status).toBe(400);
    expect(spoofedRecipient.status).toBe(400);
    expect(coordinator.status).toBe(403);
    expect(noRecipients.status).toBe(400);
  });
});
