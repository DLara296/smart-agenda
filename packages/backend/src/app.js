const express = require('express');
const cors = require('cors');
const { createDatabase } = require('./db/database');
const { createAuthMiddleware, requireFamilyScope, parseCookie } = require('./middleware/auth');
const { createAuthService, SESSION_COOKIE } = require('./domain/auth/authService');
const { createSessionService } = require('./domain/session/sessionService');
const { createAssignmentService } = require('./domain/session/assignmentService');
const { createHistoryService } = require('./domain/session/historyService');
const { createAuditRepository } = require('./domain/audit/auditRepository');
const { createFamilyService } = require('./domain/family/familyService');
const { createInvitationService } = require('./domain/family/invitationService');
const { createNotificationService } = require('./domain/notification/notificationService');
const { createSchoolService } = require('./domain/school/schoolService');
const { createUserService } = require('./domain/user/userService');
const { loadConfig } = require('./config');

function createApp({ database = ':memory:', clock = () => new Date() } = {}) {
  const app = express();
  const config = loadConfig();
  const reminderTime = session => {
    const start = Date.parse(`${session.sessionDate}T${session.startTime}:00Z`);
    const at = Number.isNaN(start) ? Date.now() : Math.max(Date.now(), start - config.sessionReminderLeadHours * 60 * 60 * 1000);
    return new Date(at).toISOString();
  };
  const db = typeof database === 'string' ? createDatabase(database) : database;
  const sessionService = createSessionService(db, { clock });
  const assignmentService = createAssignmentService(db);
  const historyService = createHistoryService(db);
  const auditRepository = createAuditRepository(db);
  const familyService = createFamilyService(db);
  const invitationService = createInvitationService(db);
  const notificationService = createNotificationService(db);
  const schoolService = createSchoolService(db);
  const userService = createUserService(db);
  const authService = createAuthService(db);
  const { requireRole } = createAuthMiddleware(authService);
  userService.ensureUser();
  if (schoolService.listSchools().length === 0) {
    schoolService.createSchool({ name: 'Westfield Elementary' });
    schoolService.createSchool({ name: 'Northview Primary' });
    schoolService.createSchool({ name: 'Lakeside Academy' });
  }

  app.use(cors());
  app.use(express.json({ limit: '3mb' }));
  app.use((req, res, next) => {
    const startedAt = Date.now();
    res.on('finish', () => console.log(JSON.stringify({ event: 'http_request', method: req.method, path: req.path, status: res.statusCode, durationMs: Date.now() - startedAt })));
    next();
  });
  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  const setSessionCookie = (res, session) => res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(session.rawToken)}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  app.post('/v1/auth/register', (req, res) => {
    try { const user = authService.register(req.body); const session = authService.createSession(user.id); setSessionCookie(res, session); return res.status(201).json({ data: user }); } catch (error) { return res.status(error.code === 'EMAIL_UNAVAILABLE' ? 409 : 400).json({ error: { code: error.code || 'AUTH_ERROR', message: error.message } }); }
  });
  app.post('/v1/auth/sign-in', (req, res) => {
    try { const user = authService.signIn(req.body); const session = authService.createSession(user.id); setSessionCookie(res, session); return res.json({ data: user }); } catch (error) { return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } }); }
  });
  app.get('/v1/auth/me', (req, res) => {
    const user = authService.getUserByToken(parseCookie(req.headers.cookie, SESSION_COOKIE));
    return user ? res.json({ data: user }) : res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication is required.' } });
  });
  app.post('/v1/auth/logout', (req, res) => { authService.revoke(parseCookie(req.headers.cookie, SESSION_COOKIE)); res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`); return res.status(204).send(); });

  app.get('/v1/protected/school', requireRole(['admin', 'coordinator']), (req, res) => {
    res.json({ data: { scope: 'school', role: req.user.role } });
  });
  app.get('/v1/families/me', requireRole(['admin', 'coordinator', 'guest']), (req, res) => res.json({ data: familyService.getDetails(req.user.familyId) }));
  app.put('/v1/families/me', requireRole(['admin', 'coordinator', 'guest']), (req, res, next) => {
    if (!familyService.getDetails(req.user.familyId)) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'This account has no registered family.' } });
    try {
      const family = familyService.update(req.user.familyId, req.body || {});
      auditRepository.record({ entityType: 'family', entityId: family.id, action: 'updated', actorId: req.user.role, metadata: { source: 'api' } });
      return res.json({ data: family });
    } catch (error) {
      if (error.code === 'FAMILY_VALIDATION') return res.status(400).json({ error: { code: error.code, message: error.message } });
      return next(error);
    }
  });
  app.get('/v1/families/:id', requireRole(['guest']), requireFamilyScope, (req, res) => {
    res.json({ data: { id: req.params.id, scope: 'family' } });
  });
  app.post('/v1/families', requireRole(['admin', 'coordinator', 'guest']), (req, res, next) => {
    try {
      if (req.user.role === 'guest' && req.user.familyId) return res.status(409).json({ error: { code: 'FAMILY_ALREADY_EXISTS', message: 'This account already has a family profile.' } });
      const family = familyService.create(req.body);
      if (req.user.role === 'guest') db.prepare('UPDATE users SET family_id = ?, updated_at = ? WHERE id = ?').run(family.id, new Date().toISOString(), req.user.userId);
      auditRepository.record({ entityType: 'family', entityId: family.id, action: 'created', actorId: req.user.role, metadata: { source: 'api' } });
      return res.status(201).json(family);
    } catch (error) {
      if (error.code === 'FAMILY_VALIDATION') return res.status(400).json({ error: { code: error.code, message: error.message } });
      return next(error);
    }
  });
  app.get('/v1/families/:id/children', requireRole(['admin', 'coordinator', 'guest']), requireFamilyScope, (req, res) => res.json(familyService.listChildren(req.params.id)));
  app.get('/v1/families', requireRole(['admin']), (req, res) => res.json(familyService.list()));
  app.post('/v1/invitations', requireRole(['admin']), (req, res, next) => {
    try {
      return res.status(201).json(invitationService.issue({ ...req.body, issuerId: req.user.userId || 'admin' }));
    } catch (error) {
      return next(error);
    }
  });
  app.get('/v1/schools', requireRole(['admin', 'coordinator', 'guest']), (req, res) => res.json({ data: schoolService.listSchools() }));
  app.post('/v1/schools', requireRole(['admin']), (req, res) => res.status(201).json(schoolService.createSchool(req.body)));
  app.get('/v1/profile', requireRole(['admin', 'coordinator', 'guest']), (req, res) => res.json({ data: userService.ensureUser({ id: req.user.userId, role: req.user.role }) }));
  app.patch('/v1/profile', requireRole(['admin', 'coordinator', 'guest']), (req, res) => res.json({ data: userService.updateUser(req.user.userId, req.body) }));
  app.get('/v1/appearance-preferences', requireRole(['admin', 'coordinator', 'guest']), (req, res) => res.json({ data: userService.getAppearancePreferences(req.user.userId) }));
  app.put('/v1/appearance-preferences', requireRole(['admin', 'coordinator', 'guest']), (req, res, next) => {
    try {
      return res.json({ data: userService.updateAppearancePreferences(req.user.userId, req.body || {}) });
    } catch (error) {
      if (error.code === 'INVALID_APPEARANCE') return res.status(400).json({ error: { code: error.code, message: error.message } });
      return next(error);
    }
  });
  app.get('/v1/notification-preferences', requireRole(['admin', 'coordinator', 'guest']), (req, res) => res.json({ data: userService.getNotificationPreferences(req.user.userId) }));
  app.put('/v1/notification-preferences', requireRole(['admin', 'coordinator', 'guest']), (req, res) => {
    try {
      return res.json({ data: userService.updateNotificationPreferences(req.user.userId, req.body || {}) });
    } catch (error) {
      if (error.code === 'INVALID_REMINDER_MESSAGE') return res.status(400).json({ error: { code: error.code, message: error.message } });
      throw error;
    }
  });
  app.get('/v1/schools/:schoolId', requireRole(['admin', 'coordinator']), (req, res) => {
    const school = schoolService.getSchool(req.params.schoolId);
    return school ? res.json({ data: school }) : res.status(404).json({ error: { code: 'NOT_FOUND', message: 'School not found.' } });
  });
  app.patch('/v1/schools/:schoolId', requireRole(['admin', 'coordinator']), (req, res) => {
    const school = schoolService.updateSchool(req.params.schoolId, req.body);
    return school ? res.json({ data: school }) : res.status(404).json({ error: { code: 'NOT_FOUND', message: 'School not found.' } });
  });
  app.get('/v1/schools/:schoolId/grades', requireRole(['admin', 'coordinator', 'guest']), (req, res) => res.json({ data: schoolService.listGrades(req.params.schoolId) }));
  app.post('/v1/grades', requireRole(['admin', 'guest']), (req, res, next) => {
    try {
      return res.status(201).json(schoolService.addGrade(req.body));
    } catch (error) {
      if (error.code === 'SCHOOL_REQUIRED' || error.code === 'SCHOOL_NOT_FOUND') return res.status(400).json({ error: { code: error.code, message: error.message } });
      return next(error);
    }
  });
  app.get('/v1/grades/:gradeId/groups', requireRole(['admin', 'coordinator', 'guest']), (req, res) => res.json({ data: schoolService.listGroups(req.params.gradeId) }));
  app.post('/v1/groups', requireRole(['admin', 'guest']), (req, res, next) => {
    try {
      return res.status(201).json(schoolService.addGroup(req.body || {}));
    } catch (error) {
      if (['GROUP_NAME_REQUIRED', 'GRADE_NOT_FOUND'].includes(error.code)) return res.status(400).json({ error: { code: error.code, message: error.message } });
      return next(error);
    }
  });
  app.get('/v1/teachers', requireRole(['admin', 'coordinator']), (req, res) => res.json({ data: schoolService.listTeachers(req.query.schoolId) }));
  app.post('/v1/teachers', requireRole(['admin']), (req, res, next) => {
    try {
      return res.status(201).json(schoolService.addTeacher(req.body));
    } catch (error) {
      if (error.code === 'SCHOOL_REQUIRED' || error.code === 'SCHOOL_NOT_FOUND') return res.status(400).json({ error: { code: error.code, message: error.message } });
      return next(error);
    }
  });
  app.get('/v1/students', requireRole(['admin', 'coordinator']), (req, res) => res.json({ data: schoolService.listStudents() }));
  app.post('/v1/students', requireRole(['admin']), (req, res, next) => {
    try {
      return res.status(201).json(schoolService.addStudent(req.body));
    } catch (error) {
      if (['STUDENT_ASSIGNMENT_REQUIRED', 'SCHOOL_NOT_FOUND', 'GRADE_SCHOOL_MISMATCH', 'GROUP_GRADE_MISMATCH'].includes(error.code)) return res.status(400).json({ error: { code: error.code, message: error.message } });
      return next(error);
    }
  });

  // Guests may only schedule sessions for their own children's grades, using real groups from that grade.
  const guestSessionFields = (user, body) => {
    const reject = message => { const error = new Error(message); error.status = 403; error.code = 'SESSION_SCOPE'; throw error; };
    const grades = new Set((familyService.getDetails(user.familyId)?.children || []).map(child => child.gradeId));
    if (!body.gradeId || !grades.has(body.gradeId)) reject("Choose one of your children's grades for this session.");
    const assignments = Array.isArray(body.assignments) ? body.assignments : [];
    if (assignments.length === 0) reject('Choose a group for this session.');
    const groupsInGrade = new Set(schoolService.listGroups(body.gradeId).map(group => group.id));
    if (assignments.some(assignment => !groupsInGrade.has(assignment.groupId) || !['en', 'es'].includes(assignment.language))) reject('Choose a group and language from the selected grade.');
    const grade = db.prepare('SELECT school_id AS schoolId FROM grades WHERE id = ?').get(body.gradeId);
    return { schoolId: grade.schoolId, gradeId: body.gradeId, assignments: assignments.map(({ groupId, language }) => ({ groupId, language })) };
  };

  app.post('/v1/sessions', requireRole(['admin', 'coordinator', 'guest']), (req, res, next) => {
    try {
      const scoped = req.user.role === 'guest' ? guestSessionFields(req.user, req.body || {}) : {};
      const session = sessionService.create({ ...req.body, ...scoped, createdBy: req.user.userId });
      auditRepository.record({ entityType: 'reading_session', entityId: session.id, action: 'created', actorId: req.user.role, metadata: { source: 'api' } });
      notificationService.queueSessionReminders({ sessionId: session.id, recipientId: req.user.userId, preferences: userService.getNotificationPreferences(req.user.userId), scheduledFor: reminderTime(session) });
      return res.status(201).json(session);
    } catch (error) {
      if (error.code === 'SESSION_SCOPE') return res.status(error.status).json({ error: { code: error.code, message: error.message } });
      if (error.code === 'INVALID_SESSION_IMAGE') return res.status(400).json({ error: { code: error.code, message: error.message } });
      if (error.code === 'INVALID_SESSION_TEACHER') return res.status(400).json({ error: { code: error.code, message: error.message } });
      if (['DUPLICATE_SESSION', 'PAST_SESSION_DATE', 'INVALID_SESSION_DATE', 'INVALID_SESSION_TIMEZONE'].includes(error.code)) return res.status(400).json({ error: { code: error.code, message: error.message } });
      return next(error);
    }
  });
  app.get('/v1/sessions', requireRole(['admin', 'coordinator', 'guest']), (req, res) => {
    const sessions = db.prepare('SELECT id FROM reading_sessions ORDER BY session_date').all().map(row => sessionService.get(row.id));
    return res.json(sessions);
  });
  app.get('/v1/dashboard', requireRole(['admin', 'coordinator']), (req, res) => {
    const sessions = db.prepare('SELECT id FROM reading_sessions ORDER BY session_date LIMIT 10').all().map(row => sessionService.get(row.id));
    const familyCount = db.prepare("SELECT COUNT(*) AS count FROM family_records WHERE status = 'active'").get().count;
    const notificationCount = db.prepare("SELECT COUNT(*) AS count FROM notifications WHERE status IN ('queued', 'failed')").get().count;
    return res.json({ sessions, familyCount, notificationsPending: notificationCount });
  });
  app.get('/v1/sessions/:id', requireRole(['admin', 'coordinator']), (req, res) => {
    const session = sessionService.get(req.params.id);
    if (!session) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found.' } });
    return res.json(session);
  });
  app.patch('/v1/sessions/:id', requireRole(['admin', 'coordinator', 'guest']), (req, res, next) => {
    const existing = sessionService.get(req.params.id);
    if (!existing) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found.' } });
    if (req.user.role === 'guest' && existing.createdBy !== req.user.userId) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You can only edit sessions you created.' } });
    try {
      const { status, schoolId, ...details } = req.body || {};
      const changes = req.user.role === 'guest'
        ? { ...details, ...('gradeId' in details || 'assignments' in details ? guestSessionFields(req.user, details) : {}) }
        : { ...details, ...(schoolId ? { schoolId } : {}), status };
      const session = sessionService.update(req.params.id, changes);
      notificationService.rescheduleSessionReminders(session.id, reminderTime(session));
      auditRepository.record({ entityType: 'reading_session', entityId: session.id, action: 'updated', actorId: req.user.role, metadata: { source: 'api' } });
      return res.json(session);
    } catch (error) {
      if (error.code === 'SESSION_SCOPE') return res.status(error.status).json({ error: { code: error.code, message: error.message } });
      if (error.code === 'INVALID_SESSION_IMAGE') return res.status(400).json({ error: { code: error.code, message: error.message } });
      if (error.code === 'INVALID_SESSION_TEACHER') return res.status(400).json({ error: { code: error.code, message: error.message } });
      if (['DUPLICATE_SESSION', 'PAST_SESSION_DATE', 'INVALID_SESSION_DATE', 'INVALID_SESSION_TIMEZONE'].includes(error.code)) return res.status(400).json({ error: { code: error.code, message: error.message } });
      return next(error);
    }
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
  app.get('/v1/history/sessions', requireRole(['admin', 'coordinator', 'guest']), (req, res, next) => {
    const param = name => (typeof req.query[name] === 'string' && req.query[name] ? req.query[name] : undefined);
    try {
      // Scope always comes from the authenticated account's family, never from the request.
      return res.json({ data: historyService.listSessions({ familyId: req.user.familyId || null, view: param('view'), childId: param('childId'), gradeId: param('gradeId'), groupId: param('groupId'), status: param('status') }) });
    } catch (error) {
      if (error.status) return res.status(error.status).json({ error: { code: error.code, message: error.message } });
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
  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    if (error.type === 'entity.too.large') return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'The uploaded content is too large.' } });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'The request body is not valid JSON.' } });
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } });
  });

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
