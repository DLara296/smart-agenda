const { SESSION_REMINDER_MESSAGE } = require('../notification/notificationService');
const { DEFAULT_INTERFACE_EFFECT, validateBackground, validateTheme, validateOverlay, validateInterfaceEffect } = require('./appearance');

const MAX_REMINDER_LENGTH = 500;
const DEFAULT_OVERLAY = 40;

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
    const row = database.prepare('SELECT notify_whatsapp, notify_email, reminder_message FROM users WHERE id = ?').get(id);
    return { whatsapp: Boolean(row?.notify_whatsapp), email: Boolean(row?.notify_email), reminderMessage: row?.reminder_message || SESSION_REMINDER_MESSAGE, customMessage: Boolean(row?.reminder_message) };
  }

  function updateNotificationPreferences(id, changes) {
    const current = getNotificationPreferences(id);
    let reminderMessage = current.customMessage ? current.reminderMessage : null;
    if (changes.reminderMessage === null) reminderMessage = null;
    if (typeof changes.reminderMessage === 'string') {
      const trimmed = changes.reminderMessage.trim();
      if (!trimmed || trimmed.length > MAX_REMINDER_LENGTH) {
        const error = new Error(`The reminder message must be between 1 and ${MAX_REMINDER_LENGTH} characters.`);
        error.code = 'INVALID_REMINDER_MESSAGE';
        throw error;
      }
      reminderMessage = trimmed === SESSION_REMINDER_MESSAGE ? null : trimmed;
    }
    const next = {
      whatsapp: typeof changes.whatsapp === 'boolean' ? changes.whatsapp : current.whatsapp,
      email: typeof changes.email === 'boolean' ? changes.email : current.email,
    };
    database.prepare('UPDATE users SET notify_whatsapp = ?, notify_email = ?, reminder_message = ?, updated_at = ? WHERE id = ?').run(Number(next.whatsapp), Number(next.email), reminderMessage, new Date().toISOString(), id);
    return getNotificationPreferences(id);
  }

  function getAppearancePreferences(id) {
    const row = database.prepare('SELECT appearance_theme, application_background, background_overlay, interface_effect FROM users WHERE id = ?').get(id);
    return {
      theme: row?.appearance_theme || null,
      applicationBackground: row?.application_background || null,
      backgroundOverlay: row?.background_overlay ?? DEFAULT_OVERLAY,
      interfaceEffect: row?.interface_effect || DEFAULT_INTERFACE_EFFECT,
    };
  }

  // Only the fields present in the request change, so removing a background keeps the theme.
  function updateAppearancePreferences(id, changes) {
    const current = getAppearancePreferences(id);
    const next = {
      theme: 'theme' in changes ? validateTheme(changes.theme) : current.theme,
      applicationBackground: 'applicationBackground' in changes ? validateBackground(changes.applicationBackground) : current.applicationBackground,
      backgroundOverlay: 'backgroundOverlay' in changes ? validateOverlay(changes.backgroundOverlay) : current.backgroundOverlay,
      interfaceEffect: 'interfaceEffect' in changes ? validateInterfaceEffect(changes.interfaceEffect) : current.interfaceEffect,
    };
    database.prepare('UPDATE users SET appearance_theme = ?, application_background = ?, background_overlay = ?, interface_effect = ?, updated_at = ? WHERE id = ?').run(next.theme, next.applicationBackground, next.backgroundOverlay, next.interfaceEffect, new Date().toISOString(), id);
    return getAppearancePreferences(id);
  }

  return { ensureUser, getUser, updateUser, getNotificationPreferences, updateNotificationPreferences, getAppearancePreferences, updateAppearancePreferences };
}

module.exports = { createUserService };