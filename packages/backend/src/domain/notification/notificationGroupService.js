const CHANNELS = ['sms', 'whatsapp', 'email'];

function createNotificationGroupService(database) {
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

  function getMember(schoolId, member) {
    if (!member || typeof member.id !== 'string' || !member.id) return null;
    if (member.type === 'guardian') {
      const row = database.prepare(`
        SELECT g.id, g.name, g.email, g.phone, g.relationship, g.status,
          EXISTS (SELECT 1 FROM students s WHERE s.family_id = g.family_id AND s.school_id = ? AND s.status = 'active') AS in_school
        FROM guardians g WHERE g.id = ?
      `).get(schoolId, member.id);
      if (!row) return null;
      return { id: row.id, type: 'guardian', name: row.name, role: row.relationship || 'Parent / Relative', active: row.status === 'active' && Boolean(row.in_school), eligibleChannels: row.status === 'active' && row.in_school ? contactChannels(row.email, row.phone) : [] };
    }
    if (member.type === 'teacher') {
      const row = database.prepare('SELECT id, name, email, phone, school_id AS schoolId, status FROM teachers WHERE id = ?').get(member.id);
      if (!row) return null;
      const active = row.status === 'active' && row.schoolId === schoolId;
      return { id: row.id, type: 'teacher', name: row.name, role: 'Teacher', active, eligibleChannels: active ? contactChannels(row.email, row.phone) : [] };
    }
    return null;
  }

  function listRecipients(schoolId) {
    if (!database.prepare("SELECT id FROM schools WHERE id = ? AND status = 'active'").get(schoolId)) fail('SCHOOL_NOT_FOUND', 'Select a valid school.', 404);
    const guardians = database.prepare(`
      SELECT DISTINCT g.id FROM guardians g JOIN students s ON s.family_id = g.family_id
      WHERE g.status = 'active' AND s.status = 'active' AND s.school_id = ? ORDER BY g.name
    `).all(schoolId).map(row => getMember(schoolId, { id: row.id, type: 'guardian' }));
    const teachers = database.prepare("SELECT id FROM teachers WHERE school_id = ? AND status = 'active' ORDER BY name").all(schoolId)
      .map(row => getMember(schoolId, { id: row.id, type: 'teacher' }));
    return [...guardians, ...teachers].filter(Boolean);
  }

  function getGroup(id, schoolId) {
    const group = database.prepare('SELECT id, school_id AS schoolId, name, channel, created_at AS createdAt, updated_at AS updatedAt FROM notification_groups WHERE id = ? AND school_id = ?').get(id, schoolId);
    if (!group) return null;
    const members = database.prepare('SELECT guardian_id AS guardianId, teacher_id AS teacherId FROM notification_group_members WHERE notification_group_id = ? ORDER BY created_at').all(id)
      .map(row => getMember(schoolId, row.guardianId ? { id: row.guardianId, type: 'guardian' } : { id: row.teacherId, type: 'teacher' }))
      .filter(Boolean);
    return { ...group, members };
  }

  function listGroups(schoolId) {
    if (!database.prepare("SELECT id FROM schools WHERE id = ? AND status = 'active'").get(schoolId)) fail('SCHOOL_NOT_FOUND', 'Select a valid school.', 404);
    return database.prepare('SELECT id FROM notification_groups WHERE school_id = ? ORDER BY name').all(schoolId).map(row => getGroup(row.id, schoolId));
  }

  function save({ id = null, schoolId, name, channel, members, createdByUserId = null }) {
    const normalizedName = String(name || '').trim();
    if (!normalizedName || normalizedName.length > 80) fail('GROUP_NAME_REQUIRED', 'Enter a group name of 1 to 80 characters.');
    if (!CHANNELS.includes(channel)) fail('INVALID_CHANNEL', 'Choose SMS, WhatsApp, or Email.');
    if (!database.prepare("SELECT id FROM schools WHERE id = ? AND status = 'active'").get(schoolId)) fail('SCHOOL_NOT_FOUND', 'Select a valid school.', 404);
    if (!Array.isArray(members) || members.length === 0) fail('GROUP_MEMBERS_REQUIRED', 'Choose at least one group member.');
    const uniqueMembers = [...new Map(members.map(member => [`${member?.type}:${member?.id}`, member])).values()];
    const resolved = uniqueMembers.map(member => {
      const record = getMember(schoolId, member || {});
      if (!record) fail('MEMBER_NOT_FOUND', 'One or more selected members are outside this school or no longer available.', 400);
      if (!record.eligibleChannels.includes(channel)) fail('MEMBER_CHANNEL_UNAVAILABLE', `${record.name} cannot receive messages through ${channel}.`, 400);
      return { ...record, memberRef: member };
    });
    const groupId = id || `notification-group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    try {
      database.transaction(() => {
        if (id) {
          const current = database.prepare('SELECT id FROM notification_groups WHERE id = ? AND school_id = ?').get(id, schoolId);
          if (!current) fail('GROUP_NOT_FOUND', 'Notification group not found.', 404);
          database.prepare('UPDATE notification_groups SET name = ?, channel = ?, updated_at = ? WHERE id = ?').run(normalizedName, channel, now, id);
          database.prepare('DELETE FROM notification_group_members WHERE notification_group_id = ?').run(id);
        } else {
          const owner = createdByUserId && database.prepare('SELECT id FROM users WHERE id = ?').get(createdByUserId) ? createdByUserId : null;
          database.prepare('INSERT INTO notification_groups (id, school_id, name, channel, created_by_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(groupId, schoolId, normalizedName, channel, owner, now, now);
        }
        const insertMember = database.prepare('INSERT INTO notification_group_members (id, notification_group_id, guardian_id, teacher_id, created_at) VALUES (?, ?, ?, ?, ?)');
        resolved.forEach(({ memberRef }, index) => insertMember.run(`${groupId}-member-${index + 1}`, groupId, memberRef.type === 'guardian' ? memberRef.id : null, memberRef.type === 'teacher' ? memberRef.id : null, now));
      })();
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') fail('GROUP_NAME_TAKEN', 'A group with this name already exists for the selected school.', 409);
      throw error;
    }
    return getGroup(groupId, schoolId);
  }

  function remove(id, schoolId) {
    return database.prepare('DELETE FROM notification_groups WHERE id = ? AND school_id = ?').run(id, schoolId).changes > 0;
  }

  function resolveRecipients({ schoolId, selections }) {
    const recipients = [];
    const unavailable = [];
    selections.forEach(selection => {
      if (selection.groupId) {
        const group = getGroup(selection.groupId, schoolId);
        if (!group) fail('GROUP_NOT_FOUND', 'A selected notification group is outside this school or no longer available.', 404);
        const rawMembers = database.prepare('SELECT guardian_id AS guardianId, teacher_id AS teacherId FROM notification_group_members WHERE notification_group_id = ?').all(group.id);
        rawMembers.forEach(row => {
          const member = getMember(schoolId, row.guardianId ? { id: row.guardianId, type: 'guardian' } : { id: row.teacherId, type: 'teacher' });
          if (!member || !member.active || !member.eligibleChannels.includes(group.channel)) {
            unavailable.push({ groupId: group.id, memberId: row.guardianId || row.teacherId, channel: group.channel });
          } else recipients.push({ id: member.id, type: member.type, channel: group.channel });
        });
      } else {
        const member = getMember(schoolId, selection);
        if (!member || !member.active) fail('MEMBER_NOT_FOUND', 'A selected recipient is outside this school or no longer available.', 400);
        const channel = selection.channel;
        if (!CHANNELS.includes(channel)) fail('INVALID_CHANNEL', 'Choose a supported channel for individual recipients.');
        if (!member.eligibleChannels.includes(channel)) fail('MEMBER_CHANNEL_UNAVAILABLE', `${member.name} cannot receive messages through ${channel}.`, 400);
        recipients.push({ id: member.id, type: member.type, channel });
      }
    });
    const deduplicated = [...new Map(recipients.map(recipient => [`${recipient.type}:${recipient.id}:${recipient.channel}`, recipient])).values()];
    if (deduplicated.length === 0) fail('NO_VALID_RECIPIENTS', 'No selected recipient can receive this notification.', 400);
    return { recipients: deduplicated, unavailable };
  }

  return { listRecipients, listGroups, getGroup, save, remove, resolveRecipients };
}

module.exports = { CHANNELS, createNotificationGroupService };