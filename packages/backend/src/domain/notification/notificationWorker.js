const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_RETRY_BASE_MS = 30_000;
const CLAIM_TIMEOUT_MS = 10 * 60 * 1000;

function createNotificationWorker({ database, notificationService, providers = {}, consentService, auditRepository = null, clock = () => new Date(), maxAttempts = DEFAULT_MAX_ATTEMPTS, retryBaseMs = DEFAULT_RETRY_BASE_MS }) {
  function providerChannels() {
    return Object.keys(providers).filter(channel => providers[channel]);
  }

  function claimPending(limit = 25) {
    const now = clock();
    const nowIso = now.toISOString();
    const staleBefore = new Date(now.getTime() - CLAIM_TIMEOUT_MS).toISOString();
    return database.transaction(() => {
      const staleClaims = database.prepare("SELECT id, school_id AS schoolId, channel FROM notifications WHERE status = 'sending' AND sending_at < ?").all(staleBefore);
      const failStaleClaim = database.prepare("UPDATE notifications SET status = 'failed', failure_code = 'DELIVERY_OUTCOME_UNKNOWN', sending_at = NULL, updated_at = ? WHERE id = ? AND status = 'sending' AND sending_at < ?");
      staleClaims.forEach(notification => {
        const changed = failStaleClaim.run(nowIso, notification.id, staleBefore).changes;
        if (changed) auditRepository?.record({ entityType: 'notification', entityId: notification.id, action: 'delivery_outcome_unknown', metadata: { schoolId: notification.schoolId, channel: notification.channel } });
      });
      const channels = providerChannels();
      if (channels.length === 0) return [];
      const candidates = database.prepare(`SELECT id FROM notifications WHERE status = 'queued' AND scheduled_for <= ? AND channel IN (${channels.map(() => '?').join(', ')}) ORDER BY scheduled_for, created_at LIMIT ?`).all(nowIso, ...channels, limit);
      const claim = database.prepare("UPDATE notifications SET status = 'sending', sending_at = ?, updated_at = ? WHERE id = ? AND status = 'queued'");
      return candidates.filter(candidate => claim.run(nowIso, nowIso, candidate.id).changes === 1).map(candidate => candidate.id);
    })();
  }

  function resolveDestination(notification) {
    if (notification.channel !== 'email') return { available: false, reason: 'CHANNEL_UNAVAILABLE' };
    if (notification.recipientType === 'guardian') {
      const row = database.prepare(`SELECT g.email, g.status,
        EXISTS (SELECT 1 FROM students s WHERE s.family_id = g.family_id AND s.school_id = ? AND s.status = 'active') AS in_school
        FROM guardians g WHERE g.id = ?`).get(notification.schoolId, notification.recipientId);
      if (!row || row.status !== 'active' || !row.in_school || !row.email) return { available: false, reason: 'RECIPIENT_UNAVAILABLE' };
      if (!consentService.hasConsent({ type: 'guardian', id: notification.recipientId, channel: 'email' })) return { available: false, reason: 'CONSENT_REQUIRED' };
      return { available: true, to: row.email };
    }
    if (notification.recipientType === 'teacher') {
      const row = database.prepare("SELECT email FROM teachers WHERE id = ? AND school_id = ? AND status = 'active'").get(notification.recipientId, notification.schoolId);
      if (!row?.email) return { available: false, reason: 'RECIPIENT_UNAVAILABLE' };
      if (!consentService.hasConsent({ type: 'teacher', id: notification.recipientId, channel: 'email' })) return { available: false, reason: 'CONSENT_REQUIRED' };
      return { available: true, to: row.email };
    }
    if (notification.recipientType === 'user') {
      const row = database.prepare('SELECT email, notify_email AS notifyEmail, status FROM users WHERE id = ?').get(notification.recipientId);
      if (!row || row.status !== 'active' || !row.email || !row.notifyEmail) return { available: false, reason: 'RECIPIENT_UNAVAILABLE' };
      return { available: true, to: row.email };
    }
    return { available: false, reason: 'RECIPIENT_UNAVAILABLE' };
  }

  function appendAttempt({ notificationId, attemptNumber, providerKey, outcome, providerMessageId = null, failureCode = null, startedAt, completedAt, retryAfter = null }) {
    const attemptId = `notification-attempt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    database.prepare(`INSERT INTO notification_attempts (id, notification_id, attempt_number, provider_key, outcome, provider_message_id, safe_failure_code, started_at, completed_at, retry_after, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(attemptId, notificationId, attemptNumber, providerKey, outcome, providerMessageId, failureCode, startedAt, completedAt, retryAfter, completedAt);
  }

  function suppress(notification, reason, attemptNumber, startedAt) {
    const completedAt = clock().toISOString();
    database.transaction(() => {
      notificationService.markSuppressed(notification.id, reason);
      appendAttempt({ notificationId: notification.id, attemptNumber, providerKey: providers[notification.channel]?.key || 'unavailable', outcome: 'suppressed', failureCode: reason, startedAt, completedAt });
      auditRepository?.record({ entityType: 'notification', entityId: notification.id, action: 'suppressed', metadata: { schoolId: notification.school_id, channel: notification.channel, reason } });
    })();
  }

  async function dispatch(id) {
    const notification = database.prepare('SELECT * FROM notifications WHERE id = ? AND status = \'sending\'').get(id);
    if (!notification) return { outcome: 'skipped' };
    const provider = providers[notification.channel];
    const attemptNumber = (notification.retry_count || 0) + 1;
    const startedAt = clock().toISOString();
    const destination = resolveDestination({
      id: notification.id,
      channel: notification.channel,
      schoolId: notification.school_id,
      recipientId: notification.recipient_id,
      recipientType: notification.recipient_type,
    });
    if (!destination.available || !provider) {
      suppress({ id: notification.id }, destination.reason || 'CHANNEL_UNAVAILABLE', attemptNumber, startedAt);
      return { outcome: 'suppressed' };
    }

    try {
      const result = await provider.send({
        id: notification.id,
        idempotencyKey: notification.idempotency_key,
        channel: notification.channel,
        to: destination.to,
        subject: notification.type === 'session_reminder' ? 'SmartAgenda session reminder' : 'SmartAgenda notification',
        text: notification.message || '',
      });
      const completedAt = clock().toISOString();
      const outcome = result.status === 'delivered' ? 'delivered' : 'accepted';
      database.transaction(() => {
        notificationService.markSent(notification.id, result.providerMessageId);
        appendAttempt({ notificationId: notification.id, attemptNumber, providerKey: provider.key || 'configured-provider', outcome, providerMessageId: result.providerMessageId, startedAt, completedAt });
        auditRepository?.record({ entityType: 'notification', entityId: notification.id, action: 'provider_accepted', metadata: { schoolId: notification.school_id, channel: notification.channel, attemptNumber, outcome } });
      })();
      return { outcome };
    } catch (error) {
      const completedAt = clock().toISOString();
      const retryable = Boolean(error.retryable);
      const retryAfter = retryable && attemptNumber < maxAttempts
        ? new Date(clock().getTime() + retryBaseMs * (2 ** (attemptNumber - 1))).toISOString()
        : null;
      const rawFailureCode = String(error.code || '');
      const failureCode = /^\d{3}$/.test(rawFailureCode)
        ? `PROVIDER_HTTP_${rawFailureCode}`
        : /^[A-Z0-9_]{1,48}$/.test(rawFailureCode) ? rawFailureCode : 'PROVIDER_ERROR';
      const outcome = retryAfter ? 'retryable_failure' : 'permanent_failure';
      database.transaction(() => {
        notificationService.markAttemptFailure(notification.id, { failureCode, retryable, attemptNumber, maxAttempts, retryAfter });
        appendAttempt({ notificationId: notification.id, attemptNumber, providerKey: provider.key || 'configured-provider', outcome, failureCode, startedAt, completedAt, retryAfter });
        auditRepository?.record({ entityType: 'notification', entityId: notification.id, action: 'provider_failure', metadata: { schoolId: notification.school_id, channel: notification.channel, attemptNumber, outcome, failureCode } });
      })();
      return { outcome };
    }
  }

  async function processPending({ limit = 25 } = {}) {
    const ids = claimPending(limit);
    const results = await Promise.all(ids.map(dispatch));
    return {
      processed: results.length,
      accepted: results.filter(result => result.outcome === 'accepted' || result.outcome === 'delivered').length,
      failed: results.filter(result => result.outcome === 'retryable_failure' || result.outcome === 'permanent_failure').length,
      suppressed: results.filter(result => result.outcome === 'suppressed').length,
    };
  }

  return { processPending, claimPending };
}

module.exports = { createNotificationWorker };
