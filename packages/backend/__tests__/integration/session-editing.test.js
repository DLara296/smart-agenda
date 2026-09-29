const request = require('supertest');
const { createApp } = require('../../src/app');
const { SESSION_REMINDER_MESSAGE } = require('../../src/domain/notification/notificationService');

const sessionInput = { schoolId: 'school-1', gradeId: 'Grade 1', sessionDate: '2026-10-06', startTime: '07:40', endTime: '07:40', assignments: [] };

async function registerGuest(app, email) {
  const agent = request.agent(app);
  await agent.post('/v1/auth/register').send({ name: 'Guest Parent', familyName: 'Parent', email, password: 'correct-horse' });
  return agent;
}

describe('session reminders and editing', () => {
  let app;
  let close;

  beforeEach(() => {
    ({ app, close } = createApp({ database: ':memory:' }));
  });

  afterEach(() => close());

  it('queues WhatsApp and email reminders only for enabled channels', async () => {
    const agent = await registerGuest(app, 'reminders@example.com');
    const initial = await agent.get('/v1/notification-preferences');
    const saved = await agent.put('/v1/notification-preferences').send({ whatsapp: true, email: false });
    const session = await agent.post('/v1/sessions').send(sessionInput);
    const notifications = await request(app).get('/v1/notifications').set('x-user-role', 'admin');

    expect(initial.body.data).toEqual(expect.objectContaining({ whatsapp: false, email: false, reminderMessage: SESSION_REMINDER_MESSAGE, customMessage: false }));
    expect(saved.body.data).toEqual(expect.objectContaining({ whatsapp: true, email: false }));
    const reminders = notifications.body.filter(item => item.sessionId === session.body.id);
    expect(reminders).toHaveLength(1);
    expect(reminders[0]).toEqual(expect.objectContaining({ channel: 'whatsapp', type: 'session_reminder', message: SESSION_REMINDER_MESSAGE, status: 'queued' }));
  });

  it('uses a custom reminder message, validates it, and restores the default', async () => {
    const agent = await registerGuest(app, 'custom@example.com');
    await agent.put('/v1/notification-preferences').send({ email: true });
    const custom = await agent.put('/v1/notification-preferences').send({ reminderMessage: '  Bring your favorite book!  ' });
    const session = await agent.post('/v1/sessions').send(sessionInput);
    const notifications = await request(app).get('/v1/notifications').set('x-user-role', 'admin');
    const empty = await agent.put('/v1/notification-preferences').send({ reminderMessage: '   ' });
    const tooLong = await agent.put('/v1/notification-preferences').send({ reminderMessage: 'a'.repeat(501) });
    const restored = await agent.put('/v1/notification-preferences').send({ reminderMessage: null });

    expect(custom.body.data).toEqual(expect.objectContaining({ reminderMessage: 'Bring your favorite book!', customMessage: true, email: true }));
    expect(notifications.body.find(item => item.sessionId === session.body.id).message).toBe('Bring your favorite book!');
    expect(empty.status).toBe(400);
    expect(tooLong.status).toBe(400);
    expect(restored.body.data).toEqual(expect.objectContaining({ reminderMessage: SESSION_REMINDER_MESSAGE, customMessage: false }));
  });

  it('assigns a default image and lets the creator edit the session', async () => {
    const agent = await registerGuest(app, 'owner@example.com');
    const created = await agent.post('/v1/sessions').send(sessionInput);
    const image = 'data:image/png;base64,iVBORw0KGgo=';
    const edited = await agent.patch(`/v1/sessions/${created.body.id}`).send({ gradeId: 'Grade 2', startTime: '08:00', image });

    expect(created.body.image).toBe('/assets/session-default.svg');
    expect(edited.status).toBe(200);
    expect(edited.body).toEqual(expect.objectContaining({ gradeId: 'Grade 2', startTime: '08:00', image }));
  });

  it('rejects invalid images and edits by other guests', async () => {
    const owner = await registerGuest(app, 'owner2@example.com');
    const other = await registerGuest(app, 'other@example.com');
    const created = await owner.post('/v1/sessions').send(sessionInput);
    const invalid = await owner.patch(`/v1/sessions/${created.body.id}`).send({ image: 'data:image/svg+xml;base64,PHN2Zz4=' });
    const forbidden = await other.patch(`/v1/sessions/${created.body.id}`).send({ gradeId: 'Hijacked' });

    expect(invalid.status).toBe(400);
    expect(forbidden.status).toBe(403);
  });
});
