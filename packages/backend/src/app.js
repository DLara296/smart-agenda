const express = require('express');
const cors = require('cors');
const { createDatabase } = require('./db/database');
const { createAuthMiddleware, requireFamilyScope, parseCookie } = require('./middleware/auth');
const { createAuthService, SESSION_COOKIE } = require('./domain/auth/authService');
const { createSchoolMembershipService } = require('./domain/auth/schoolMembershipService');
const { createSessionService } = require('./domain/session/sessionService');
const { createAssignmentService } = require('./domain/session/assignmentService');
const { createHistoryService } = require('./domain/session/historyService');
const { createAuditRepository } = require('./domain/audit/auditRepository');
const { createFamilyService } = require('./domain/family/familyService');
const { createInvitationService } = require('./domain/family/invitationService');
const { createNotificationService } = require('./domain/notification/notificationService');
const { createGmailProvider } = require('./domain/notification/gmailProvider');
const { createNotificationWorker } = require('./domain/notification/notificationWorker');
const { createNotificationGroupService } = require('./domain/notification/notificationGroupService');
const { createCommunicationConsentService } = require('./domain/notification/communicationConsentService');
const { createEntityManagementService } = require('./domain/entityManagement/entityManagementService');
const { createSchoolService } = require('./domain/school/schoolService');
const { createUserService } = require('./domain/user/userService');
const { loadConfig, validateProductionConfig } = require('./config');

