const request = require('supertest');
const { createApp } = require('../../src/app');
const { SESSION_REMINDER_MESSAGE } = require('../../src/domain/notification/notificationService');

let ids;
const sessionInput = (overrides = {}) => ({ gradeId: ids.grade1, sessionDate: '2026-10-06', startTime: '07:40', endTime: '07:40', assignments: [{ groupId: ids.group1A, language: 'es' }], ...overrides });

async function registerGuest(app, email, gradeId = ids.grade1, groupId = ids.group1A) {
  const agent = request.agent(app);
  await agent.post('/v1/auth/register').send({ name: 'Guest Parent', familyName: 'Parent', email, password: 'correct-horse' });
  await agent.post('/v1/families').send({ displayName: 'Parent Family', schoolId: ids.school, guardians: [{ name: 'Parent' }], children: [{ name: 'Juliette', gradeId, groupId }] });
  return agent;
}

describe('session reminders and editing', () => {
  let app;
  let db;
  let close;

  beforeEach(async () => {
    ({ app, db, close } = createApp({ database: ':memory:', clock: () => new Date('2026-09-01T12:00:00.000Z') }));
    const admin = (path, body) => request(app).post(path).set('x-user-role', 'admin').send(body);
    ids = {};
    ids.school = (await admin('/v1/schools', { name: 'Test School' })).body.id;
    ids.grade1 = (await admin('/v1/grades', { schoolId: ids.school, name: 'Grade 1' })).body.id;
    ids.grade2 = (await admin('/v1/grades', { schoolId: ids.school, name: 'Grade 2' })).body.id;
    ids.group1A = (await admin('/v1/groups', { gradeId: ids.grade1, name: 'Group A' })).body.id;
    ids.group1B = (await admin('/v1/groups', { gradeId: ids.grade1, name: 'Group B' })).body.id;
    ids.group2A = (await admin('/v1/groups', { gradeId: ids.grade2, name: 'Group A' })).body.id;
  });

  afterEach(() => close());

  it('does not queue reminders for channels without an enabled delivery provider', async () => {
    const agent = await registerGuest(app, 'reminders@example.com');
    const initial = await agent.get('/v1/notification-preferences');
    const saved = await agent.put('/v1/notification-preferences').send({ whatsapp: true, email: false });
    const session = await agent.post('/v1/sessions').send(sessionInput());

    expect(initial.body.data).toEqual(expect.objectContaining({ whatsapp: false, email: false, reminderMessage: SESSION_REMINDER_MESSAGE, customMessage: false }));
    expect(saved.body.data).toEqual(expect.objectContaining({ whatsapp: true, email: false }));
    expect(db.prepare('SELECT COUNT(*) AS count FROM notifications WHERE session_id = ?').get(session.body.id).count).toBe(0);
  });

  it('uses a custom reminder message, validates it, and restores the default', async () => {
    const agent = await registerGuest(app, 'custom@example.com');
    await agent.put('/v1/notification-preferences').send({ email: true });
    const custom = await agent.put('/v1/notification-preferences').send({ reminderMessage: '  Bring your favorite book!  ' });
    const session = await agent.post('/v1/sessions').send(sessionInput());
    const empty = await agent.put('/v1/notification-preferences').send({ reminderMessage: '   ' });
    const tooLong = await agent.put('/v1/notification-preferences').send({ reminderMessage: 'a'.repeat(501) });
    const restored = await agent.put('/v1/notification-preferences').send({ reminderMessage: null });

    expect(custom.body.data).toEqual(expect.objectContaining({ reminderMessage: 'Bring your favorite book!', customMessage: true, email: true }));
    expect(db.prepare('SELECT COUNT(*) AS count FROM notifications WHERE session_id = ?').get(session.body.id).count).toBe(0);
    expect(empty.status).toBe(400);
    expect(tooLong.status).toBe(400);
    expect(restored.body.data).toEqual(expect.objectContaining({ reminderMessage: SESSION_REMINDER_MESSAGE, customMessage: false }));
  });

  it('assigns a default image and lets the creator edit the session', async () => {
    const agent = await registerGuest(app, 'owner@example.com');
    const created = await agent.post('/v1/sessions').send(sessionInput());
    const image = 'data:image/png;base64,iVBORw0KGgo=';
    const edited = await agent.patch(`/v1/sessions/${created.body.id}`).send({ gradeId: ids.grade1, assignments: [{ groupId: ids.group1B, language: 'en' }], startTime: '08:00', image });

    expect(edited.status).toBe(200);
    expect(edited.body).toEqual(expect.objectContaining({ gradeId: ids.grade1, startTime: '08:00', image }));
    expect(edited.body.groups).toEqual([{ groupId: ids.group1B, groupName: 'Group B', language: 'en' }]);
  });

  it('shows a guest-created session in History and the calendar scope for their child', async () => {
    const agent = await registerGuest(app, 'history@example.com');
    const created = await agent.post('/v1/sessions').send(sessionInput());
    const history = await agent.get('/v1/history/sessions');
    const mine = history.body.data.sessions.find(session => session.id === created.body.id);

    expect(created.status).toBe(201);
    expect(mine).toEqual(expect.objectContaining({ gradeName: 'Grade 1', relatedChildren: [expect.objectContaining({ name: 'Juliette' })] }));
    expect(mine.groups[0]).toEqual(expect.objectContaining({ groupName: 'Group A', language: 'es' }));
  });

  it('only lets guests schedule sessions for their own children grades and real groups', async () => {
    const agent = await registerGuest(app, 'scope@example.com');
    const noFamily = request.agent(app);
    await noFamily.post('/v1/auth/register').send({ name: 'No Kids', familyName: 'Solo', email: 'solo@example.com', password: 'correct-horse' });

    const otherGrade = await agent.post('/v1/sessions').send(sessionInput({ gradeId: ids.grade2, assignments: [{ groupId: ids.group2A, language: 'es' }] }));
    const wrongGroup = await agent.post('/v1/sessions').send(sessionInput({ assignments: [{ groupId: ids.group2A, language: 'es' }] }));
    const noGroup = await agent.post('/v1/sessions').send(sessionInput({ assignments: [] }));
    const typedGrade = await agent.post('/v1/sessions').send(sessionInput({ gradeId: 'Grade 1' }));
    const withoutChildren = await noFamily.post('/v1/sessions').send(sessionInput());
    const spoofedSchool = await agent.post('/v1/sessions').send(sessionInput({ schoolId: 'school-elsewhere' }));
    const created = await agent.post('/v1/sessions').send(sessionInput({ sessionDate: '2026-10-07' }));
    const movedAway = await agent.patch(`/v1/sessions/${created.body.id}`).send({ gradeId: ids.grade2, assignments: [{ groupId: ids.group2A, language: 'es' }] });

    [otherGrade, wrongGroup, noGroup, typedGrade, withoutChildren, movedAway].forEach(response => expect(response.status).toBe(403));
    expect(spoofedSchool.status).toBe(201);
    expect(spoofedSchool.body.schoolId).toBe(ids.school);
  });

  it('gives sessions their school timezone so calendar exports use the right local time', async () => {
    const admin = (method, path, body) => request(app)[method](path).set('x-user-role', 'admin').send(body);
    const school = (await admin('post', '/v1/schools', { name: 'Colegio Peñalver', timezone: 'America/Mexico_City' })).body.id;
    const grade = (await admin('post', '/v1/grades', { schoolId: school, name: 'Grade 1' })).body.id;
    const group = (await admin('post', '/v1/groups', { gradeId: grade, name: 'Group A' })).body.id;
    const agent = await registerGuest(app, 'timezone@example.com', grade, group);
    const created = await agent.post('/v1/sessions').send(sessionInput({ gradeId: grade, assignments: [{ groupId: group, language: 'es' }] }));
    const history = (await agent.get('/v1/history/sessions')).body.data.sessions.find(session => session.id === created.body.id);
    const explicit = await admin('post', '/v1/sessions', { schoolId: school, gradeId: grade, sessionDate: '2026-10-06', startTime: '07:40', endTime: '08:40', timezone: 'Europe/Madrid', assignments: [] });

    expect(created.body.timezone).toBe('America/Mexico_City');
    expect(history).toEqual(expect.objectContaining({ timezone: 'America/Mexico_City', schoolName: 'Colegio Peñalver', sessionDate: '2026-10-06', startTime: '07:40' }));
    expect(explicit.body.timezone).toBe('Europe/Madrid');
  });

  it('rejects invalid images and edits by other guests', async () => {
    const owner = await registerGuest(app, 'owner2@example.com');
    const other = await registerGuest(app, 'other@example.com');
    const created = await owner.post('/v1/sessions').send(sessionInput());
    const invalid = await owner.patch(`/v1/sessions/${created.body.id}`).send({ image: 'data:image/svg+xml;base64,PHN2Zz4=' });
    const forbidden = await other.patch(`/v1/sessions/${created.body.id}`).send({ startTime: '09:00' });

    expect(invalid.status).toBe(400);
    expect(forbidden.status).toBe(403);
  });
});
