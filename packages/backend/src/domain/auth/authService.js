const crypto = require('crypto');

const SESSION_COOKIE = 'smartagenda_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, expected] = stored.split(':');
  const actual = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}

function createAuthService(database) {
  function profile(row) {
    return { id: row.id, name: row.name, email: row.email, phone: row.phone, role: row.role, familyId: row.familyId || null, familyName: row.familyName || null, avatar: row.avatar ? JSON.parse(row.avatar) : { value: 'SA', tone: 'default' } };
  }

  function register({ name, familyName, email, phone = null, password }) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedFamilyName = String(familyName || '').trim();
    if (!name || !normalizedFamilyName || !normalizedEmail || !password) {
      const error = new Error('Full name, family name, email, and password are required.');
      error.code = 'AUTH_VALIDATION';
      throw error;
    }
    if (normalizedFamilyName.length > 15) {
      const error = new Error('Family name must be 15 characters or fewer.');
      error.code = 'AUTH_VALIDATION';
      throw error;
    }
    if (password.length < 8) {
      const error = new Error('Password must be at least 8 characters.');
      error.code = 'AUTH_VALIDATION';
      throw error;
    }
    if (database.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail)) {
      const error = new Error('Unable to create account with those details.');
      error.code = 'EMAIL_UNAVAILABLE';
      throw error;
    }
    const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    database.prepare('INSERT INTO users (id, name, family_name, avatar, role, email, phone, password_hash, status, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, name.trim(), normalizedFamilyName, JSON.stringify({ value: name.trim().split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase(), tone: 'default' }), 'guest', normalizedEmail, phone, hashPassword(password), 'active', 0, now, now);
    return profile(database.prepare('SELECT id, name, family_name AS familyName, avatar, role, email, phone FROM users WHERE id = ?').get(id));
  }

  function ensureDevelopmentAdmin({ email, password }) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const name = 'SmartAgenda Admin';
    const avatar = JSON.stringify({ value: 'SA', tone: 'default' });
    const now = new Date().toISOString();
    const existing = database.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    const id = existing?.id || `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    if (existing) {
      database.prepare("UPDATE users SET name = ?, role = 'admin', password_hash = ?, status = 'active', updated_at = ? WHERE id = ?")
        .run(name, hashPassword(password), now, id);
    } else {
      database.prepare("INSERT INTO users (id, name, family_name, avatar, role, email, phone, password_hash, status, email_verified, created_at, updated_at) VALUES (?, ?, NULL, ?, 'admin', ?, NULL, ?, 'active', 1, ?, ?)")
        .run(id, name, avatar, normalizedEmail, hashPassword(password), now, now);
    }

    return profile(database.prepare('SELECT id, name, family_name AS familyName, avatar, role, email, phone FROM users WHERE id = ?').get(id));
  }

  function provisionInitialAdmin({ email, password }) {
    const existingAdmin = database.prepare("SELECT id, name, family_name AS familyName, avatar, role, email, phone FROM users WHERE role = 'admin' AND status = 'active' LIMIT 1").get();
    if (existingAdmin) return profile(existingAdmin);
    return ensureDevelopmentAdmin({ email, password });
  }

  function signIn({ email, password }) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const row = database.prepare("SELECT id, name, family_name AS familyName, avatar, role, email, phone, family_id AS familyId, password_hash, status FROM users WHERE email = ? AND status = 'active'").get(normalizedEmail);
    if (!row || !verifyPassword(password || '', row.password_hash)) {
      const error = new Error('Invalid email or password.');
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }
    return profile(row);
  }

  function createSession(userId) {
    const rawToken = crypto.randomBytes(32).toString('base64url');
    const now = new Date();
    const expires = new Date(now.getTime() + SESSION_TTL_MS);
    database.prepare('INSERT INTO auth_sessions (id, user_id, token_hash, expires_at, created_at, last_used_at) VALUES (?, ?, ?, ?, ?, ?)').run(`session-${crypto.randomUUID()}`, userId, crypto.createHash('sha256').update(rawToken).digest('hex'), expires.toISOString(), now.toISOString(), now.toISOString());
    return { rawToken, expiresAt: expires.toISOString() };
  }

  function getUserByToken(rawToken) {
    if (!rawToken) return null;
    const row = database.prepare("SELECT u.id, u.name, u.family_name AS familyName, u.avatar, u.role, u.email, u.phone, u.family_id AS familyId FROM auth_sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ? AND u.status = 'active'").get(crypto.createHash('sha256').update(rawToken).digest('hex'), new Date().toISOString());
    return row ? profile(row) : null;
  }

  function revoke(rawToken) {
    if (rawToken) database.prepare('UPDATE auth_sessions SET revoked_at = ? WHERE token_hash = ?').run(new Date().toISOString(), crypto.createHash('sha256').update(rawToken).digest('hex'));
  }

  return { register, ensureDevelopmentAdmin, provisionInitialAdmin, signIn, createSession, getUserByToken, revoke, sessionCookie: SESSION_COOKIE };
}

module.exports = { createAuthService, SESSION_COOKIE };