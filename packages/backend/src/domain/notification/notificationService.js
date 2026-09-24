function createNotificationService(database) {
  function create(input) {
    const existing = database.prepare('SELECT * FROM notifications WHERE idempotency_key = ?').get(input.idempotencyKey);
    if (existing) return toNotification(existing);
    const id = `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    database.prepare(`INSERT INTO notifications (id, session_id, assignment_id, type, channel, status, scheduled_for, retry_count, idempotency_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'queued', ?, 0, ?, ?, ?)`)
      .run(id, input.sessionId || null, input.assignmentId || null, input.type, input.channel, input.scheduledFor, input.idempotencyKey, now, now);
    return toNotification(database.prepare('SELECT * FROM notifications WHERE id = ?').get(id));
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
    return { id: row.id, status: row.status, type: row.type, channel: row.channel, scheduledFor: row.scheduled_for, retryCount: row.retry_count, idempotencyKey: row.idempotency_key };
  }
  return { create, cancel, fail, retry, list };
}

module.exports = { createNotificationService };
