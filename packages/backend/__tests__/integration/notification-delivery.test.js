const request = require('supertest');
const { createApp } = require('../../src/app');

function fakeEmailProvider() {
  return {
    validateConfiguration: jest.fn(async () => true),
    send: jest.fn(async message => ({ status: 'accepted', providerMessageId: `fake-${message.id}` })),
  };
}

describe('notification delivery worker', () => {
  let app;
  let db;
  let close;
  let worker;
  let provider;
  let schoolId;
  let guardianId;
  let deliveryTime;
  const admin = (method, path, body) => request(app)[method](path).set('x-user-role', 'admin').send(body);

  beforeEach(async () => {
    provider = fakeEmailProvider();
    deliveryTime = new Date('2026-09-29T12:00:00.000Z');
    ({ app, db, close, notificationWorker: worker } = createApp({
      database: ':memory:',
      notificationProvider: provider,
      clock: () => new Date(deliveryTime),
    }));
    schoolId = (await admin('post', '/v1/admin/schools', { name: 'Mail School' })).body.data.id;
    const grade = await admin('post', '/v1/grades', { schoolId, name: 'Grade 1' });
    const group = await admin('post', '/v1/groups', { gradeId: grade.body.id, name: 'Group A' });
    const family = await admin('post', '/v1/families', {
      displayName: 'Opted In Family',
      schoolId,
      guardians: [{ name: 'Maria Ruiz', email: 'maria@example.test', emailConsent: true, emailConsentSource: 'family_form' }],
      children: [{ name: 'Leo Ruiz', gradeId: grade.body.id, groupId: group.body.id }],
    });
    guardianId = db.prepare('SELECT id FROM guardians WHERE family_id = ?').get(family.body.id).id;
  });

  afterEach(() => close());

  it('reports all channels disabled when Gmail OAuth configuration is absent', async () => {
    const keys = ['GMAIL_SENDER_EMAIL', 'GMAIL_OAUTH_CLIENT_ID', 'GMAIL_OAUTH_CLIENT_SECRET', 'GMAIL_OAUTH_REFRESH_TOKEN'];
    const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
    keys.forEach(key => delete process.env[key]);
    const disabled = createApp({ database: ':memory:' });
    try {
      const response = await request(disabled.app).get('/v1/notification-capabilities').set('x-user-role', 'admin');
      expect(response.body.data.channels).toEqual([
        { channel: 'email', enabled: false, provider: null },
        { channel: 'sms', enabled: false, provider: null },
        { channel: 'whatsapp', enabled: false, provider: null },
      ]);
    } finally {
      await disabled.close();
      keys.forEach(key => {
        if (previous[key] === undefined) delete process.env[key];
        else process.env[key] = previous[key];
      });
    }
  });

  it('dispatches a queued Email to the current consented contact and records provider acceptance', async () => {
    const queued = await admin('post', '/v1/notifications', {
      schoolId,
      recipients: [{ id: guardianId, type: 'guardian', channel: 'email' }],
      message: 'Session reminder',
      idempotencyKey: 'email-delivery-1',
    });

    expect(queued.status).toBe(201);
    expect(queued.body.data.status).toBe('queued');
    const outcome = await worker.processPending();
    const saved = db.prepare('SELECT status, provider_message_id AS providerMessageId FROM notifications WHERE recipient_id = ?').get(guardianId);
    const attempt = db.prepare('SELECT outcome, provider_message_id AS providerMessageId FROM notification_attempts WHERE notification_id = ?').get(queued.body.data.notifications[0].id);

    expect(outcome).toEqual({ processed: 1, accepted: 1, failed: 0, suppressed: 0 });
    expect(provider.send).toHaveBeenCalledWith(expect.objectContaining({ id: queued.body.data.notifications[0].id, to: 'maria@example.test', channel: 'email' }));
    expect(saved).toEqual({ status: 'sent', providerMessageId: `fake-${queued.body.data.notifications[0].id}` });
    expect(attempt).toEqual({ outcome: 'accepted', providerMessageId: `fake-${queued.body.data.notifications[0].id}` });
    expect(await worker.processPending()).toEqual({ processed: 0, accepted: 0, failed: 0, suppressed: 0 });
    expect(provider.send).toHaveBeenCalledTimes(1);
    const history = await admin('get', `/v1/notifications?schoolId=${schoolId}`);
    expect(history.body.data[0]).toEqual(expect.objectContaining({ status: 'sent', attemptCount: 1, lastAttemptOutcome: 'accepted' }));
    expect(history.body.data[0]).not.toHaveProperty('recipientId');
    expect(history.body.data[0]).not.toHaveProperty('message');
    expect(history.body.data[0]).not.toHaveProperty('idempotencyKey');
    const otherSchool = await admin('post', '/v1/admin/schools', { name: 'Other Mail School' });
    expect((await admin('get', `/v1/notifications?schoolId=${otherSchool.body.data.id}`)).body.data).toHaveLength(0);
    expect((await admin('post', `/v1/notifications/${queued.body.data.notifications[0].id}/resend`, { schoolId: otherSchool.body.data.id })).status).toBe(404);
    expect((await admin('post', `/v1/notifications/${queued.body.data.notifications[0].id}/cancel`, { schoolId: otherSchool.body.data.id })).status).toBe(404);
    expect((await request(app).get(`/v1/notifications?schoolId=${schoolId}`).set('x-user-role', 'coordinator')).status).toBe(403);
    expect((await admin('post', `/v1/notifications/${queued.body.data.notifications[0].id}/resend`, { schoolId })).status).toBe(409);
  });

  it('suppresses delivery if consent is revoked after queueing', async () => {
    const queued = await admin('post', '/v1/notifications', {
      schoolId,
      recipients: [{ id: guardianId, type: 'guardian', channel: 'email' }],
      message: 'Session reminder',
      idempotencyKey: 'email-delivery-revoked',
    });
    db.prepare("INSERT INTO communication_consents (id, guardian_id, channel, status, source, captured_by, created_at) VALUES ('revoke-1', ?, 'email', 'revoked', 'user_request', 'admin-test', '2999-01-01T00:00:00.000Z')").run(guardianId);

    const outcome = await worker.processPending();
    const saved = db.prepare('SELECT status FROM notifications WHERE id = ?').get(queued.body.data.notifications[0].id);

    expect(outcome.suppressed).toBe(1);
    expect(provider.send).not.toHaveBeenCalled();
    expect(saved.status).toBe('cancelled');
  });

  it('retries temporary provider failures with bounded backoff and records each attempt', async () => {
    provider.send.mockRejectedValueOnce(Object.assign(new Error('temporary failure'), { code: 'ETIMEDOUT', retryable: true }));
    const queued = await admin('post', '/v1/notifications', {
      schoolId,
      recipients: [{ id: guardianId, type: 'guardian', channel: 'email' }],
      message: 'Retry reminder',
      idempotencyKey: 'email-delivery-retry',
    });

    const first = await worker.processPending();
    const afterFirst = db.prepare('SELECT status, retry_count AS retryCount, failure_code AS failureCode FROM notifications WHERE id = ?').get(queued.body.data.notifications[0].id);
    expect(first.failed).toBe(1);
    expect(afterFirst).toEqual({ status: 'queued', retryCount: 1, failureCode: 'ETIMEDOUT' });

    deliveryTime = new Date(deliveryTime.getTime() + 31_000);
    const second = await worker.processPending();
    const attempts = db.prepare('SELECT attempt_number AS attemptNumber, outcome FROM notification_attempts WHERE notification_id = ? ORDER BY attempt_number').all(queued.body.data.notifications[0].id);
    expect(second.accepted).toBe(1);
    expect(attempts).toEqual([{ attemptNumber: 1, outcome: 'retryable_failure' }, { attemptNumber: 2, outcome: 'accepted' }]);
  });

  it('does not duplicate a provider send when two worker passes overlap', async () => {
    let releaseSend;
    provider.send.mockImplementation(() => new Promise(resolve => { releaseSend = () => resolve({ status: 'accepted', providerMessageId: 'single-claim' }); }));
    await admin('post', '/v1/notifications', {
      schoolId,
      recipients: [{ id: guardianId, type: 'guardian', channel: 'email' }],
      message: 'Concurrency reminder',
      idempotencyKey: 'email-delivery-concurrent',
    });

    const firstPass = worker.processPending();
    const secondPass = await worker.processPending();
    expect(secondPass.processed).toBe(0);
    releaseSend();
    await firstPass;
    expect(provider.send).toHaveBeenCalledTimes(1);
  });

  it('does not retry permanent provider failures', async () => {
    provider.send.mockRejectedValueOnce(Object.assign(new Error('rejected'), { code: 403 }));
    const queued = await admin('post', '/v1/notifications', {
      schoolId,
      recipients: [{ id: guardianId, type: 'guardian', channel: 'email' }],
      message: 'Permanent failure reminder',
      idempotencyKey: 'email-delivery-permanent',
    });

    const outcome = await worker.processPending();
    const saved = db.prepare('SELECT status, failure_code AS failureCode FROM notifications WHERE id = ?').get(queued.body.data.notifications[0].id);
    const attempt = db.prepare('SELECT outcome, retry_after AS retryAfter FROM notification_attempts WHERE notification_id = ?').get(queued.body.data.notifications[0].id);
    expect(outcome.failed).toBe(1);
    expect(saved).toEqual({ status: 'failed', failureCode: 'PROVIDER_HTTP_403' });
    expect(attempt).toEqual({ outcome: 'permanent_failure', retryAfter: null });
    const otherSchool = await admin('post', '/v1/admin/schools', { name: 'Retry Isolation School' });
    expect((await admin('post', `/v1/notifications/${queued.body.data.notifications[0].id}/resend`, { schoolId: otherSchool.body.data.id })).status).toBe(404);
    const retry = await admin('post', `/v1/notifications/${queued.body.data.notifications[0].id}/resend`, { schoolId });
    expect(retry.status).toBe(200);
    expect(retry.body.data.status).toBe('queued');
    const retried = await worker.processPending();
    expect(retried.accepted).toBe(1);
    expect(db.prepare('SELECT attempt_number AS attemptNumber, outcome FROM notification_attempts WHERE notification_id = ? ORDER BY attempt_number').all(queued.body.data.notifications[0].id)).toEqual([
      { attemptNumber: 1, outcome: 'permanent_failure' },
      { attemptNumber: 2, outcome: 'accepted' },
    ]);
  });

  it('fails stale sending claims as outcome unknown instead of risking an automatic duplicate', async () => {
    const queued = await admin('post', '/v1/notifications', {
      schoolId,
      recipients: [{ id: guardianId, type: 'guardian', channel: 'email' }],
      message: 'Stale claim reminder',
      idempotencyKey: 'email-delivery-stale-claim',
    });
    const id = queued.body.data.notifications[0].id;
    const staleAt = new Date(deliveryTime.getTime() - 11 * 60 * 1000).toISOString();
    db.prepare("UPDATE notifications SET status = 'sending', sending_at = ? WHERE id = ?").run(staleAt, id);

    const outcome = await worker.processPending();
    const saved = db.prepare('SELECT status, failure_code AS failureCode FROM notifications WHERE id = ?').get(id);
    expect(outcome).toEqual({ processed: 0, accepted: 0, failed: 0, suppressed: 0 });
    expect(saved).toEqual({ status: 'failed', failureCode: 'DELIVERY_OUTCOME_UNKNOWN' });
    expect(provider.send).not.toHaveBeenCalled();
    expect(db.prepare('SELECT action FROM audit_records WHERE entity_type = \'notification\' AND entity_id = ? ORDER BY created_at DESC LIMIT 1').get(id).action).toBe('delivery_outcome_unknown');
  });

  it('never sends a queued notification after it has been cancelled', async () => {
    const queued = await admin('post', '/v1/notifications', {
      schoolId,
      recipients: [{ id: guardianId, type: 'guardian', channel: 'email' }],
      message: 'Cancelled reminder',
      idempotencyKey: 'email-delivery-cancelled',
    });
    const cancelled = await admin('post', `/v1/notifications/${queued.body.data.notifications[0].id}/cancel`, { schoolId });

    const outcome = await worker.processPending();
    expect(cancelled.status).toBe(200);
    expect(outcome.processed).toBe(0);
    expect(provider.send).not.toHaveBeenCalled();
  });

  it('stops automatic retries at the configured maximum attempt count', async () => {
    provider.send.mockRejectedValue(Object.assign(new Error('temporary failure'), { code: 'ETIMEDOUT', retryable: true }));
    const queued = await admin('post', '/v1/notifications', {
      schoolId,
      recipients: [{ id: guardianId, type: 'guardian', channel: 'email' }],
      message: 'Bounded retry reminder',
      idempotencyKey: 'email-delivery-bounded',
    });
    for (let attempt = 0; attempt < 5; attempt += 1) {
      deliveryTime = new Date(deliveryTime.getTime() + 60 * 60 * 1000);
      await worker.processPending();
    }

    const notification = db.prepare('SELECT status, retry_count AS retryCount FROM notifications WHERE id = ?').get(queued.body.data.notifications[0].id);
    const attemptCount = db.prepare('SELECT COUNT(*) AS count FROM notification_attempts WHERE notification_id = ?').get(queued.body.data.notifications[0].id).count;
    expect(notification).toEqual({ status: 'failed', retryCount: 5 });
    expect(attemptCount).toBe(5);
    expect(provider.send).toHaveBeenCalledTimes(5);
  });
});
