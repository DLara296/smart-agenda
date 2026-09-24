const express = require('express');
const cors = require('cors');
const { createDatabase } = require('./db/database');
const { requireRole, requireFamilyScope } = require('./middleware/auth');
const { createSessionService } = require('./domain/session/sessionService');
const { createAssignmentService } = require('./domain/session/assignmentService');
const { createAuditRepository } = require('./domain/audit/auditRepository');
const { createFamilyService } = require('./domain/family/familyService');
const { createInvitationService } = require('./domain/family/invitationService');
const { createNotificationService } = require('./domain/notification/notificationService');
const { createSchoolService } = require('./domain/school/schoolService');

function createApp({ database = ':memory:' } = {}) {
  const app = express();
  const db = typeof database === 'string' ? createDatabase(database) : database;
  const sessionService = createSessionService(db);
  const assignmentService = createAssignmentService(db);
  const auditRepository = createAuditRepository(db);
  const familyService = createFamilyService(db);
  const invitationService = createInvitationService(db);
  const notificationService = createNotificationService(db);
  const schoolService = createSchoolService(db);

  app.use(cors());
  app.use(express.json());
  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  app.get('/v1/protected/school', requireRole(['admin', 'coordinator']), (req, res) => {
    res.json({ data: { scope: 'school', role: req.user.role } });
  });
  app.get('/v1/families/:id', requireRole(['guest']), requireFamilyScope, (req, res) => {
    res.json({ data: { id: req.params.id, scope: 'family' } });
  });
  app.post('/v1/families', requireRole(['admin', 'coordinator']), (req, res, next) => {
    try {
      const family = familyService.create(req.body);
      auditRepository.record({ entityType: 'family', entityId: family.id, action: 'created', actorId: req.user.role, metadata: { source: 'api' } });
      return res.status(201).json(family);
    } catch (error) {
      return next(error);
    }
  });
  app.get('/v1/families/:id/children', requireRole(['admin', 'coordinator']), (req, res) => res.json(familyService.listChildren(req.params.id)));
  app.get('/v1/families', requireRole(['admin', 'coordinator']), (req, res) => res.json(familyService.list()));
  app.post('/v1/invitations', requireRole(['admin']), (req, res, next) => {
    try {
      return res.status(201).json(invitationService.issue({ ...req.body, issuerId: req.user.userId || 'admin' }));
    } catch (error) {
      return next(error);
    }
  });
  app.get('/v1/schools', requireRole(['admin', 'coordinator']), (req, res) => res.json({ data: schoolService.listSchools() }));

  app.post('/v1/sessions', requireRole(['admin', 'coordinator']), (req, res, next) => {
    try {
      const session = sessionService.create(req.body);
      auditRepository.record({ entityType: 'reading_session', entityId: session.id, action: 'created', actorId: req.user.role, metadata: { source: 'api' } });
      return res.status(201).json(session);
    } catch (error) {
      return next(error);
    }
  });
  app.get('/v1/sessions', requireRole(['admin', 'coordinator']), (req, res) => {
    const sessions = db.prepare('SELECT id FROM reading_sessions ORDER BY session_date').all().map(row => sessionService.get(row.id));
    return res.json(sessions);
  });
  app.get('/v1/sessions/:id', requireRole(['admin', 'coordinator']), (req, res) => {
    const session = sessionService.get(req.params.id);
    if (!session) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found.' } });
    return res.json(session);
  });
  app.patch('/v1/sessions/:id', requireRole(['admin', 'coordinator']), (req, res) => {
    const existing = sessionService.get(req.params.id);
    if (!existing) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found.' } });
    if (req.body.status) db.prepare('UPDATE reading_sessions SET status = ?, updated_at = ? WHERE id = ?').run(req.body.status, new Date().toISOString(), req.params.id);
    return res.json(sessionService.get(req.params.id));
  });
  app.post('/v1/sessions/:id/volunteers', requireRole(['admin', 'coordinator']), (req, res, next) => {
    try {
      const assignment = assignmentService.create({ ...req.body, sessionId: req.params.id });
      auditRepository.record({ entityType: 'volunteer_assignment', entityId: assignment.id, action: 'created', actorId: req.user.role, metadata: { source: 'api', sessionId: req.params.id } });
      return res.status(201).json(assignment);
    } catch (error) {
      return next(error);
    }
  });
  app.patch('/v1/sessions/:sessionId/volunteers/:id', requireRole(['admin', 'coordinator']), (req, res, next) => {
    try {
      const assignment = assignmentService.cancel(req.params.id, req.body.cancellationReason);
      if (!assignment) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Assignment not found.' } });
      auditRepository.record({ entityType: 'volunteer_assignment', entityId: assignment.id, action: 'cancelled', actorId: req.user.role, metadata: { reason: req.body.cancellationReason || null, sessionId: req.params.sessionId } });
      return res.json(assignment);
    } catch (error) {
      return next(error);
    }
  });
  app.get('/v1/sessions/:id/history', requireRole(['admin', 'coordinator']), (req, res) => res.json(auditRepository.list('volunteer_assignment').filter(entry => entry.metadata.sessionId === req.params.id)));

  app.get('/v1/notifications', requireRole(['admin', 'coordinator']), (req, res) => res.json(notificationService.list()));
  app.post('/v1/notifications', requireRole(['admin', 'coordinator']), (req, res, next) => {
    try { return res.status(201).json(notificationService.create(req.body)); } catch (error) { return next(error); }
  });
  app.post('/v1/notifications/:id/resend', requireRole(['admin', 'coordinator']), (req, res) => res.json(notificationService.retry(req.params.id)));
  app.post('/v1/notifications/:id/cancel', requireRole(['admin', 'coordinator']), (req, res) => res.json(notificationService.cancel(req.params.id)));

  app.use((req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found.' } }));

  return {
    app,
    db,
    close: () => {
      if (database !== ':memory:') db.close();
    },
  };
}

const { app, db } = createApp();

module.exports = { app, db, createApp };
