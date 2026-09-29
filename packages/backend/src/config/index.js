function loadConfig(environment = process.env) {
  const gmail = {
    senderEmail: environment.GMAIL_SENDER_EMAIL || '',
    oauthClientId: environment.GMAIL_OAUTH_CLIENT_ID || '',
    oauthClientSecret: environment.GMAIL_OAUTH_CLIENT_SECRET || '',
    oauthRefreshToken: environment.GMAIL_OAUTH_REFRESH_TOKEN || '',
  };
  const gmailConfigured = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gmail.senderEmail) && Boolean(gmail.oauthClientId && gmail.oauthClientSecret && gmail.oauthRefreshToken);
  return {
    nodeEnv: environment.NODE_ENV || 'development',
    port: Number(environment.PORT || 3030),
    database: environment.DATABASE_URL || ':memory:',
    notificationProvider: environment.NOTIFICATION_PROVIDER || 'sandbox',
    gmail,
    enabledNotificationChannels: gmailConfigured ? ['email'] : [],
    notificationWorkerIntervalMs: Math.max(1000, Number(environment.NOTIFICATION_WORKER_INTERVAL_MS || 5000)),
    notificationMaxAttempts: Math.max(1, Number(environment.NOTIFICATION_MAX_ATTEMPTS || 5)),
    sessionReminderLeadHours: Number(environment.SESSION_REMINDER_LEAD_HOURS || 24),
  };
}

module.exports = { loadConfig };
