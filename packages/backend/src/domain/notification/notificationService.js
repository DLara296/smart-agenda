const SESSION_REMINDER_MESSAGE = 'Your next lecture session is coming, be ready, prepare and enjoyed. Dont forget take a picture of the moment and save it in SmartAgenda';
const REMINDER_CHANNELS = ['whatsapp', 'email'];

function createNotificationService(database, { enabledChannels = ['email', 'sms', 'whatsapp'], clock = () => new Date() } = {}) {
  function create(input) {
    const existing = database.prepare('SELECT * FROM notifications WHERE idempotency_key = ?').get(input.idempotencyKey);
    if (existing) return toNotification(existing);
    const id = `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const schoolId = input.schoolId || (input.sessionId ? database.prepare('SELECT school_id AS schoolId FROM reading_sessions WHERE id = ?').get(input.sessionId)?.schoolId : null);
    database.prepare(`INSERT INTO notifications (id, session_id, assignment_id, recipient_id, type, channel, message, status, scheduled_for, retry_count, idempotency_key, created_at, updated_at, school_id, recipient_type) VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', ?, 0, ?, ?, ?, ?, ?)`)
      .run(id, input.sessionId || null, input.assignmentId || null, input.recipientId || null, input.type, input.channel, input.message || null, input.scheduledFor, input.idempotencyKey, now, now, schoolId || null, input.recipientType || (input.recipientId ? 'user' : null));
    return toNotification(database.prepare('SELECT * FROM notifications WHERE id = ?').get(id));
  }

  function queueSessionReminders({ sessionId, recipientId, preferences, scheduledFor }) {
    return REMINDER_CHANNELS.filter(channel => preferences[channel] && enabledChannels.includes(channel)).map(channel => create({
      sessionId, recipientId, recipientType: 'user', channel, scheduledFor,
      type: 'session_reminder',
      message: preferences.reminderMessage || SESSION_REMINDER_MESSAGE,
      idempotencyKey: `session-reminder:${sessionId}:${recipientId}:${channel}`,
    }));
  }

  function rescheduleSessionReminders(sessionId, scheduledFor) {
    database.prepare("UPDATE notifications SET scheduled_for = ?, updated_at = ? WHERE session_id = ? AND type = 'session_reminder' AND status = 'queued'").run(scheduledFor, new Date().toISOString(), sessionId);
  }

  function cancelQueuedForSession(sessionId) {
    database.prepare("UPDATE notifications SET status = 'cancelled', updated_at = ? WHERE session_id = ? AND status = 'queued'").run(new Date().toISOString(), sessionId);
  }

  function transitionError(message) {
    const error = new Error(message);
    error.code = 'INVALID_NOTIFICATION_STATE';
    error.status = 409;
    return error;
  }
  function cancel(id) {
    const row = database.prepare('SELECT status FROM notifications WHERE id = ?').get(id);
    if (!row) return null;
    if (!['queued', 'failed'].includes(row.status)) throw transitionError('Only queued or failed notifications can be cancelled.');
    return update(id, 'cancelled');
  }
  function fail(id, reason) { return update(id, 'failed', reason); }
  function retry(id) {
    const row = database.prepare('SELECT status FROM notifications WHERE id = ?').get(id);
    if (!row) return null;
    if (row.status !== 'failed') throw transitionError('Only failed notifications can be retried.');
    database.prepare("UPDATE notifications SET status = 'queued', failure_code = NULL, scheduled_for = ?, sending_at = NULL, updated_at = ? WHERE id = ?")
      .run(clock().toISOString(), clock().toISOString(), id);
    return toNotification(database.prepare('SELECT * FROM notifications WHERE id = ?').get(id));
  }
  function list({ schoolId, limit = 50, offset = 0 } = {}) {
    if (!schoolId) return [];
    return database.prepare(`SELECT n.id, n.type, n.channel, n.status, n.scheduled_for AS scheduledFor, n.sent_at AS sentAt,
      n.retry_count AS retryCount, n.created_at AS createdAt, n.failure_code AS failureCode,
      (SELECT COUNT(*) FROM notification_attempts a WHERE a.notification_id = n.id) AS attemptCount,
      (SELECT a.outcome FROM notification_attempts a WHERE a.notification_id = n.id ORDER BY a.attempt_number DESC LIMIT 1) AS lastAttemptOutcome
      FROM notifications n WHERE n.school_id = ? ORDER BY n.created_at DESC, n.id LIMIT ? OFFSET ?`).all(schoolId, Math.min(100, Math.max(1, Number(limit) || 50)), Math.max(0, Number(offset) || 0));
  }
  function get(id) {
    const row = database.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
    return row ? toNotification(row) : null;
  }
  function markSent(id, providerMessageId) {
    database.prepare("UPDATE notifications SET status = 'sent', provider_message_id = ?, failure_code = NULL, sent_at = ?, updated_at = ? WHERE id = ? AND status = 'sending'")
      .run(providerMessageId || null, new Date().toISOString(), new Date().toISOString(), id);
    return toNotification(database.prepare('SELECT * FROM notifications WHERE id = ?').get(id));
  }
  function markSuppressed(id, failureCode = 'RECIPIENT_SUPPRESSED') {
    database.prepare("UPDATE notifications SET status = 'cancelled', failure_code = ?, updated_at = ? WHERE id = ? AND status = 'sending'")
      .run(failureCode, new Date().toISOString(), id);
    return toNotification(database.prepare('SELECT * FROM notifications WHERE id = ?').get(id));
  }
  function markAttemptFailure(id, { failureCode, retryable, attemptNumber, maxAttempts, retryAfter }) {
    const retry = retryable && attemptNumber < maxAttempts;
    database.prepare('UPDATE notifications SET status = ?, retry_count = ?, scheduled_for = ?, failure_code = ?, updated_at = ? WHERE id = ? AND status = \'sending\'')
      .run(retry ? 'queued' : 'failed', attemptNumber, retry ? retryAfter : new Date().toISOString(), failureCode || 'PROVIDER_ERROR', new Date().toISOString(), id);
    return toNotification(database.prepare('SELECT * FROM notifications WHERE id = ?').get(id));
  }
  function update(id, status, failureReason = null) {
    const now = new Date().toISOString();
    database.prepare('UPDATE notifications SET status = ?, retry_count = retry_count + ?, updated_at = ? WHERE id = ?').run(status, status === 'queued' ? 1 : 0, now, id);
    const row = database.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
    return row ? { ...toNotification(row), failureReason } : null;
  }
  function toNotification(row) {
    if (!row) return null;
    return { id: row.id, status: row.status, type: row.type, channel: row.channel, message: row.message, sessionId: row.session_id, assignmentId: row.assignment_id, schoolId: row.school_id, recipientId: row.recipient_id, recipientType: row.recipient_type, providerMessageId: row.provider_message_id, failureCode: row.failure_code, scheduledFor: row.scheduled_for, retryCount: row.retry_count, idempotencyKey: row.idempotency_key };
  }
  return { create, get, cancel, fail, retry, list, markSent, markSuppressed, markAttemptFailure, queueSessionReminders, rescheduleSessionReminders, cancelQueuedForSession };
}

module.exports = { createNotificationService, SESSION_REMINDER_MESSAGE };
