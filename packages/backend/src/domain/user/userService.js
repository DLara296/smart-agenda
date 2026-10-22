const { SESSION_REMINDER_MESSAGE } = require('../notification/notificationService');
const { DEFAULT_INTERFACE_EFFECT, validateBackground, validateTheme, validateOverlay, validateInterfaceEffect } = require('./appearance');

const MAX_REMINDER_LENGTH = 500;
const DEFAULT_OVERLAY = 40;

function createUserService(database) {
  function mapUser(user) {
    return { ...user, avatar: user.avatar ? JSON.parse(user.avatar) : null };
  }

  async function getUserAsync(id, storage = database) {
    const row = await storage.one('SELECT id, name, family_name AS "familyName", avatar, role, email, phone, family_id AS "familyId" FROM users WHERE id = $1', [id]);
    return row ? mapUser(row) : null;
  }

  async function ensureUserAsync({ id = 'user-coordinator', name = 'David Lara', role = 'coordinator' } = {}, storage = database) {
    const existing = await getUserAsync(id, storage);
    if (existing) return existing;
    const now = new Date().toISOString();
    await storage.execute('INSERT INTO users (id, name, avatar, role, email, phone, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', [id, name, JSON.stringify({ value: 'DL', tone: 'default' }), role, null, null, now, now]);
    return getUserAsync(id, storage);
  }

  async function updateUserAsync(id, changes, storage = database) {
    const current = await getUserAsync(id, storage) || await ensureUserAsync({ id }, storage);
    const next = { name: changes.name ?? current.name, avatar: changes.avatar ?? current.avatar, email: changes.email ?? current.email, phone: changes.phone ?? current.phone };
    await storage.execute('UPDATE users SET name = $1, avatar = $2, email = $3, phone = $4, updated_at = $5 WHERE id = $6', [next.name, JSON.stringify(next.avatar), next.email, next.phone, new Date().toISOString(), id]);
    return getUserAsync(id, storage);
  }

  async function getNotificationPreferencesAsync(id, storage = database) {
    const row = await storage.one('SELECT notify_whatsapp AS "notifyWhatsapp", notify_email AS "notifyEmail", reminder_message AS "reminderMessage" FROM users WHERE id = $1', [id]);
    return { whatsapp: Boolean(row?.notifyWhatsapp), email: Boolean(row?.notifyEmail), reminderMessage: row?.reminderMessage || SESSION_REMINDER_MESSAGE, customMessage: Boolean(row?.reminderMessage) };
  }

  async function updateNotificationPreferencesAsync(id, changes, storage = database) {
    const current = await getNotificationPreferencesAsync(id, storage);
    let reminderMessage = current.customMessage ? current.reminderMessage : null;
    if (changes.reminderMessage === null) reminderMessage = null;
    if (typeof changes.reminderMessage === 'string') {
      const trimmed = changes.reminderMessage.trim();
      if (!trimmed || trimmed.length > MAX_REMINDER_LENGTH) { const error = new Error(`The reminder message must be between 1 and ${MAX_REMINDER_LENGTH} characters.`); error.code = 'INVALID_REMINDER_MESSAGE'; throw error; }
      reminderMessage = trimmed === SESSION_REMINDER_MESSAGE ? null : trimmed;
    }
    const next = { whatsapp: typeof changes.whatsapp === 'boolean' ? changes.whatsapp : current.whatsapp, email: typeof changes.email === 'boolean' ? changes.email : current.email };
    await storage.execute('UPDATE users SET notify_whatsapp = $1, notify_email = $2, reminder_message = $3, updated_at = $4 WHERE id = $5', [Number(next.whatsapp), Number(next.email), reminderMessage, new Date().toISOString(), id]);
    return getNotificationPreferencesAsync(id, storage);
  }

  async function getAppearancePreferencesAsync(id, storage = database) {
    const row = await storage.one('SELECT appearance_theme AS "appearanceTheme", application_background AS "applicationBackground", background_overlay AS "backgroundOverlay", interface_effect AS "interfaceEffect" FROM users WHERE id = $1', [id]);
    return { theme: row?.appearanceTheme || null, applicationBackground: row?.applicationBackground || null, backgroundOverlay: row?.backgroundOverlay ?? DEFAULT_OVERLAY, interfaceEffect: row?.interfaceEffect || DEFAULT_INTERFACE_EFFECT };
  }

  async function updateAppearancePreferencesAsync(id, changes, storage = database) {
    const current = await getAppearancePreferencesAsync(id, storage);
    const next = { theme: 'theme' in changes ? validateTheme(changes.theme) : current.theme, applicationBackground: 'applicationBackground' in changes ? validateBackground(changes.applicationBackground) : current.applicationBackground, backgroundOverlay: 'backgroundOverlay' in changes ? validateOverlay(changes.backgroundOverlay) : current.backgroundOverlay, interfaceEffect: 'interfaceEffect' in changes ? validateInterfaceEffect(changes.interfaceEffect) : current.interfaceEffect };
    await storage.execute('UPDATE users SET appearance_theme = $1, application_background = $2, background_overlay = $3, interface_effect = $4, updated_at = $5 WHERE id = $6', [next.theme, next.applicationBackground, next.backgroundOverlay, next.interfaceEffect, new Date().toISOString(), id]);
    return getAppearancePreferencesAsync(id, storage);
  }

  return { getUserAsync, ensureUserAsync, updateUserAsync, getNotificationPreferencesAsync, updateNotificationPreferencesAsync, getAppearancePreferencesAsync, updateAppearancePreferencesAsync };
}

module.exports = { createUserService };