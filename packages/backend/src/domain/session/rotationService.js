function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createRotationService(database) {
  function createRule({ id, schoolId, pattern }) {
    database.prepare('INSERT INTO rotation_rules (id, school_id, pattern, created_at) VALUES (?, ?, ?, ?)').run(id, schoolId, JSON.stringify(pattern), new Date().toISOString());
    return getRule(id);
  }

  function getRule(id) {
    const row = database.prepare('SELECT * FROM rotation_rules WHERE id = ?').get(id);
    return row ? { id: row.id, schoolId: row.school_id, pattern: JSON.parse(row.pattern) } : null;
  }

  function createOverride({ ruleId, sessionId, kind, reason, approverId, affectedScope }) {
    const id = makeId('override');
    const now = new Date().toISOString();
    database.prepare(`
      INSERT INTO rotation_overrides (id, rule_id, session_id, kind, reason, approver_id, affected_scope, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, ruleId, sessionId, kind, reason, approverId, affectedScope, now);
    return { id, ruleId, sessionId, kind, reason, approverId, affectedScope, createdAt: now };
  }

  return { createRule, getRule, createOverride };
}

module.exports = { createRotationService };
