function createCommunicationConsentService(database) {
  function current({ type, id, channel }) {
    const column = type === 'guardian' ? 'guardian_id' : type === 'teacher' ? 'teacher_id' : null;
    if (!column) throw new Error('Unsupported communication consent identity type.');
    const row = database.prepare(`SELECT status, source, captured_by AS capturedBy, created_at AS capturedAt FROM communication_consents WHERE ${column} = ? AND channel = ? ORDER BY created_at DESC, id DESC LIMIT 1`).get(id, channel);
    return row || { status: 'unknown', source: null, capturedBy: null, capturedAt: null };
  }

  function record({ type, id, channel, status, source, capturedBy = null }) {
    const column = type === 'guardian' ? 'guardian_id' : type === 'teacher' ? 'teacher_id' : null;
    if (!column) throw new Error('Unsupported communication consent identity type.');
    if (!['email', 'sms', 'whatsapp'].includes(channel)) throw new Error('Unsupported communication channel.');
    if (!['granted', 'revoked'].includes(status)) throw new Error('Consent status must be granted or revoked.');
    const normalizedSource = String(source || '').trim();
    if (!normalizedSource || normalizedSource.length > 120) throw new Error('Consent source is required and must be 120 characters or fewer.');
    const previous = current({ type, id, channel });
    if (previous.status === status) return previous;
    const consentId = `consent-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const createdAt = new Date().toISOString();
    database.prepare(`INSERT INTO communication_consents (id, ${column}, channel, status, source, captured_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(consentId, id, channel, status, normalizedSource, capturedBy, createdAt);
    return { status, source: normalizedSource, capturedBy, capturedAt: createdAt };
  }

  function hasConsent({ type, id, channel }) {
    return current({ type, id, channel }).status === 'granted';
  }

  return { current, record, hasConsent };
}

module.exports = { createCommunicationConsentService };
