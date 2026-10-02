function integerSetting(environment, name, fallback, minimum, maximum) {
  const rawValue = environment[name];
  const value = rawValue === undefined || rawValue === '' ? fallback : Number(rawValue);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
  return value;
}

function numberSetting(environment, name, fallback, minimum, maximum) {
  const rawValue = environment[name];
  const value = rawValue === undefined || rawValue === '' ? fallback : Number(rawValue);
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be a number between ${minimum} and ${maximum}.`);
  }
  return value;
}

function isHttpsOrigin(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && value === url.origin;
  } catch {
    return false;
  }
}

function loadConfig(environment = process.env) {
  const nodeEnv = environment.NODE_ENV || 'development';
  if (!['development', 'test', 'production'].includes(nodeEnv)) throw new Error('NODE_ENV must be one of development, test, or production.');
  const sslMode = environment.PGSSLMODE || (nodeEnv === 'production' ? 'require' : 'disable');
  if (!['require', 'disable'].includes(sslMode)) throw new Error('PGSSLMODE must be require or disable.');
  const database = environment.DATABASE_URL || ':memory:';
  const gmail = {
    senderEmail: environment.GMAIL_SENDER_EMAIL || '',
    oauthClientId: environment.GMAIL_OAUTH_CLIENT_ID || '',
    oauthClientSecret: environment.GMAIL_OAUTH_CLIENT_SECRET || '',
    oauthRefreshToken: environment.GMAIL_OAUTH_REFRESH_TOKEN || '',
  };
  const gmailConfigured = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gmail.senderEmail) && Boolean(gmail.oauthClientId && gmail.oauthClientSecret && gmail.oauthRefreshToken);
  return {
    nodeEnv,
    port: integerSetting(environment, 'PORT', 3030, 1, 65535),
    database,
    databaseDriver: /^postgres(?:ql)?:\/\//i.test(database) ? 'postgres' : 'sqlite',
    frontendOrigin: String(environment.FRONTEND_ORIGIN || '').replace(/\/$/, ''),
    postgres: {
      sslMode,
      poolMax: integerSetting(environment, 'PG_POOL_MAX', 10, 1, 100),
      connectionTimeoutMs: integerSetting(environment, 'PG_CONNECTION_TIMEOUT_MS', 5000, 100, 120000),
      idleTimeoutMs: integerSetting(environment, 'PG_IDLE_TIMEOUT_MS', 10000, 1000, 600000),
    },
    sessionSecret: environment.SESSION_SECRET || '',
    initialAdminEmail: environment.INITIAL_ADMIN_EMAIL || '',
    initialAdminPassword: environment.INITIAL_ADMIN_PASSWORD || '',
    notificationProvider: environment.NOTIFICATION_PROVIDER || 'sandbox',
    gmail,
    enabledNotificationChannels: gmailConfigured ? ['email'] : [],
    authRateLimitWindowMs: integerSetting(environment, 'AUTH_RATE_LIMIT_WINDOW_MS', 900000, 1000, 86400000),
    authRateLimitMax: integerSetting(environment, 'AUTH_RATE_LIMIT_MAX', 20, 1, 1000),
    invitationRateLimitWindowMs: integerSetting(environment, 'INVITATION_RATE_LIMIT_WINDOW_MS', 3600000, 1000, 86400000),
    invitationRateLimitMax: integerSetting(environment, 'INVITATION_RATE_LIMIT_MAX', 30, 1, 1000),
    notificationWorkerIntervalMs: integerSetting(environment, 'NOTIFICATION_WORKER_INTERVAL_MS', 5000, 1000, 3600000),
    notificationMaxAttempts: integerSetting(environment, 'NOTIFICATION_MAX_ATTEMPTS', 5, 1, 20),
    sessionReminderLeadHours: numberSetting(environment, 'SESSION_REMINDER_LEAD_HOURS', 24, 0, 720),
  };
}

function validateProductionConfig(config) {
  if (config.nodeEnv !== 'production') return config;
  if (!config.database || config.database === ':memory:') throw new Error('Production requires an explicit durable DATABASE_URL.');
  if (config.databaseDriver === 'postgres' && config.postgres.sslMode === 'disable') throw new Error('Production PostgreSQL requires SSL.');
  if (config.databaseDriver === 'postgres') throw new Error('PostgreSQL DATABASE_URL requires the PostgreSQL adapter before production use.');
  if (!config.sessionSecret || config.sessionSecret.length < 32) throw new Error('Production requires SESSION_SECRET.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.initialAdminEmail)) throw new Error('Production requires INITIAL_ADMIN_EMAIL.');
  if (config.initialAdminPassword.length < 12) throw new Error('Production requires INITIAL_ADMIN_PASSWORD of at least 12 characters.');
  if (!config.frontendOrigin) throw new Error('Production requires FRONTEND_ORIGIN.');
  if (!isHttpsOrigin(config.frontendOrigin)) throw new Error('Production FRONTEND_ORIGIN must be an HTTPS origin without a path.');
  return config;
}

module.exports = { loadConfig, validateProductionConfig };
