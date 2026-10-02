function createCommunicationConsentService(database) {
  function consentColumn(type) {
    const column = type === 'guardian' ? 'guardian_id' : type === 'teacher' ? 'teacher_id' : null;
    if (!column) throw new Error('Unsupported communication consent identity type.');
    return column;
  }

  async function currentAsync({ type, id, channel }, storage = database) {
    const column = consentColumn(type);
    const row = await storage.one(`SELECT status, source, captured_by AS "capturedBy", created_at AS "capturedAt"
      FROM communication_consents WHERE ${column} = $1 AND channel = $2
      ORDER BY created_at DESC, CASE WHEN status = 'revoked' THEN 1 ELSE 0 END DESC, id DESC LIMIT 1`, [id, channel]);
    return row || { status: 'unknown', source: null, capturedBy: null, capturedAt: null };
  }

  async function hasConsentAsync({ type, id, channel }, storage = database) {
    return (await currentAsync({ type, id, channel }, storage)).status === 'granted';
  }

  async function recordAsync({ type, id, channel, status, source, capturedBy = null }, storage = database) {
    const column = consentColumn(type);
    if (!['email', 'sms', 'whatsapp'].includes(channel)) throw new Error('Unsupported communication channel.');
    if (!['granted', 'revoked'].includes(status)) throw new Error('Consent status must be granted or revoked.');
    const normalizedSource = String(source || '').trim();
    if (!normalizedSource || normalizedSource.length > 120) throw new Error('Consent source is required and must be 120 characters or fewer.');
    const previous = await currentAsync({ type, id, channel }, storage);
    if (previous.status === status) return previous;
    const previousTimestamp = Date.parse(previous.capturedAt || '');
    const createdAtTimestamp = Number.isFinite(previousTimestamp) ? Math.max(Date.now(), previousTimestamp + 1) : Date.now();
    const createdAt = new Date(createdAtTimestamp).toISOString();
    const consentId = `consent-${createdAtTimestamp}-${Math.random().toString(36).slice(2, 10)}`;
    await storage.execute(`INSERT INTO communication_consents (id, ${column}, channel, status, source, captured_by, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`, [consentId, id, channel, status, normalizedSource, capturedBy, createdAt]);
    return { status, source: normalizedSource, capturedBy, capturedAt: createdAt };
  }

  return { currentAsync, hasConsentAsync, recordAsync };
}

module.exports = { createCommunicationConsentService };
