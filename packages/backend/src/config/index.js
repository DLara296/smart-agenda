function loadConfig(environment = process.env) {
  return {
    nodeEnv: environment.NODE_ENV || 'development',
    port: Number(environment.PORT || 3030),
    database: environment.DATABASE_URL || ':memory:',
    notificationProvider: environment.NOTIFICATION_PROVIDER || 'sandbox',
    sessionReminderLeadHours: Number(environment.SESSION_REMINDER_LEAD_HOURS || 24),
  };
}

module.exports = { loadConfig };
