function loadConfig(environment = process.env) {
  return {
    nodeEnv: environment.NODE_ENV || 'development',
    port: Number(environment.PORT || 3030),
    database: environment.DATABASE_URL || ':memory:',
    notificationProvider: environment.NOTIFICATION_PROVIDER || 'sandbox',
  };
}

module.exports = { loadConfig };
