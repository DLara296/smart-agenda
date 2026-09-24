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

  return { create, listChildren };
}

module.exports = { createFamilyService };
