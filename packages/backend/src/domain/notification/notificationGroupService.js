const CHANNELS = ['sms', 'whatsapp', 'email'];

function createNotificationGroupService(database, consentService = null) {
  const fail = (code, message, status = 400) => {
    const error = new Error(message);
    error.code = code;
    error.status = status;
    throw error;
  };

  function contactChannels(email, phone) {
    const channels = [];
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())) channels.push('email');
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length >= 7 && digits.length <= 15) channels.push('sms', 'whatsapp');
    return channels;
  }

  async function getMemberAsync(schoolId, member, storage = database, asyncConsentService = consentService) {
    if (!member || typeof member.id !== 'string' || !member.id) return null;
    if (member.type === 'guardian') {
      const row = await storage.one(`SELECT g.id, g.name, g.email, g.phone, g.relationship, g.status,
        EXISTS (SELECT 1 FROM students s WHERE s.family_id = g.family_id AND s.school_id = $1 AND s.status = 'active') AS "inSchool"
        FROM guardians g WHERE g.id = $2`, [schoolId, member.id]);
      if (!row) return null;
      const active = row.status === 'active' && Boolean(row.inSchool);
      const emailConsent = active && Boolean(await asyncConsentService?.hasConsentAsync?.({ type: 'guardian', id: row.id, channel: 'email' }, storage));
      return { id: row.id, type: 'guardian', name: row.name, role: row.relationship || 'Parent / Relative', active, emailConsent, eligibleChannels: active ? contactChannels(row.email, row.phone) : [] };
    }
    if (member.type === 'teacher') {
      const row = await storage.one('SELECT id, name, email, phone, school_id AS "schoolId", status FROM teachers WHERE id = $1', [member.id]);
      if (!row) return null;
      const active = row.status === 'active' && row.schoolId === schoolId;
      const emailConsent = active && Boolean(await asyncConsentService?.hasConsentAsync?.({ type: 'teacher', id: row.id, channel: 'email' }, storage));
      return { id: row.id, type: 'teacher', name: row.name, role: 'Teacher', active, emailConsent, eligibleChannels: active ? contactChannels(row.email, row.phone) : [] };
    }
    return null;
  }

  async function getGroupAsync(id, schoolId, storage = database, asyncConsentService = consentService) {
    const group = await storage.one('SELECT id, school_id AS "schoolId", name, channel, created_at AS "createdAt", updated_at AS "updatedAt" FROM notification_groups WHERE id = $1 AND school_id = $2', [id, schoolId]);
    if (!group) return null;
    const rows = await storage.query('SELECT guardian_id AS "guardianId", teacher_id AS "teacherId" FROM notification_group_members WHERE notification_group_id = $1 ORDER BY created_at', [id]);
    const members = await Promise.all(rows.map(row => getMemberAsync(schoolId, row.guardianId ? { id: row.guardianId, type: 'guardian' } : { id: row.teacherId, type: 'teacher' }, storage, asyncConsentService)));
    return { ...group, members: members.filter(Boolean) };
  }

  async function listRecipientsAsync(schoolId, storage = database, asyncConsentService = consentService) {
    if (!await storage.one("SELECT id FROM schools WHERE id = $1 AND status = 'active'", [schoolId])) fail('SCHOOL_NOT_FOUND', 'Select a valid school.', 404);
    const guardianRows = await storage.query(`SELECT DISTINCT g.id FROM guardians g JOIN students s ON s.family_id = g.family_id
      WHERE g.status = 'active' AND s.status = 'active' AND s.school_id = $1 ORDER BY g.id`, [schoolId]);
    const teacherRows = await storage.query("SELECT id FROM teachers WHERE school_id = $1 AND status = 'active' ORDER BY name", [schoolId]);
    const [guardians, teachers] = await Promise.all([
      Promise.all(guardianRows.map(row => getMemberAsync(schoolId, { id: row.id, type: 'guardian' }, storage, asyncConsentService))),
      Promise.all(teacherRows.map(row => getMemberAsync(schoolId, { id: row.id, type: 'teacher' }, storage, asyncConsentService))),
    ]);
    return [...guardians, ...teachers].filter(Boolean);
  }

  async function listGroupsAsync(schoolId, storage = database, asyncConsentService = consentService) {
    if (!await storage.one("SELECT id FROM schools WHERE id = $1 AND status = 'active'", [schoolId])) fail('SCHOOL_NOT_FOUND', 'Select a valid school.', 404);
    const groups = await storage.query('SELECT id FROM notification_groups WHERE school_id = $1 ORDER BY name', [schoolId]);
    return Promise.all(groups.map(row => getGroupAsync(row.id, schoolId, storage, asyncConsentService)));
  }

  async function saveAsync({ id = null, schoolId, name, channel, members, createdByUserId = null }, storage = database, asyncConsentService = consentService) {
    const normalizedName = String(name || '').trim();
    if (!normalizedName || normalizedName.length > 80) fail('GROUP_NAME_REQUIRED', 'Enter a group name of 1 to 80 characters.');
    if (!CHANNELS.includes(channel)) fail('INVALID_CHANNEL', 'Choose SMS, WhatsApp, or Email.');
    if (!await storage.one("SELECT id FROM schools WHERE id = $1 AND status = 'active'", [schoolId])) fail('SCHOOL_NOT_FOUND', 'Select a valid school.', 404);
    if (!Array.isArray(members) || members.length === 0) fail('GROUP_MEMBERS_REQUIRED', 'Choose at least one group member.');
    const uniqueMembers = [...new Map(members.map(member => [`${member?.type}:${member?.id}`, member])).values()];
    const resolved = await Promise.all(uniqueMembers.map(async member => {
      const record = await getMemberAsync(schoolId, member || {}, storage, asyncConsentService);
      if (!record) fail('MEMBER_NOT_FOUND', 'One or more selected members are outside this school or no longer available.');
      if (!record.eligibleChannels.includes(channel)) fail('MEMBER_CHANNEL_UNAVAILABLE', `${record.name} cannot receive messages through ${channel}.`);
      return { ...record, memberRef: member };
    }));
    const groupId = id || `notification-group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    try {
      await storage.transaction(async transaction => {
        if (id) {
          if (!await transaction.one('SELECT id FROM notification_groups WHERE id = $1 AND school_id = $2', [id, schoolId])) fail('GROUP_NOT_FOUND', 'Notification group not found.', 404);
          await transaction.execute('UPDATE notification_groups SET name = $1, channel = $2, updated_at = $3 WHERE id = $4', [normalizedName, channel, now, id]);
          await transaction.execute('DELETE FROM notification_group_members WHERE notification_group_id = $1', [id]);
        } else {
          const owner = createdByUserId && await transaction.one('SELECT id FROM users WHERE id = $1', [createdByUserId]) ? createdByUserId : null;
          await transaction.execute('INSERT INTO notification_groups (id, school_id, name, channel, created_by_user_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)', [groupId, schoolId, normalizedName, channel, owner, now, now]);
        }
        for (const [index, { memberRef }] of resolved.entries()) await transaction.execute('INSERT INTO notification_group_members (id, notification_group_id, guardian_id, teacher_id, created_at) VALUES ($1, $2, $3, $4, $5)', [`${groupId}-member-${index + 1}`, groupId, memberRef.type === 'guardian' ? memberRef.id : null, memberRef.type === 'teacher' ? memberRef.id : null, now]);
      });
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === '23505') fail('GROUP_NAME_TAKEN', 'A group with this name already exists for the selected school.', 409);
      throw error;
    }
    return getGroupAsync(groupId, schoolId, storage, asyncConsentService);
  }

  async function removeAsync(id, schoolId, storage = database) {
    const result = await storage.execute('DELETE FROM notification_groups WHERE id = $1 AND school_id = $2', [id, schoolId]);
    return result.changes > 0;
  }

  async function resolveRecipientsAsync({ schoolId, selections }, storage = database, asyncConsentService = consentService) {
    const recipients = [];
    const unavailable = [];
    for (const selection of selections) {
      if (selection.groupId) {
        const group = await getGroupAsync(selection.groupId, schoolId, storage, asyncConsentService);
        if (!group) fail('GROUP_NOT_FOUND', 'A selected notification group is outside this school or no longer available.', 404);
        const rows = await storage.query('SELECT guardian_id AS "guardianId", teacher_id AS "teacherId" FROM notification_group_members WHERE notification_group_id = $1', [group.id]);
        for (const row of rows) {
          const member = await getMemberAsync(schoolId, row.guardianId ? { id: row.guardianId, type: 'guardian' } : { id: row.teacherId, type: 'teacher' }, storage, asyncConsentService);
          if (!member || !member.active || !member.eligibleChannels.includes(group.channel) || (group.channel === 'email' && !member.emailConsent)) unavailable.push({ groupId: group.id, memberId: row.guardianId || row.teacherId, channel: group.channel });
          else recipients.push({ id: member.id, type: member.type, channel: group.channel });
        }
      } else {
        const member = await getMemberAsync(schoolId, selection, storage, asyncConsentService);
        if (!member || !member.active) fail('MEMBER_NOT_FOUND', 'A selected recipient is outside this school or no longer available.');
        const channel = selection.channel;
        if (!CHANNELS.includes(channel)) fail('INVALID_CHANNEL', 'Choose a supported channel for individual recipients.');
        if (!member.eligibleChannels.includes(channel)) fail('MEMBER_CHANNEL_UNAVAILABLE', `${member.name} cannot receive messages through ${channel}.`);
        if (channel === 'email' && !member.emailConsent) fail('RECIPIENT_CONSENT_REQUIRED', `${member.name} has not opted in to Email notifications.`);
        recipients.push({ id: member.id, type: member.type, channel });
      }
    }
    const deduplicated = [...new Map(recipients.map(recipient => [`${recipient.type}:${recipient.id}:${recipient.channel}`, recipient])).values()];
    if (!deduplicated.length) fail('NO_VALID_RECIPIENTS', 'No selected recipient can receive this notification.');
    return { recipients: deduplicated, unavailable };
  }

  return { listRecipientsAsync, listGroupsAsync, getGroupAsync, saveAsync, removeAsync, resolveRecipientsAsync };
}

module.exports = { CHANNELS, createNotificationGroupService };