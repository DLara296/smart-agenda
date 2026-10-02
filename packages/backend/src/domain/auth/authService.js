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

  async function ensureDevelopmentAdminAsync({ email, password }, storage = database) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const name = 'SmartAgenda Admin';
    const avatar = JSON.stringify({ value: 'SA', tone: 'default' });
    const now = new Date().toISOString();
    const existing = await storage.one('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    const id = existing?.id || `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (existing) {
      await storage.execute("UPDATE users SET name = $1, role = 'admin', password_hash = $2, status = 'active', updated_at = $3 WHERE id = $4", [name, hashPassword(password), now, id]);
    } else {
      await storage.execute("INSERT INTO users (id, name, family_name, avatar, role, email, phone, password_hash, status, email_verified, created_at, updated_at) VALUES ($1, $2, NULL, $3, 'admin', $4, NULL, $5, 'active', 1, $6, $7)", [id, name, avatar, normalizedEmail, hashPassword(password), now, now]);
    }
    return profile(await storage.one('SELECT id, name, family_name AS "familyName", avatar, role, email, phone FROM users WHERE id = $1', [id]));
  }

  async function provisionInitialAdminAsync({ email, password }, storage = database) {
    const existingAdmin = await storage.one("SELECT id, name, family_name AS \"familyName\", avatar, role, email, phone FROM users WHERE role = 'admin' AND status = 'active' LIMIT 1");
    if (existingAdmin) return profile(existingAdmin);
    return ensureDevelopmentAdminAsync({ email, password }, storage);
  }

  async function getUserByTokenAsync(rawToken, storage = database) {
    if (!rawToken) return null;
    const row = await storage.one(`SELECT u.id, u.name, u.family_name AS "familyName", u.avatar, u.role, u.email, u.phone,
      u.family_id AS "familyId" FROM auth_sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > $2 AND u.status = 'active'`, [crypto.createHash('sha256').update(rawToken).digest('hex'), new Date().toISOString()]);
    return row ? profile(row) : null;
  }

  async function registerAsync({ name, familyName, email, phone = null, password }, storage = database) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedFamilyName = String(familyName || '').trim();
    if (!name || !normalizedEmail || !password) { const error = new Error('Full name, email, and password are required.'); error.code = 'AUTH_VALIDATION'; throw error; }
    if (normalizedFamilyName && normalizedFamilyName.length > 15) { const error = new Error('Family name must be 15 characters or fewer.'); error.code = 'AUTH_VALIDATION'; throw error; }
    if (password.length < 8) { const error = new Error('Password must be at least 8 characters.'); error.code = 'AUTH_VALIDATION'; throw error; }
    if (await storage.one('SELECT id FROM users WHERE email = $1', [normalizedEmail])) { const error = new Error('Unable to create account with those details.'); error.code = 'EMAIL_UNAVAILABLE'; throw error; }
    const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const avatar = JSON.stringify({ value: name.trim().split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase(), tone: 'default' });
    await storage.execute("INSERT INTO users (id, name, family_name, avatar, role, email, phone, password_hash, status, email_verified, created_at, updated_at) VALUES ($1, $2, $3, $4, 'guest', $5, $6, $7, 'active', 0, $8, $9)", [id, name.trim(), normalizedFamilyName || null, avatar, normalizedEmail, phone, hashPassword(password), now, now]);
    return profile(await storage.one('SELECT id, name, family_name AS "familyName", avatar, role, email, phone FROM users WHERE id = $1', [id]));
  }

  async function signInAsync({ email, password }, storage = database) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const row = await storage.one("SELECT id, name, family_name AS \"familyName\", avatar, role, email, phone, family_id AS \"familyId\", password_hash AS \"passwordHash\", status FROM users WHERE email = $1 AND status = 'active'", [normalizedEmail]);
    if (!row || !verifyPassword(password || '', row.passwordHash)) { const error = new Error('Invalid email or password.'); error.code = 'INVALID_CREDENTIALS'; throw error; }
    return profile(row);
  }

  async function createSessionAsync(userId, storage = database) {
    const rawToken = crypto.randomBytes(32).toString('base64url');
    const now = new Date();
    const expires = new Date(now.getTime() + SESSION_TTL_MS);
    await storage.execute('INSERT INTO auth_sessions (id, user_id, token_hash, expires_at, created_at, last_used_at) VALUES ($1, $2, $3, $4, $5, $6)', [`session-${crypto.randomUUID()}`, userId, crypto.createHash('sha256').update(rawToken).digest('hex'), expires.toISOString(), now.toISOString(), now.toISOString()]);
    return { rawToken, expiresAt: expires.toISOString() };
  }

  async function revokeAsync(rawToken, storage = database) {
    if (rawToken) await storage.execute('UPDATE auth_sessions SET revoked_at = $1 WHERE token_hash = $2', [new Date().toISOString(), crypto.createHash('sha256').update(rawToken).digest('hex')]);
  }

  return { ensureDevelopmentAdminAsync, provisionInitialAdminAsync, getUserByTokenAsync, registerAsync, signInAsync, createSessionAsync, revokeAsync, sessionCookie: SESSION_COOKIE };
}

module.exports = { createAuthService, SESSION_COOKIE };