function createApp({ database = ':memory:', clock = () => new Date(), notificationProvider = null } = {}) {
  const app = express();
  const config = loadConfig();
  validateProductionConfig(config);
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
  const communicationConsentService = createCommunicationConsentService(db);
  const familyService = createFamilyService(db, communicationConsentService);
  const invitationService = createInvitationService(db);
  const gmailProvider = notificationProvider || (config.enabledNotificationChannels.includes('email') ? createGmailProvider({ config: config.gmail }) : null);
  const notificationProviders = gmailProvider ? { email: gmailProvider } : {};
  const notificationService = createNotificationService(db, { enabledChannels: Object.keys(notificationProviders), clock });
  const notificationWorker = createNotificationWorker({ database: db, notificationService, providers: notificationProviders, consentService: communicationConsentService, auditRepository, clock, maxAttempts: config.notificationMaxAttempts });
  const notificationGroupService = createNotificationGroupService(db, communicationConsentService);
  const schoolService = createSchoolService(db, communicationConsentService);
  const userService = createUserService(db);
  const authService = createAuthService(db);
  const schoolMembershipService = createSchoolMembershipService(db);
  const entityManagementService = createEntityManagementService(db, auditRepository);
  const { requireRole } = createAuthMiddleware(authService);
  const requireSchoolAccess = (getSchoolId) => (req, res, next) => {
    const schoolId = getSchoolId(req);
    if (req.user.role === 'admin') return next();
    if (req.user.role === 'coordinator' && schoolId && schoolMembershipService.hasAccess(req.user.userId, schoolId)) return next();
    return res.status(403).json({ error: { code: 'SCHOOL_ACCESS_DENIED', message: 'You do not have access to this school.' } });
  };
  if (config.nodeEnv !== 'production') userService.ensureUser();
  const isLocalDevelopment = process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test';
  if (config.nodeEnv !== 'production' && schoolService.listSchools().length === 0) {
    schoolService.createSchool({ name: 'Westfield Elementary' });
    schoolService.createSchool({ name: 'Northview Primary' });
    schoolService.createSchool({ name: 'Lakeside Academy' });
  }
  if (isLocalDevelopment) {
    authService.ensureDevelopmentAdmin({
      email: process.env.SMARTAGENDA_ADMIN_EMAIL || 'admin@smartagenda.local',
      password: process.env.SMARTAGENDA_ADMIN_PASSWORD || 'SmartAgendaAdmin2026!',
    });
    const demoSchool = schoolService.listSchools().find(school => school.name === 'Westfield Elementary') || schoolService.listSchools()[0];
    if (demoSchool) {
      ['Grade 1', 'Grade 2', 'Grade 3'].forEach(name => {
        const grade = schoolService.listGrades(demoSchool.id).find(item => item.name === name)
          || schoolService.addGrade({ schoolId: demoSchool.id, name });
        ['Group A', 'Group B'].forEach(groupName => {
          if (!schoolService.listGroups(grade.id).some(group => group.name === groupName)) {
            schoolService.addGroup({ gradeId: grade.id, name: groupName });
          }
        });
      });
    }
  }
  if (config.nodeEnv === 'production') authService.provisionInitialAdmin({ email: config.initialAdminEmail, password: config.initialAdminPassword });

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
      const family = familyService.update(req.user.familyId, { ...(req.body || {}), consentActorId: req.user.userId });
      auditRepository.record({ entityType: 'family', entityId: family.id, action: 'updated', actorId: req.user.role, metadata: { source: 'api' } });
      return res.json({ data: family });
    } catch (error) {
      if (error.code === 'FAMILY_VALIDATION') return res.status(400).json({ error: { code: error.code, message: error.message } });
      return next(error);
    }
  });
  app.get('/v1/admin/families/:id', requireRole(['admin']), (req, res) => {
    const family = familyService.getDetails(req.params.id);
    return family ? res.json({ data: family }) : res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Family not found.' } });
  });
  app.get('/v1/admin/families/:id/delete-impact', requireRole(['admin']), (req, res) => {
    const impact = entityManagementService.impact('family', req.params.id);
    return impact ? res.json({ data: impact }) : res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Family not found.' } });
  });
  app.patch('/v1/admin/families/:id', requireRole(['admin']), (req, res, next) => {
    if (!familyService.getDetails(req.params.id)) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Family not found.' } });
    try {
      const family = familyService.update(req.params.id, { ...(req.body || {}), consentActorId: req.user.userId });
      auditRepository.record({ entityType: 'family', entityId: family.id, action: 'updated', actorId: req.user.userId, metadata: { source: 'admin_api' } });
      return res.json({ data: family });
    } catch (error) {
      if (error.code === 'FAMILY_VALIDATION') return res.status(400).json({ error: { code: error.code, message: error.message } });
      return next(error);
    }
  });
  app.delete('/v1/admin/families/:id', requireRole(['admin']), (req, res) => {
    try {
      const family = entityManagementService.archiveFamily(req.params.id, req.user.userId);
      return family ? res.json({ data: { archived: true } }) : res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Family not found.' } });
    } catch (error) {
      if (error.status) return res.status(error.status).json({ error: { code: error.code, message: error.message, impact: error.details } });
      return res.status(400).json({ error: { code: error.code || 'FAMILY_DELETE_FAILED', message: 'We could not delete this family.' } });
    }
  });
  app.get('/v1/families/:id', requireRole(['guest']), requireFamilyScope, (req, res) => {
    res.json({ data: { id: req.params.id, scope: 'family' } });
  });
  app.post('/v1/families', requireRole(['admin', 'coordinator', 'guest']), (req, res, next) => {
    try {
      if (req.user.role === 'guest' && req.user.familyId) return res.status(409).json({ error: { code: 'FAMILY_ALREADY_EXISTS', message: 'This account already has a family profile.' } });
      const family = familyService.create({ ...(req.body || {}), consentActorId: req.user.userId });
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
  app.get('/v1/admin/schools', requireRole(['admin']), (req, res) => res.json({ data: schoolService.listSchools() }));
  app.get('/v1/admin/schools/:schoolId', requireRole(['admin']), (req, res) => {
    const school = schoolService.getSchool(req.params.schoolId);
    return school ? res.json({ data: school }) : res.status(404).json({ error: { code: 'NOT_FOUND', message: 'School not found.' } });
  });
  app.get('/v1/admin/school-memberships', requireRole(['admin']), (req, res) => res.json({ data: schoolMembershipService.list({ userId: req.query.userId, schoolId: req.query.schoolId }) }));
  app.post('/v1/admin/school-memberships', requireRole(['admin']), (req, res, next) => {
    try {
      const membership = schoolMembershipService.grant({ userId: req.body?.userId, schoolId: req.body?.schoolId, grantedBy: req.user.userId });
      auditRepository.record({ entityType: 'user_school_membership', entityId: membership.id, action: 'granted', actorId: req.user.userId, metadata: { userId: membership.userId, schoolId: membership.schoolId } });
      return res.status(201).json({ data: membership });
    } catch (error) { return res.status(error.status || 400).json({ error: { code: error.code || 'MEMBERSHIP_ERROR', message: error.message } }); }
  });
  app.delete('/v1/admin/school-memberships/:userId/:schoolId', requireRole(['admin']), (req, res) => {
    if (!schoolMembershipService.revoke(req.params.userId, req.params.schoolId)) return res.status(404).json({ error: { code: 'MEMBERSHIP_NOT_FOUND', message: 'Active school membership not found.' } });
    auditRepository.record({ entityType: 'user_school_membership', entityId: `${req.params.userId}:${req.params.schoolId}`, action: 'revoked', actorId: req.user.userId, metadata: { userId: req.params.userId, schoolId: req.params.schoolId } });
    return res.status(204).send();
  });
  app.post('/v1/admin/schools', requireRole(['admin']), (req, res, next) => {
    try {
      return res.status(201).json({ data: schoolService.createSchool(req.body || {}) });
    } catch (error) {
      if (error.code === 'SCHOOL_VALIDATION') return res.status(400).json({ error: { code: error.code, message: error.message } });
      return next(error);
    }
  });
  app.patch('/v1/admin/schools/:schoolId', requireRole(['admin']), (req, res, next) => {
    try {
      const school = schoolService.updateSchool(req.params.schoolId, req.body || {});
      return school ? res.json({ data: school }) : res.status(404).json({ error: { code: 'NOT_FOUND', message: 'School not found.' } });
    } catch (error) {
      if (error.code === 'SCHOOL_VALIDATION') return res.status(400).json({ error: { code: error.code, message: error.message } });
      return next(error);
    }
  });
  app.get('/v1/admin/schools/:schoolId/delete-impact', requireRole(['admin']), (req, res) => {
    const impact = entityManagementService.impact('school', req.params.schoolId);
    return impact ? res.json({ data: impact }) : res.status(404).json({ error: { code: 'NOT_FOUND', message: 'School not found.' } });
  });
  app.delete('/v1/admin/schools/:schoolId', requireRole(['admin']), (req, res) => {
    try {
      const school = entityManagementService.archiveSchool(req.params.schoolId, req.user.userId);
      return school ? res.json({ data: { archived: true } }) : res.status(404).json({ error: { code: 'NOT_FOUND', message: 'School not found.' } });
    } catch (error) {
      if (error.status) return res.status(error.status).json({ error: { code: error.code, message: error.message, impact: error.details } });
      return res.status(400).json({ error: { code: error.code || 'SCHOOL_DELETE_FAILED', message: 'We could not delete this school.' } });
    }
  });
  app.post('/v1/schools', requireRole(['admin']), (req, res, next) => {
    try {
      return res.status(201).json(schoolService.createSchool(req.body || {}));
    } catch (error) {
      if (error.code === 'SCHOOL_VALIDATION') return res.status(400).json({ error: { code: error.code, message: error.message } });
      return next(error);
    }
  });
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
  app.post('/v1/grades', requireRole(['admin']), (req, res, next) => {
    try {
      return res.status(201).json(schoolService.addGrade(req.body));
    } catch (error) {
      if (['SCHOOL_REQUIRED', 'SCHOOL_NOT_FOUND', 'GRADE_NAME_REQUIRED'].includes(error.code)) return res.status(400).json({ error: { code: error.code, message: error.message } });
      return next(error);
    }
  });
  app.get('/v1/grades/:gradeId/groups', requireRole(['admin', 'coordinator', 'guest']), (req, res) => res.json({ data: schoolService.listGroups(req.params.gradeId) }));
  app.post('/v1/groups', requireRole(['admin']), (req, res, next) => {
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
      return res.status(201).json(schoolService.addTeacher({ ...(req.body || {}), consentActorId: req.user.userId }));
    } catch (error) {
      if (error.code === 'SCHOOL_REQUIRED' || error.code === 'SCHOOL_NOT_FOUND') return res.status(400).json({ error: { code: error.code, message: error.message } });
      return next(error);
    }
  });
  app.patch('/v1/teachers/:id', requireRole(['admin']), (req, res, next) => {
    try {
      const teacher = schoolService.updateTeacher(req.params.id, { ...(req.body || {}), consentActorId: req.user.userId });
      if (!teacher) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Teacher not found.' } });
      auditRepository.record({ entityType: 'teacher', entityId: teacher.id, action: 'updated', actorId: req.user.userId, metadata: { source: 'admin_api' } });
      return res.json({ data: teacher });
    } catch (error) {
      if (error.code === 'TEACHER_VALIDATION' || error.code === 'SCHOOL_NOT_FOUND') return res.status(400).json({ error: { code: error.code, message: error.message } });
      return next(error);
    }
  });
  app.delete('/v1/teachers/:id', requireRole(['admin']), (req, res) => {
    const teacher = entityManagementService.archiveTeacher(req.params.id, req.user.userId);
    return teacher ? res.json({ data: { archived: true } }) : res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Teacher not found.' } });
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
  app.patch('/v1/students/:id', requireRole(['admin']), (req, res, next) => {
    try {
      const student = schoolService.updateStudent(req.params.id, req.body || {});
      if (!student) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Student not found.' } });
      auditRepository.record({ entityType: 'student', entityId: student.id, action: 'updated', actorId: req.user.userId, metadata: { source: 'admin_api' } });
      return res.json({ data: student });
    } catch (error) {
      if (['STUDENT_VALIDATION', 'SCHOOL_NOT_FOUND', 'GRADE_SCHOOL_MISMATCH', 'GROUP_GRADE_MISMATCH'].includes(error.code)) return res.status(400).json({ error: { code: error.code, message: error.message } });
      return next(error);
    }
  });
  app.delete('/v1/students/:id', requireRole(['admin']), (req, res) => {
    const student = entityManagementService.archiveStudent(req.params.id, req.user.userId);
    return student ? res.json({ data: { archived: true } }) : res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Student not found.' } });
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
      if (['DUPLICATE_SESSION', 'PAST_SESSION_DATE', 'INVALID_SESSION_DATE', 'INVALID_SESSION_TIMEZONE', 'INVALID_SESSION_SCHOOL'].includes(error.code)) return res.status(400).json({ error: { code: error.code, message: error.message } });
      return next(error);
    }
  });
  app.get('/v1/sessions', requireRole(['admin', 'coordinator', 'guest']), (req, res) => {
    if (req.user.role === 'guest') {
      return res.json(historyService.listSessions({ familyId: req.user.familyId || null }).sessions);
    }
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
      if (['DUPLICATE_SESSION', 'PAST_SESSION_DATE', 'INVALID_SESSION_DATE', 'INVALID_SESSION_TIMEZONE', 'INVALID_SESSION_SCHOOL'].includes(error.code)) return res.status(400).json({ error: { code: error.code, message: error.message } });
      return next(error);
    }
  });
  app.delete('/v1/sessions/:id', requireRole(['admin']), (req, res) => {
    const session = entityManagementService.archiveSession(req.params.id, req.user.userId, notificationService);
    return session ? res.json({ data: { cancelled: true } }) : res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Reading session not found or already cancelled.' } });
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

  const notificationGroupError = (error, res) => {
    if (error.status) return res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return res.status(400).json({ error: { code: error.code || 'NOTIFICATION_GROUP_ERROR', message: error.message || 'Unable to save notification group.' } });
  };
  app.get('/v1/notification-capabilities', requireRole(['admin', 'coordinator']), async (req, res) => {
    const channels = await Promise.all(['email', 'sms', 'whatsapp'].map(async channel => {
      const provider = notificationProviders[channel];
      if (!provider) return { channel, enabled: false, provider: null };
      const readiness = await provider.validateConfiguration({ verifyConnection: true });
      return { channel, enabled: Boolean(readiness === true || readiness?.valid), provider: provider.key || null };
    }));
    return res.json({ data: { channels } });
  });
  app.get('/v1/notification-recipients', requireRole(['admin', 'coordinator']), requireSchoolAccess(req => req.query.schoolId), (req, res) => {
    try { return res.json({ data: notificationGroupService.listRecipients(req.query.schoolId) }); } catch (error) { return notificationGroupError(error, res); }
  });
  app.get('/v1/notification-groups', requireRole(['admin', 'coordinator']), requireSchoolAccess(req => req.query.schoolId), (req, res) => {
    try { return res.json({ data: notificationGroupService.listGroups(req.query.schoolId) }); } catch (error) { return notificationGroupError(error, res); }
  });
  app.post('/v1/notification-groups', requireRole(['admin', 'coordinator']), requireSchoolAccess(req => req.body?.schoolId), (req, res) => {
    try { return res.status(201).json({ data: notificationGroupService.save({ ...req.body, createdByUserId: req.user.userId }) }); } catch (error) { return notificationGroupError(error, res); }
  });
  app.patch('/v1/notification-groups/:id', requireRole(['admin', 'coordinator']), requireSchoolAccess(req => req.body?.schoolId), (req, res) => {
    try { return res.json({ data: notificationGroupService.save({ ...req.body, id: req.params.id }) }); } catch (error) { return notificationGroupError(error, res); }
  });
  app.delete('/v1/notification-groups/:id', requireRole(['admin', 'coordinator']), requireSchoolAccess(req => req.query.schoolId), (req, res) => {
    try {
      const removed = notificationGroupService.remove(req.params.id, req.query.schoolId);
      return removed ? res.status(204).send() : res.status(404).json({ error: { code: 'GROUP_NOT_FOUND', message: 'Notification group not found.' } });
    } catch (error) { return notificationGroupError(error, res); }
  });
  app.get('/v1/notifications', requireRole(['admin', 'coordinator']), requireSchoolAccess(req => req.query.schoolId), (req, res) => {
    if (!req.query.schoolId) return res.status(400).json({ error: { code: 'SCHOOL_REQUIRED', message: 'Choose a school to view notification history.' } });
    if (!schoolService.getSchool(req.query.schoolId)) return res.status(404).json({ error: { code: 'SCHOOL_NOT_FOUND', message: 'School not found.' } });
    return res.json({ data: notificationService.list({ schoolId: req.query.schoolId, limit: req.query.limit, offset: req.query.offset }) });
  });
  app.post('/v1/notifications', requireRole(['admin', 'coordinator']), requireSchoolAccess(req => req.body?.schoolId), async (req, res) => {
    try {
      const { schoolId, recipients, message, idempotencyKey } = req.body || {};
      if (!String(message || '').trim() || String(message).length > 5000) return res.status(400).json({ error: { code: 'INVALID_MESSAGE', message: 'Enter a message of 1 to 5000 characters.' } });
      if (!Array.isArray(recipients) || recipients.length === 0) return res.status(400).json({ error: { code: 'RECIPIENTS_REQUIRED', message: 'Choose at least one recipient or notification group.' } });
      const resolved = notificationGroupService.resolveRecipients({ schoolId, selections: recipients });
      const unavailableChannels = [...new Set(resolved.recipients.map(recipient => recipient.channel).filter(channel => !notificationProviders[channel]))];
      if (unavailableChannels.length > 0) {
        const channels = unavailableChannels.map(channel => ({ email: 'Email', sms: 'SMS', whatsapp: 'WhatsApp' })[channel]).join(', ');
        return res.status(503).json({ error: { code: 'CHANNEL_UNAVAILABLE', message: `Delivery for ${channels} is not implemented yet. No message was sent.` } });
      }
      const readiness = await Promise.all([...new Set(resolved.recipients.map(recipient => recipient.channel))].map(channel => notificationProviders[channel].validateConfiguration({ verifyConnection: true })));
      if (readiness.some(result => !result || result.valid === false)) return res.status(503).json({ error: { code: 'PROVIDER_CONFIGURATION_INVALID', message: 'Email delivery is not configured. No message was sent.' } });
      const requestKey = idempotencyKey || `manual-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const notifications = resolved.recipients.map(recipient => notificationService.create({
        schoolId, type: 'manual', channel: recipient.channel, recipientId: recipient.id, recipientType: recipient.type, message: String(message).trim(), scheduledFor: clock().toISOString(),
        idempotencyKey: `${requestKey}:${recipient.type}:${recipient.id}:${recipient.channel}`,
      }));
      notifications.forEach(notification => auditRepository.record({ entityType: 'notification', entityId: notification.id, action: 'queued', actorId: req.user.userId, metadata: { schoolId, channel: notification.channel, type: 'manual' } }));
      return res.status(201).json({ data: { status: 'queued', notifications, recipientCount: notifications.length, unavailableCount: resolved.unavailable.length } });
    } catch (error) { return notificationGroupError(error, res); }
  });
  app.post('/v1/notifications/:id/resend', requireRole(['admin', 'coordinator']), requireSchoolAccess(req => req.body?.schoolId), (req, res) => {
    const existing = notificationService.get(req.params.id);
    if (!existing || !req.body?.schoolId || existing.schoolId !== req.body.schoolId) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Notification not found.' } });
    try {
      const notification = notificationService.retry(req.params.id);
      auditRepository.record({ entityType: 'notification', entityId: notification.id, action: 'retry_requested', actorId: req.user.userId, metadata: { schoolId: existing.schoolId } });
      return res.json({ data: notification });
    }
    catch (error) { return res.status(error.status || 400).json({ error: { code: error.code || 'NOTIFICATION_RETRY_FAILED', message: error.message } }); }
  });
  app.post('/v1/notifications/:id/cancel', requireRole(['admin', 'coordinator']), requireSchoolAccess(req => req.body?.schoolId), (req, res) => {
    const existing = notificationService.get(req.params.id);
    if (!existing || !req.body?.schoolId || existing.schoolId !== req.body.schoolId) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Notification not found.' } });
    try {
      const notification = notificationService.cancel(req.params.id);
      auditRepository.record({ entityType: 'notification', entityId: notification.id, action: 'cancelled', actorId: req.user.userId, metadata: { schoolId: existing.schoolId } });
      return res.json({ data: notification });
    }
    catch (error) { return res.status(error.status || 400).json({ error: { code: error.code || 'NOTIFICATION_CANCEL_FAILED', message: error.message } }); }
  });

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
    notificationWorker,
    close: () => {
      if (database !== ':memory:') db.close();
    },
  };
}

const { app, db } = createApp();

module.exports = { app, db, createApp };
