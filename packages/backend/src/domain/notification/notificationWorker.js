const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_RETRY_BASE_MS = 30_000;
const CLAIM_TIMEOUT_MS = 10 * 60 * 1000;
const { createDatabaseContract } = require('../../db/databaseContract');

function createNotificationWorker({ database, notificationService, providers = {}, consentService, auditRepository = null, clock = () => new Date(), maxAttempts = DEFAULT_MAX_ATTEMPTS, retryBaseMs = DEFAULT_RETRY_BASE_MS }) {
  const storage = database.driver ? database : createDatabaseContract({ driver: 'sqlite', legacy: database });
  let processing = false;
  function providerChannels() {
    return Object.keys(providers).filter(channel => providers[channel]);
  }

  async function claimPendingAsync(limit = 25) {
    const now = clock();
    const nowIso = now.toISOString();
    const staleBefore = new Date(now.getTime() - CLAIM_TIMEOUT_MS).toISOString();
    return storage.transaction(async transaction => {
      const staleClaims = await transaction.query('SELECT id, school_id AS "schoolId", channel FROM notifications WHERE status = \'sending\' AND sending_at < $1', [staleBefore]);
      for (const notification of staleClaims) {
        const changed = await transaction.execute("UPDATE notifications SET status = 'failed', failure_code = 'DELIVERY_OUTCOME_UNKNOWN', sending_at = NULL, updated_at = $1 WHERE id = $2 AND status = 'sending' AND sending_at < $3", [nowIso, notification.id, staleBefore]);
        if (changed.changes && auditRepository) {
          await auditRepository.recordAsync({ entityType: 'notification', entityId: notification.id, action: 'delivery_outcome_unknown', metadata: { schoolId: notification.schoolId, channel: notification.channel } }, transaction);
        }
      }
      const channels = providerChannels();
      if (channels.length === 0) return [];
      const placeholders = channels.map((_, index) => `$${index + 2}`).join(', ');
      const candidates = await transaction.query(`SELECT id FROM notifications WHERE status = 'queued' AND scheduled_for <= $1 AND channel IN (${placeholders}) ORDER BY scheduled_for, created_at LIMIT $${channels.length + 2}`, [nowIso, ...channels, limit]);
      const claimed = [];
      for (const candidate of candidates) {
        const result = await transaction.execute("UPDATE notifications SET status = 'sending', sending_at = $1, updated_at = $2 WHERE id = $3 AND status = 'queued'", [nowIso, nowIso, candidate.id]);
        if (result.changes === 1) claimed.push(candidate.id);
      }
      return claimed;
    });
  }

  async function resolveDestination(notification) {
    if (notification.channel !== 'email') return { available: false, reason: 'CHANNEL_UNAVAILABLE' };
    if (notification.recipientType === 'guardian') {
      const row = await storage.one(`SELECT g.email, g.status,
        EXISTS (SELECT 1 FROM students s WHERE s.family_id = g.family_id AND s.school_id = $1 AND s.status = 'active') AS in_school
        FROM guardians g WHERE g.id = $2`, [notification.schoolId, notification.recipientId]);
      if (!row || row.status !== 'active' || !row.in_school || !row.email) return { available: false, reason: 'RECIPIENT_UNAVAILABLE' };
      if (!await consentService.hasConsentAsync({ type: 'guardian', id: notification.recipientId, channel: 'email' }, storage)) return { available: false, reason: 'CONSENT_REQUIRED' };
      return { available: true, to: row.email };
    }
    if (notification.recipientType === 'teacher') {
      const row = await storage.one("SELECT email FROM teachers WHERE id = $1 AND school_id = $2 AND status = 'active'", [notification.recipientId, notification.schoolId]);
      if (!row?.email) return { available: false, reason: 'RECIPIENT_UNAVAILABLE' };
      if (!await consentService.hasConsentAsync({ type: 'teacher', id: notification.recipientId, channel: 'email' }, storage)) return { available: false, reason: 'CONSENT_REQUIRED' };
      return { available: true, to: row.email };
    }
    if (notification.recipientType === 'user') {
      const row = await storage.one('SELECT email, notify_email AS "notifyEmail", status FROM users WHERE id = $1', [notification.recipientId]);
      if (!row || row.status !== 'active' || !row.email || !row.notifyEmail) return { available: false, reason: 'RECIPIENT_UNAVAILABLE' };
      return { available: true, to: row.email };
    }
    return { available: false, reason: 'RECIPIENT_UNAVAILABLE' };
  }

  async function appendAttempt({ notificationId, attemptNumber, providerKey, outcome, providerMessageId = null, failureCode = null, startedAt, completedAt, retryAfter = null }, transaction = storage) {
    const attemptId = `notification-attempt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    await transaction.execute(`INSERT INTO notification_attempts (id, notification_id, attempt_number, provider_key, outcome, provider_message_id, safe_failure_code, started_at, completed_at, retry_after, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [attemptId, notificationId, attemptNumber, providerKey, outcome, providerMessageId, failureCode, startedAt, completedAt, retryAfter, completedAt]);
  }

  async function suppress(notification, reason, attemptNumber, startedAt) {
    const completedAt = clock().toISOString();
    await storage.transaction(async transaction => {
      await notificationService.markSuppressedAsync(notification.id, reason, transaction);
      await appendAttempt({ notificationId: notification.id, attemptNumber, providerKey: providers[notification.channel]?.key || 'unavailable', outcome: 'suppressed', failureCode: reason, startedAt, completedAt }, transaction);
      if (auditRepository) {
        const entry = { entityType: 'notification', entityId: notification.id, action: 'suppressed', metadata: { schoolId: notification.schoolId, channel: notification.channel, reason } };
        await auditRepository.recordAsync(entry, transaction);
      }
    });
  }

  async function dispatch(id) {
    const notification = await storage.one("SELECT * FROM notifications WHERE id = $1 AND status = 'sending'", [id]);
    if (!notification) return { outcome: 'skipped' };
    const provider = providers[notification.channel];
    const attemptNumber = (notification.retry_count || 0) + 1;
    const startedAt = clock().toISOString();
    const destination = await resolveDestination({
      id: notification.id,
      channel: notification.channel,
      schoolId: notification.school_id,
      recipientId: notification.recipient_id,
      recipientType: notification.recipient_type,
    });
    if (!destination.available || !provider) {
      await suppress({ id: notification.id, schoolId: notification.school_id, channel: notification.channel }, destination.reason || 'CHANNEL_UNAVAILABLE', attemptNumber, startedAt);
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
      await storage.transaction(async transaction => {
        await notificationService.markSentAsync(notification.id, result.providerMessageId, transaction);
        await appendAttempt({ notificationId: notification.id, attemptNumber, providerKey: provider.key || 'configured-provider', outcome, providerMessageId: result.providerMessageId, startedAt, completedAt }, transaction);
        if (auditRepository) {
          const entry = { entityType: 'notification', entityId: notification.id, action: 'provider_accepted', metadata: { schoolId: notification.school_id, channel: notification.channel, attemptNumber, outcome } };
          await auditRepository.recordAsync(entry, transaction);
        }
      });
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
      await storage.transaction(async transaction => {
        await notificationService.markAttemptFailureAsync(notification.id, { failureCode, retryable, attemptNumber, maxAttempts, retryAfter }, transaction);
        await appendAttempt({ notificationId: notification.id, attemptNumber, providerKey: provider.key || 'configured-provider', outcome, failureCode, startedAt, completedAt, retryAfter }, transaction);
        if (auditRepository) {
          const entry = { entityType: 'notification', entityId: notification.id, action: 'provider_failure', metadata: { schoolId: notification.school_id, channel: notification.channel, attemptNumber, outcome, failureCode } };
          await auditRepository.recordAsync(entry, transaction);
        }
      });
      return { outcome };
    }
  }

  async function processPending({ limit = 25 } = {}) {
    if (processing) return { processed: 0, accepted: 0, failed: 0, suppressed: 0 };
    processing = true;
    try {
    const ids = await claimPendingAsync(limit);
    const results = await Promise.all(ids.map(dispatch));
    return {
      processed: results.length,
      accepted: results.filter(result => result.outcome === 'accepted' || result.outcome === 'delivered').length,
      failed: results.filter(result => result.outcome === 'retryable_failure' || result.outcome === 'permanent_failure').length,
      suppressed: results.filter(result => result.outcome === 'suppressed').length,
    };
    } finally {
      processing = false;
    }
  }

  return { processPending, claimPending: claimPendingAsync };
}

module.exports = { createNotificationWorker };
