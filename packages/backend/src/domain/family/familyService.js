function createFamilyService(database) {
  function create({ displayName, schoolId, guardians = [], children = [] }) {
    const id = `family-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const transaction = database.transaction(() => {
      database.prepare("INSERT INTO family_records (id, display_name, status, created_at, updated_at) VALUES (?, ?, 'active', ?, ?)").run(id, displayName, now, now);
      const guardianInsert = database.prepare('INSERT INTO guardians (id, family_id, name, email, relationship, supported_languages, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, \'active\', ?, ?)');
      guardians.forEach(guardian => guardianInsert.run(`guardian-${Math.random().toString(36).slice(2, 8)}`, id, guardian.name, guardian.email || null, guardian.relationship || null, JSON.stringify(guardian.supportedLanguages || []), now, now));
      const studentInsert = database.prepare('INSERT INTO students (id, family_id, school_id, grade_id, group_id, name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, \'active\', ?, ?)');
      children.forEach(child => studentInsert.run(`student-${Math.random().toString(36).slice(2, 8)}`, id, schoolId, child.gradeId, child.groupId, child.name, now, now));
    });
    transaction();
    return { id, displayName, status: 'active' };
  }

  function listChildren(familyId) {
    return database.prepare('SELECT id, name, grade_id AS gradeId, group_id AS groupId FROM students WHERE family_id = ?').all(familyId);
  }

  function list() {
    return database.prepare(`
      SELECT f.id, f.display_name AS displayName,
        (SELECT COUNT(*) FROM guardians g WHERE g.family_id = f.id) AS guardianCount,
        (SELECT COUNT(*) FROM students s WHERE s.family_id = f.id) AS childCount
      FROM family_records f WHERE f.status = 'active' ORDER BY f.display_name
    `).all();
  }

  function getDetails(familyId) {
    if (!familyId) return null;
    const family = database.prepare("SELECT id, display_name AS displayName FROM family_records WHERE id = ? AND status = 'active'").get(familyId);
    if (!family) return null;
    const guardians = database.prepare('SELECT id, name, relationship FROM guardians WHERE family_id = ? ORDER BY name').all(familyId);
    const children = database.prepare(`
      SELECT s.id, s.name, g.name AS gradeName, gr.name AS groupName
      FROM students s LEFT JOIN grades g ON g.id = s.grade_id LEFT JOIN groups gr ON gr.id = s.group_id
      WHERE s.family_id = ? ORDER BY s.name
    `).all(familyId);
    return { ...family, guardians, children };
  }

  return { create, listChildren, list, getDetails };
}

module.exports = { createFamilyService };
