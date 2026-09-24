const { createDatabase } = require('../db/database');
const { createAuditRepository } = require('./audit/auditRepository');

function createDomainServices({ database = ':memory:' } = {}) {
  const db = typeof database === 'string' ? createDatabase(database) : database;
  const services = {
    school: { repository: { database: db } },
    family: { repository: { database: db } },
    session: { repository: { database: db } },
    assignment: { repository: { database: db } },
    notification: { repository: { database: db } },
    audit: createAuditRepository(db),
    close: () => db.close(),
  };
  return services;
}

module.exports = { createDomainServices };
