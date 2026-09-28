function createUserService(database) {
  function ensureUser({ id = 'user-coordinator', name = 'David Lara', role = 'coordinator' } = {}) {
    const existing = database.prepare('SELECT id, name, family_name AS familyName, avatar, role, email, phone, family_id AS familyId FROM users WHERE id = ?').get(id);
    if (existing) return mapUser(existing);
    const now = new Date().toISOString();
    database.prepare('INSERT INTO users (id, name, avatar, role, email, phone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, name, JSON.stringify({ value: 'DL', tone: 'default' }), role, null, null, now, now);
    return getUser(id);
  }

  function mapUser(user) {
    return { ...user, avatar: user.avatar ? JSON.parse(user.avatar) : null };
  }

  function getUser(id) {
    const user = database.prepare('SELECT id, name, family_name AS familyName, avatar, role, email, phone, family_id AS familyId FROM users WHERE id = ?').get(id);
    return user ? mapUser(user) : null;
  }

  function updateUser(id, changes) {
    const current = getUser(id) || ensureUser({ id });
    const next = {
      name: changes.name ?? current.name,
      avatar: changes.avatar ?? current.avatar,
      email: changes.email ?? current.email,
      phone: changes.phone ?? current.phone,
    };
    database.prepare('UPDATE users SET name = ?, avatar = ?, email = ?, phone = ?, updated_at = ? WHERE id = ?').run(next.name, JSON.stringify(next.avatar), next.email, next.phone, new Date().toISOString(), id);
    return getUser(id);
  }

  function getNotificationPreferences(id) {
    const row = database.prepare('SELECT notify_whatsapp, notify_email FROM users WHERE id = ?').get(id);
    return { whatsapp: Boolean(row?.notify_whatsapp), email: Boolean(row?.notify_email) };
  }

  function updateNotificationPreferences(id, changes) {
    const current = getNotificationPreferences(id);
    const next = {
      whatsapp: typeof changes.whatsapp === 'boolean' ? changes.whatsapp : current.whatsapp,
      email: typeof changes.email === 'boolean' ? changes.email : current.email,
    };
    database.prepare('UPDATE users SET notify_whatsapp = ?, notify_email = ?, updated_at = ? WHERE id = ?').run(Number(next.whatsapp), Number(next.email), new Date().toISOString(), id);
    return getNotificationPreferences(id);
  }

  return { ensureUser, getUser, updateUser, getNotificationPreferences, updateNotificationPreferences };
}

module.exports = { createUserService };