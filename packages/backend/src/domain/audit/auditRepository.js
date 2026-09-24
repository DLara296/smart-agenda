function createAuditRepository(database) {
  return {
    record({ entityType, entityId, action, actorId = null, metadata = {} }) {
      const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const createdAt = new Date().toISOString();
      database.prepare(`
        INSERT INTO audit_records (id, entity_type, entity_id, action, actor_id, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, entityType, entityId, action, actorId, JSON.stringify(metadata), createdAt);
      return { id, entityType, entityId, action, actorId, metadata, createdAt };
    },
    list(entityType, entityId) {
      const rows = entityId
        ? database.prepare('SELECT * FROM audit_records WHERE entity_type = ? AND entity_id = ? ORDER BY created_at').all(entityType, entityId)
        : database.prepare('SELECT * FROM audit_records WHERE entity_type = ? ORDER BY created_at').all(entityType);
      return rows.map(row => ({ ...row, entityType: row.entity_type, entityId: row.entity_id, actorId: row.actor_id, metadata: JSON.parse(row.metadata) }));
    },
  };
}

module.exports = { createAuditRepository };
