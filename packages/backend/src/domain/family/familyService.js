const { DEFAULT_AVATARS, resolveAvatar } = require('./avatar');

function createFamilyService(database) {
  function create({ displayName, schoolId, avatar, guardians = [], children = [] }) {
    const id = `family-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const familyAvatar = resolveAvatar(avatar, 'household');
    const guardianAvatars = guardians.map(guardian => resolveAvatar(guardian.avatar, 'guardian'));
    const childAvatars = children.map(child => resolveAvatar(child.avatar, 'child'));
    const transaction = database.transaction(() => {
      database.prepare("INSERT INTO family_records (id, display_name, avatar, status, created_at, updated_at) VALUES (?, ?, ?, 'active', ?, ?)").run(id, displayName, familyAvatar, now, now);
      const guardianInsert = database.prepare('INSERT INTO guardians (id, family_id, name, email, relationship, supported_languages, avatar, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, \'active\', ?, ?)');
      guardians.forEach((guardian, index) => guardianInsert.run(`guardian-${Math.random().toString(36).slice(2, 8)}`, id, guardian.name, guardian.email || null, guardian.relationship || null, JSON.stringify(guardian.supportedLanguages || []), guardianAvatars[index], now, now));
      const studentInsert = database.prepare('INSERT INTO students (id, family_id, school_id, grade_id, group_id, name, avatar, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, \'active\', ?, ?)');
      children.forEach((child, index) => studentInsert.run(`student-${Math.random().toString(36).slice(2, 8)}`, id, schoolId, child.gradeId, child.groupId, child.name, childAvatars[index], now, now));
    });
    transaction();
    return { id, displayName, avatar: familyAvatar, status: 'active' };
  }

  function listChildren(familyId) {
    return database.prepare('SELECT id, name, grade_id AS gradeId, group_id AS groupId FROM students WHERE family_id = ?').all(familyId);
  }

  function list() {
    return database.prepare(`
      SELECT f.id, f.display_name AS displayName, COALESCE(f.avatar, '${DEFAULT_AVATARS.household}') AS avatar,
        (SELECT COUNT(*) FROM guardians g WHERE g.family_id = f.id) AS guardianCount,
        (SELECT COUNT(*) FROM students s WHERE s.family_id = f.id) AS childCount
      FROM family_records f WHERE f.status = 'active' ORDER BY f.display_name
    `).all();
  }

  function getDetails(familyId) {
    if (!familyId) return null;
    const family = database.prepare("SELECT id, display_name AS displayName, avatar FROM family_records WHERE id = ? AND status = 'active'").get(familyId);
    if (!family) return null;
    const guardians = database.prepare("SELECT id, name, email, relationship, supported_languages AS supportedLanguages, avatar FROM guardians WHERE family_id = ? AND status = 'active' ORDER BY created_at, name").all(familyId)
      .map(guardian => ({ ...guardian, avatar: guardian.avatar || DEFAULT_AVATARS.guardian, supportedLanguages: JSON.parse(guardian.supportedLanguages || '[]') }));
    const children = database.prepare(`
      SELECT s.id, s.name, s.avatar, s.school_id AS schoolId, s.grade_id AS gradeId, s.group_id AS groupId, g.name AS gradeName, gr.name AS groupName
      FROM students s LEFT JOIN grades g ON g.id = s.grade_id LEFT JOIN groups gr ON gr.id = s.group_id
      WHERE s.family_id = ? AND s.status = 'active' ORDER BY s.created_at, s.name
    `).all(familyId).map(child => ({ ...child, avatar: child.avatar || DEFAULT_AVATARS.child }));
    return { ...family, avatar: family.avatar || DEFAULT_AVATARS.household, schoolId: children[0]?.schoolId || null, guardians, children };
  }

  function validationError(message) {
    const error = new Error(message);
    error.code = 'FAMILY_VALIDATION';
    return error;
  }

  function update(familyId, { displayName, schoolId, avatar, guardians = [], children = [] }) {
    if (!String(displayName || '').trim()) throw validationError('Family name is required.');
    if (!schoolId) throw validationError('A school is required.');
    if (guardians.length === 0 || guardians.some(guardian => !String(guardian.name || '').trim())) throw validationError('Every guardian or relative needs a name.');
    if (children.length === 0 || children.some(child => !String(child.name || '').trim() || !child.gradeId || !child.groupId)) throw validationError('Every child needs a name, grade, and group.');

    const now = new Date().toISOString();
    const familyAvatar = resolveAvatar(avatar, 'household');
    const owned = (table, id) => database.prepare(`SELECT id FROM ${table} WHERE id = ? AND family_id = ?`).get(id, familyId);
    // Removed people are deactivated, not deleted, so session history and assignments stay intact.
    database.transaction(() => {
      database.prepare('UPDATE family_records SET display_name = ?, avatar = ?, updated_at = ? WHERE id = ?').run(displayName.trim(), familyAvatar, now, familyId);

      const keptGuardians = [];
      guardians.forEach(guardian => {
        const values = [guardian.name.trim(), guardian.email || null, guardian.relationship || null, JSON.stringify(guardian.supportedLanguages || []), resolveAvatar(guardian.avatar, 'guardian')];
        if (guardian.id) {
          if (!owned('guardians', guardian.id)) throw validationError('A guardian does not belong to this family.');
          database.prepare("UPDATE guardians SET name = ?, email = ?, relationship = ?, supported_languages = ?, avatar = ?, status = 'active', updated_at = ? WHERE id = ?").run(...values, now, guardian.id);
          keptGuardians.push(guardian.id);
        } else {
          const id = `guardian-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          database.prepare("INSERT INTO guardians (id, family_id, name, email, relationship, supported_languages, avatar, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)").run(id, familyId, ...values, now, now);
          keptGuardians.push(id);
        }
      });
      database.prepare(`UPDATE guardians SET status = 'inactive', updated_at = ? WHERE family_id = ? AND id NOT IN (${keptGuardians.map(() => '?').join(', ')})`).run(now, familyId, ...keptGuardians);

      const keptChildren = [];
      children.forEach(child => {
        const values = [schoolId, child.gradeId, child.groupId, child.name.trim(), resolveAvatar(child.avatar, 'child')];
        if (child.id) {
          if (!owned('students', child.id)) throw validationError('A child does not belong to this family.');
          database.prepare("UPDATE students SET school_id = ?, grade_id = ?, group_id = ?, name = ?, avatar = ?, status = 'active', updated_at = ? WHERE id = ?").run(...values, now, child.id);
          keptChildren.push(child.id);
        } else {
          const id = `student-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          database.prepare("INSERT INTO students (id, family_id, school_id, grade_id, group_id, name, avatar, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)").run(id, familyId, ...values, now, now);
          keptChildren.push(id);
        }
      });
      database.prepare(`UPDATE students SET status = 'inactive', updated_at = ? WHERE family_id = ? AND id NOT IN (${keptChildren.map(() => '?').join(', ')})`).run(now, familyId, ...keptChildren);
    })();
    return getDetails(familyId);
  }

  return { create, listChildren, list, getDetails, update };
}

module.exports = { createFamilyService };
