function createAuditRepository(database) {
  const repository = {};
  repository.recordAsync = async ({ entityType, entityId, action, actorId = null, metadata = {} }, storage = database) => {
    const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = new Date().toISOString();
    await storage.execute(`INSERT INTO audit_records (id, entity_type, entity_id, action, actor_id, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`, [id, entityType, entityId, action, actorId, JSON.stringify(metadata), createdAt]);
    return { id, entityType, entityId, action, actorId, metadata, createdAt };
  };
  repository.listAsync = async (entityType, entityId) => {
    const rows = entityId
      ? await database.query('SELECT * FROM audit_records WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at', [entityType, entityId])
      : await database.query('SELECT * FROM audit_records WHERE entity_type = $1 ORDER BY created_at', [entityType]);
    return rows.map(row => ({ ...row, entityType: row.entity_type, entityId: row.entity_id, actorId: row.actor_id, metadata: JSON.parse(row.metadata) }));
  };
  return repository;
}

module.exports = { createAuditRepository };
