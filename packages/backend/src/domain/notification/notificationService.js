const SESSION_REMINDER_MESSAGE = 'Your next lecture session is coming, be ready, prepare and enjoyed. Dont forget take a picture of the moment and save it in SmartAgenda';
const REMINDER_CHANNELS = ['whatsapp', 'email'];

function createNotificationService(database, { enabledChannels = ['email', 'sms', 'whatsapp'], clock = () => new Date() } = {}) {
  function transitionError(message) {
    const error = new Error(message);
    error.code = 'INVALID_NOTIFICATION_STATE';
    error.status = 409;
    return error;
  }
  function toNotification(row) {
    if (!row) return null;
    return { id: row.id, status: row.status, type: row.type, channel: row.channel, message: row.message, sessionId: row.session_id, assignmentId: row.assignment_id, schoolId: row.school_id, recipientId: row.recipient_id, recipientType: row.recipient_type, providerMessageId: row.provider_message_id, failureCode: row.failure_code, scheduledFor: row.scheduled_for, retryCount: row.retry_count, idempotencyKey: row.idempotency_key };
  }

  async function createAsync(input, storage = database) {
    const existing = await storage.one('SELECT * FROM notifications WHERE idempotency_key = $1', [input.idempotencyKey]);
    if (existing) return toNotification(existing);
    const id = `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const session = !input.schoolId && input.sessionId ? await storage.one('SELECT school_id AS "schoolId" FROM reading_sessions WHERE id = $1', [input.sessionId]) : null;
    const schoolId = input.schoolId || session?.schoolId || null;
    await storage.execute(`INSERT INTO notifications (id, session_id, assignment_id, recipient_id, type, channel, message, status, scheduled_for, retry_count, idempotency_key, created_at, updated_at, school_id, recipient_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'queued', $8, 0, $9, $10, $11, $12, $13)`, [id, input.sessionId || null, input.assignmentId || null, input.recipientId || null, input.type, input.channel, input.message || null, input.scheduledFor, input.idempotencyKey, now, now, schoolId, input.recipientType || (input.recipientId ? 'user' : null)]);
    return toNotification(await storage.one('SELECT * FROM notifications WHERE id = $1', [id]));
  }

  async function getAsync(id, storage = database) {
    const row = await storage.one('SELECT * FROM notifications WHERE id = $1', [id]);
    return row ? toNotification(row) : null;
  }

  async function listAsync({ schoolId, limit = 50, offset = 0 } = {}, storage = database) {
    if (!schoolId) return [];
    return storage.query(`SELECT n.id, n.type, n.channel, n.status, n.scheduled_for AS "scheduledFor", n.sent_at AS "sentAt",
      n.retry_count AS "retryCount", n.created_at AS "createdAt", n.failure_code AS "failureCode",
      (SELECT COUNT(*) FROM notification_attempts a WHERE a.notification_id = n.id) AS "attemptCount",
      (SELECT a.outcome FROM notification_attempts a WHERE a.notification_id = n.id ORDER BY a.attempt_number DESC LIMIT 1) AS "lastAttemptOutcome"
      FROM notifications n WHERE n.school_id = $1 ORDER BY n.created_at DESC, n.id LIMIT $2 OFFSET $3`, [schoolId, Math.min(100, Math.max(1, Number(limit) || 50)), Math.max(0, Number(offset) || 0)]);
  }

  async function updateAsync(id, status, failureReason = null, storage = database) {
    const now = new Date().toISOString();
    await storage.execute('UPDATE notifications SET status = $1, retry_count = retry_count + $2, updated_at = $3 WHERE id = $4', [status, status === 'queued' ? 1 : 0, now, id]);
    const row = await storage.one('SELECT * FROM notifications WHERE id = $1', [id]);
    return row ? { ...toNotification(row), failureReason } : null;
  }

  async function cancelAsync(id, storage = database) {
    const row = await storage.one('SELECT status FROM notifications WHERE id = $1', [id]);
    if (!row) return null;
    if (!['queued', 'failed'].includes(row.status)) throw transitionError('Only queued or failed notifications can be cancelled.');
    return updateAsync(id, 'cancelled', null, storage);
  }

  async function retryAsync(id, storage = database) {
    const row = await storage.one('SELECT status FROM notifications WHERE id = $1', [id]);
    if (!row) return null;
    if (row.status !== 'failed') throw transitionError('Only failed notifications can be retried.');
    const now = clock().toISOString();
    await storage.execute("UPDATE notifications SET status = 'queued', failure_code = NULL, scheduled_for = $1, sending_at = NULL, updated_at = $2 WHERE id = $3", [now, now, id]);
    return getAsync(id, storage);
  }

  async function markSentAsync(id, providerMessageId, storage = database) {
    const now = new Date().toISOString();
    await storage.execute("UPDATE notifications SET status = 'sent', provider_message_id = $1, failure_code = NULL, sent_at = $2, updated_at = $3 WHERE id = $4 AND status = 'sending'", [providerMessageId || null, now, now, id]);
    return getAsync(id, storage);
  }

  async function markSuppressedAsync(id, failureCode = 'RECIPIENT_SUPPRESSED', storage = database) {
    await storage.execute("UPDATE notifications SET status = 'cancelled', failure_code = $1, updated_at = $2 WHERE id = $3 AND status = 'sending'", [failureCode, new Date().toISOString(), id]);
    return getAsync(id, storage);
  }

  async function markAttemptFailureAsync(id, { failureCode, retryable, attemptNumber, maxAttempts, retryAfter }, storage = database) {
    const retry = retryable && attemptNumber < maxAttempts;
    const now = new Date().toISOString();
    await storage.execute("UPDATE notifications SET status = $1, retry_count = $2, scheduled_for = $3, failure_code = $4, updated_at = $5 WHERE id = $6 AND status = 'sending'", [retry ? 'queued' : 'failed', attemptNumber, retry ? retryAfter : now, failureCode || 'PROVIDER_ERROR', now, id]);
    return getAsync(id, storage);
  }

  async function cancelQueuedForSessionAsync(sessionId, storage = database) {
    await storage.execute("UPDATE notifications SET status = 'cancelled', updated_at = $1 WHERE session_id = $2 AND status = 'queued'", [new Date().toISOString(), sessionId]);
  }

  async function rescheduleSessionRemindersAsync(sessionId, scheduledFor, storage = database) {
    await storage.execute("UPDATE notifications SET scheduled_for = $1, updated_at = $2 WHERE session_id = $3 AND type = 'session_reminder' AND status = 'queued'", [scheduledFor, new Date().toISOString(), sessionId]);
  }

  async function queueSessionRemindersAsync({ sessionId, recipientId, preferences, scheduledFor }, storage = database) {
    const results = [];
    for (const channel of REMINDER_CHANNELS.filter(value => preferences[value] && enabledChannels.includes(value))) {
      results.push(await createAsync({ sessionId, recipientId, recipientType: 'user', channel, scheduledFor, type: 'session_reminder', message: preferences.reminderMessage || SESSION_REMINDER_MESSAGE, idempotencyKey: `session-reminder:${sessionId}:${recipientId}:${channel}` }, storage));
    }
    return results;
  }

  return { createAsync, getAsync, listAsync, updateAsync, cancelAsync, retryAsync, markSentAsync, markSuppressedAsync, markAttemptFailureAsync, cancelQueuedForSessionAsync, rescheduleSessionRemindersAsync, queueSessionRemindersAsync };
}

module.exports = { createNotificationService, SESSION_REMINDER_MESSAGE };
