function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createRotationService(database) {
  async function createRuleAsync({ id, schoolId, pattern }, storage = database) {
    await storage.execute('INSERT INTO rotation_rules (id, school_id, pattern, created_at) VALUES ($1, $2, $3, $4)', [id, schoolId, JSON.stringify(pattern), new Date().toISOString()]);
    return getRuleAsync(id, storage);
  }

  async function getRuleAsync(id, storage = database) {
    const row = await storage.one('SELECT * FROM rotation_rules WHERE id = $1', [id]);
    return row ? { id: row.id, schoolId: row.school_id, pattern: JSON.parse(row.pattern) } : null;
  }

  async function createOverrideAsync({ ruleId, sessionId, kind, reason, approverId, affectedScope }, storage = database) {
    const id = makeId('override');
    const now = new Date().toISOString();
    await storage.execute(`
      INSERT INTO rotation_overrides (id, rule_id, session_id, kind, reason, approver_id, affected_scope, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [id, ruleId, sessionId, kind, reason, approverId, affectedScope, now]);
    return { id, ruleId, sessionId, kind, reason, approverId, affectedScope, createdAt: now };
  }

  return { createRuleAsync, getRuleAsync, createOverrideAsync };
}

module.exports = { createRotationService };
