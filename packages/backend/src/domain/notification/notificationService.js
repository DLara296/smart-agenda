const SESSION_REMINDER_MESSAGE = 'Your next lecture session is coming, be ready, prepare and enjoyed. Dont forget take a picture of the moment and save it in SmartAgenda';
const REMINDER_CHANNELS = ['whatsapp', 'email'];

function createNotificationService(database) {
  function create(input) {
    const existing = database.prepare('SELECT * FROM notifications WHERE idempotency_key = ?').get(input.idempotencyKey);
    if (existing) return toNotification(existing);
    const id = `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    database.prepare(`INSERT INTO notifications (id, session_id, assignment_id, recipient_id, type, channel, message, status, scheduled_for, retry_count, idempotency_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', ?, 0, ?, ?, ?)`)
      .run(id, input.sessionId || null, input.assignmentId || null, input.recipientId || null, input.type, input.channel, input.message || null, input.scheduledFor, input.idempotencyKey, now, now);
    return toNotification(database.prepare('SELECT * FROM notifications WHERE id = ?').get(id));
  }

  function queueSessionReminders({ sessionId, recipientId, preferences, scheduledFor }) {
    return REMINDER_CHANNELS.filter(channel => preferences[channel]).map(channel => create({
      sessionId, recipientId, channel, scheduledFor,
      type: 'session_reminder',
      message: preferences.reminderMessage || SESSION_REMINDER_MESSAGE,
      idempotencyKey: `session-reminder:${sessionId}:${recipientId}:${channel}`,
    }));
  }

  function rescheduleSessionReminders(sessionId, scheduledFor) {
    database.prepare("UPDATE notifications SET scheduled_for = ?, updated_at = ? WHERE session_id = ? AND type = 'session_reminder' AND status = 'queued'").run(scheduledFor, new Date().toISOString(), sessionId);
  }

  function cancel(id) { return update(id, 'cancelled'); }
  function fail(id, reason) { return update(id, 'failed', reason); }
  function retry(id) { return update(id, 'queued'); }
  function list() { return database.prepare('SELECT * FROM notifications ORDER BY created_at DESC').all().map(toNotification); }
  function update(id, status, failureReason = null) {
    const now = new Date().toISOString();
    database.prepare('UPDATE notifications SET status = ?, retry_count = retry_count + ?, updated_at = ? WHERE id = ?').run(status, status === 'queued' ? 1 : 0, now, id);
    const row = database.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
    return row ? { ...toNotification(row), failureReason } : null;
  }
  function toNotification(row) {
    return { id: row.id, status: row.status, type: row.type, channel: row.channel, message: row.message, sessionId: row.session_id, recipientId: row.recipient_id, scheduledFor: row.scheduled_for, retryCount: row.retry_count, idempotencyKey: row.idempotency_key };
  }
  return { create, cancel, fail, retry, list, queueSessionReminders, rescheduleSessionReminders };
}

module.exports = { createNotificationService, SESSION_REMINDER_MESSAGE };
