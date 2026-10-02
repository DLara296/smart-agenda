const { DEFAULT_AVATARS, resolveAvatar } = require('./avatar');

function createFamilyService(database, consentService = null) {
  function validationError(message) {
    const error = new Error(message);
    error.code = 'FAMILY_VALIDATION';
    return error;
  }

  async function listChildrenAsync(familyId, storage = database) {
    return storage.query('SELECT id, name, grade_id AS "gradeId", group_id AS "groupId" FROM students WHERE family_id = $1', [familyId]);
  }

  async function listAsync(storage = database) {
    return storage.query(`SELECT f.id, f.display_name AS "displayName", COALESCE(f.avatar, '${DEFAULT_AVATARS.household}') AS avatar,
      (SELECT COUNT(*) FROM guardians g WHERE g.family_id = f.id) AS "guardianCount",
      (SELECT COUNT(*) FROM students s WHERE s.family_id = f.id) AS "childCount"
      FROM family_records f WHERE f.status = 'active' ORDER BY f.display_name`);
  }

  async function getDetailsAsync(familyId, storage = database, asyncConsentService = consentService) {
    if (!familyId) return null;
    const family = await storage.one('SELECT id, display_name AS "displayName", avatar FROM family_records WHERE id = $1 AND status = \'active\'', [familyId]);
    if (!family) return null;
    const guardians = await storage.query('SELECT id, name, email, phone, relationship, supported_languages AS "supportedLanguages", avatar FROM guardians WHERE family_id = $1 AND status = \'active\' ORDER BY created_at, name', [familyId]);
    const children = await storage.query(`SELECT s.id, s.name, s.avatar, s.school_id AS "schoolId", s.grade_id AS "gradeId", s.group_id AS "groupId", g.name AS "gradeName", gr.name AS "groupName"
      FROM students s LEFT JOIN grades g ON g.id = s.grade_id LEFT JOIN groups gr ON gr.id = s.group_id
      WHERE s.family_id = $1 AND s.status = 'active' ORDER BY s.created_at, s.name`, [familyId]);
    const mappedGuardians = await Promise.all(guardians.map(async guardian => ({ ...guardian, avatar: guardian.avatar || DEFAULT_AVATARS.guardian, supportedLanguages: JSON.parse(guardian.supportedLanguages || '[]'), emailConsent: asyncConsentService?.hasConsentAsync ? await asyncConsentService.hasConsentAsync({ type: 'guardian', id: guardian.id, channel: 'email' }, storage) : false })));
    return { ...family, avatar: family.avatar || DEFAULT_AVATARS.household, schoolId: children[0]?.schoolId || null, guardians: mappedGuardians, children: children.map(child => ({ ...child, avatar: child.avatar || DEFAULT_AVATARS.child })) };
  }

  async function createAsync({ displayName, schoolId, avatar, guardians = [], children = [], consentActorId = null }, storage = database, asyncConsentService = consentService) {
    const id = `family-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const familyAvatar = resolveAvatar(avatar, 'household');
    const guardianAvatars = guardians.map(guardian => resolveAvatar(guardian.avatar, 'guardian'));
    const childAvatars = children.map(child => resolveAvatar(child.avatar, 'child'));
    await storage.transaction(async transaction => {
      await transaction.execute("INSERT INTO family_records (id, display_name, avatar, status, created_at, updated_at) VALUES ($1, $2, $3, 'active', $4, $5)", [id, displayName, familyAvatar, now, now]);
      for (const [index, guardian] of guardians.entries()) {
        const guardianId = `guardian-${Math.random().toString(36).slice(2, 8)}`;
        await transaction.execute("INSERT INTO guardians (id, family_id, name, email, phone, relationship, supported_languages, avatar, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, $10)", [guardianId, id, guardian.name, guardian.email || null, guardian.phone || null, guardian.relationship || null, JSON.stringify(guardian.supportedLanguages || []), guardianAvatars[index], now, now]);
        if (guardian.emailConsent === true && asyncConsentService) await asyncConsentService.recordAsync({ type: 'guardian', id: guardianId, channel: 'email', status: 'granted', source: guardian.emailConsentSource || 'family_form', capturedBy: consentActorId }, transaction);
      }
      for (const [index, child] of children.entries()) {
        await transaction.execute("INSERT INTO students (id, family_id, school_id, grade_id, group_id, name, avatar, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, $9)", [`student-${Math.random().toString(36).slice(2, 8)}`, id, schoolId, child.gradeId, child.groupId, child.name, childAvatars[index], now, now]);
      }
    });
    return { id, displayName, avatar: familyAvatar, status: 'active' };
  }

  async function updateAsync(familyId, { displayName, schoolId, avatar, guardians = [], children = [], consentActorId = null }, storage = database, asyncConsentService = consentService) {
    if (!String(displayName || '').trim()) throw validationError('Family name is required.');
    if (!schoolId) throw validationError('A school is required.');
    if (guardians.length === 0 || guardians.some(guardian => !String(guardian.name || '').trim())) throw validationError('Every guardian or relative needs a name.');
    if (children.length === 0 || children.some(child => !String(child.name || '').trim() || !child.gradeId || !child.groupId)) throw validationError('Every child needs a name, grade, and group.');

    const now = new Date().toISOString();
    const familyAvatar = resolveAvatar(avatar, 'household');
    await storage.transaction(async transaction => {
      await transaction.execute('UPDATE family_records SET display_name = $1, avatar = $2, updated_at = $3 WHERE id = $4', [displayName.trim(), familyAvatar, now, familyId]);

      const keptGuardians = [];
      for (const guardian of guardians) {
        const values = [guardian.name.trim(), guardian.email || null, guardian.phone || null, guardian.relationship || null, JSON.stringify(guardian.supportedLanguages || []), resolveAvatar(guardian.avatar, 'guardian')];
        if (guardian.id) {
          if (!await transaction.one('SELECT id FROM guardians WHERE id = $1 AND family_id = $2', [guardian.id, familyId])) throw validationError('A guardian does not belong to this family.');
          await transaction.execute("UPDATE guardians SET name = $1, email = $2, phone = $3, relationship = $4, supported_languages = $5, avatar = $6, status = 'active', updated_at = $7 WHERE id = $8", [...values, now, guardian.id]);
          if (guardian.emailConsent !== undefined && asyncConsentService) await asyncConsentService.recordAsync({ type: 'guardian', id: guardian.id, channel: 'email', status: guardian.emailConsent ? 'granted' : 'revoked', source: guardian.emailConsentSource || 'family_form', capturedBy: consentActorId }, transaction);
          keptGuardians.push(guardian.id);
        } else {
          const guardianId = `guardian-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          await transaction.execute("INSERT INTO guardians (id, family_id, name, email, phone, relationship, supported_languages, avatar, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, $10)", [guardianId, familyId, ...values, now, now]);
          if (guardian.emailConsent === true && asyncConsentService) await asyncConsentService.recordAsync({ type: 'guardian', id: guardianId, channel: 'email', status: 'granted', source: guardian.emailConsentSource || 'family_form', capturedBy: consentActorId }, transaction);
          keptGuardians.push(guardianId);
        }
      }
      if (keptGuardians.length > 0) {
        const guardianSlots = keptGuardians.map((_, index) => `$${index + 2}`).join(', ');
        await transaction.execute(`UPDATE guardians SET status = 'inactive', updated_at = $1 WHERE family_id = $${keptGuardians.length + 2} AND id NOT IN (${guardianSlots})`, [now, ...keptGuardians, familyId]);
      } else {
        await transaction.execute('UPDATE guardians SET status = \'inactive\', updated_at = $1 WHERE family_id = $2', [now, familyId]);
      }

      const keptChildren = [];
      for (const child of children) {
        const values = [schoolId, child.gradeId, child.groupId, child.name.trim(), resolveAvatar(child.avatar, 'child')];
        if (child.id) {
          if (!await transaction.one('SELECT id FROM students WHERE id = $1 AND family_id = $2', [child.id, familyId])) throw validationError('A child does not belong to this family.');
          await transaction.execute("UPDATE students SET school_id = $1, grade_id = $2, group_id = $3, name = $4, avatar = $5, status = 'active', updated_at = $6 WHERE id = $7", [...values, now, child.id]);
          keptChildren.push(child.id);
        } else {
          const childId = `student-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          await transaction.execute("INSERT INTO students (id, family_id, school_id, grade_id, group_id, name, avatar, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, $9)", [childId, familyId, ...values, now, now]);
          keptChildren.push(childId);
        }
      }
      if (keptChildren.length > 0) {
        const childSlots = keptChildren.map((_, index) => `$${index + 2}`).join(', ');
        await transaction.execute(`UPDATE students SET status = 'inactive', updated_at = $1 WHERE family_id = $${keptChildren.length + 2} AND id NOT IN (${childSlots})`, [now, ...keptChildren, familyId]);
      } else {
        await transaction.execute('UPDATE students SET status = \'inactive\', updated_at = $1 WHERE family_id = $2', [now, familyId]);
      }
    });
    return getDetailsAsync(familyId, storage, asyncConsentService);
  }

  return { listChildrenAsync, listAsync, getDetailsAsync, createAsync, updateAsync };
}

module.exports = { createFamilyService };
