function createSchoolService(database, consentService = null) {
  function validateSchool({ name, timezone, locale }) {
    const normalizedName = String(name || '').trim();
    if (!normalizedName) {
      const error = new Error('Enter a school name.');
      error.code = 'SCHOOL_VALIDATION';
      throw error;
    }
    if (normalizedName.length > 120) {
      const error = new Error('School name must be 120 characters or fewer.');
      error.code = 'SCHOOL_VALIDATION';
      throw error;
    }
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    } catch {
      const error = new Error('Enter a valid time zone.');
      error.code = 'SCHOOL_VALIDATION';
      throw error;
    }
    try {
      if (Intl.getCanonicalLocales(locale).length === 0) throw new Error('Invalid locale');
    } catch {
      const error = new Error('Enter a valid locale.');
      error.code = 'SCHOOL_VALIDATION';
      throw error;
    }
    return normalizedName;
  }

  async function createSchoolAsync(input, storage = database) {
    const schoolInput = { timezone: 'UTC', locale: 'en-US', ...input };
    const normalizedName = validateSchool(schoolInput);
    const id = `school-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    await storage.execute("INSERT INTO schools (id, name, timezone, locale, status, created_at, updated_at) VALUES ($1, $2, $3, $4, 'active', $5, $6)", [id, normalizedName, schoolInput.timezone, schoolInput.locale, now, now]);
    return { id, name: normalizedName, timezone: schoolInput.timezone, locale: schoolInput.locale, status: 'active' };
  }

  async function getSchoolAsync(id, storage = database) {
    return storage.one("SELECT id, name, timezone, locale, status FROM schools WHERE id = $1 AND status = 'active'", [id]);
  }

  async function listSchoolsAsync(storage = database) {
    return storage.query("SELECT id, name, timezone, locale, status FROM schools WHERE status = 'active' ORDER BY name");
  }

  async function updateSchoolAsync(id, changes, storage = database) {
    const current = await getSchoolAsync(id, storage);
    if (!current) return null;
    const next = { name: changes.name ?? current.name, timezone: changes.timezone ?? current.timezone, locale: changes.locale ?? current.locale };
    next.name = validateSchool(next);
    await storage.execute('UPDATE schools SET name = $1, timezone = $2, locale = $3, updated_at = $4 WHERE id = $5', [next.name, next.timezone, next.locale, new Date().toISOString(), id]);
    return getSchoolAsync(id, storage);
  }

  async function addGradeAsync({ schoolId, name, academicPeriod = null }, storage = database) {
    if (!schoolId) { const error = new Error('A school is required for every grade.'); error.code = 'SCHOOL_REQUIRED'; throw error; }
    if (!await getSchoolAsync(schoolId, storage)) { const error = new Error('The selected school does not exist.'); error.code = 'SCHOOL_NOT_FOUND'; throw error; }
    const trimmedName = String(name || '').trim();
    if (!trimmedName) { const error = new Error('A grade name is required.'); error.code = 'GRADE_NAME_REQUIRED'; throw error; }
    const id = `grade-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    await storage.execute("INSERT INTO grades (id, school_id, name, academic_period, status, created_at, updated_at) VALUES ($1, $2, $3, $4, 'active', $5, $6)", [id, schoolId, trimmedName, academicPeriod, now, now]);
    return { id, schoolId, name: trimmedName, academicPeriod, status: 'active' };
  }

  async function listGradesAsync(schoolId, storage = database) {
    return storage.query('SELECT id, name, academic_period AS "academicPeriod", status FROM grades WHERE school_id = $1 AND status = \'active\' ORDER BY name', [schoolId]);
  }

  async function addGroupAsync({ gradeId, name, code }, storage = database) {
    const trimmed = String(name || '').trim();
    if (!trimmed) { const error = new Error('A group name is required.'); error.code = 'GROUP_NAME_REQUIRED'; throw error; }
    if (!await storage.one("SELECT id FROM grades WHERE id = $1 AND status = 'active'", [gradeId])) { const error = new Error('The selected grade does not exist.'); error.code = 'GRADE_NOT_FOUND'; throw error; }
    const groupCode = code || trimmed.toUpperCase().replace(/\s+/g, '-');
    const id = `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    await storage.execute("INSERT INTO groups (id, grade_id, name, code, status, created_at, updated_at) VALUES ($1, $2, $3, $4, 'active', $5, $6)", [id, gradeId, trimmed, groupCode, now, now]);
    return { id, gradeId, name: trimmed, code: groupCode, status: 'active' };
  }

  async function listGroupsAsync(gradeId, storage = database) {
    return storage.query("SELECT id, name, code, status FROM groups WHERE grade_id = $1 AND status = 'active' ORDER BY name", [gradeId]);
  }

  async function addTeacherAsync({ name, email, phone = null, schoolId, emailConsent = false, emailConsentSource = 'teacher_form', consentActorId = null }, storage = database, asyncConsentService = consentService) {
    if (!schoolId) { const error = new Error('A valid school is required for every teacher.'); error.code = 'SCHOOL_REQUIRED'; throw error; }
    if (!await getSchoolAsync(schoolId, storage)) { const error = new Error('The selected school does not exist.'); error.code = 'SCHOOL_NOT_FOUND'; throw error; }
    const id = `teacher-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    await storage.execute("INSERT INTO teachers (id, name, email, phone, school_id, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, 'active', $6, $7)", [id, name, email, phone, schoolId, now, now]);
    if (emailConsent && asyncConsentService) await asyncConsentService.recordAsync({ type: 'teacher', id, channel: 'email', status: 'granted', source: emailConsentSource, capturedBy: consentActorId }, storage);
    return { id, name, email, phone, schoolId, status: 'active' };
  }

  async function updateTeacherAsync(id, { name, email, phone = null, schoolId, emailConsent, emailConsentSource = 'teacher_form', consentActorId = null }, storage = database, asyncConsentService = consentService) {
    if (!await storage.one("SELECT id FROM teachers WHERE id = $1 AND status = 'active'", [id])) return null;
    const normalizedName = String(name || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedName || !normalizedEmail || !schoolId || !await getSchoolAsync(schoolId, storage)) { const error = new Error('Enter a teacher name, valid email, and active school.'); error.code = 'TEACHER_VALIDATION'; throw error; }
    if (await storage.one('SELECT id FROM teachers WHERE email = $1 AND id <> $2', [normalizedEmail, id])) { const error = new Error('A teacher with this email already exists.'); error.code = 'TEACHER_VALIDATION'; throw error; }
    await storage.execute('UPDATE teachers SET name = $1, email = $2, phone = $3, school_id = $4, updated_at = $5 WHERE id = $6', [normalizedName, normalizedEmail, phone || null, schoolId, new Date().toISOString(), id]);
    if (emailConsent !== undefined && asyncConsentService) await asyncConsentService.recordAsync({ type: 'teacher', id, channel: 'email', status: emailConsent ? 'granted' : 'revoked', source: emailConsentSource, capturedBy: consentActorId }, storage);
    return storage.one('SELECT id, name, email, phone, school_id AS "schoolId", status FROM teachers WHERE id = $1', [id]);
  }

  async function listTeachersAsync(schoolId, storage = database, asyncConsentService = consentService) {
    const sql = `SELECT t.id, t.name, t.email, t.phone, t.school_id AS "schoolId", s.name AS "schoolName", t.status FROM teachers t LEFT JOIN schools s ON s.id = t.school_id WHERE t.status = 'active'${schoolId ? ' AND t.school_id = $1' : ''} ORDER BY t.name`;
    const teachers = await storage.query(sql, schoolId ? [schoolId] : []);
    return Promise.all(teachers.map(async teacher => ({ ...teacher, emailConsent: asyncConsentService?.hasConsentAsync ? await asyncConsentService.hasConsentAsync({ type: 'teacher', id: teacher.id, channel: 'email' }, storage) : false })));
  }

  async function addStudentAsync({ familyId, schoolId, gradeId, groupId, name }, storage = database) {
    if (!schoolId || !gradeId || !groupId) { const error = new Error('School, grade, and group are required for every student.'); error.code = 'STUDENT_ASSIGNMENT_REQUIRED'; throw error; }
    if (!await getSchoolAsync(schoolId, storage)) { const error = new Error('The selected school does not exist.'); error.code = 'SCHOOL_NOT_FOUND'; throw error; }
    const grade = await storage.one('SELECT id, school_id AS "schoolId" FROM grades WHERE id = $1 AND status = \'active\'', [gradeId]);
    if (!grade || grade.schoolId !== schoolId) { const error = new Error('The selected grade does not belong to the selected school.'); error.code = 'GRADE_SCHOOL_MISMATCH'; throw error; }
    const group = await storage.one('SELECT id, grade_id AS "gradeId" FROM groups WHERE id = $1 AND status = \'active\'', [groupId]);
    if (!group || group.gradeId !== gradeId) { const error = new Error('The selected group does not belong to the selected grade.'); error.code = 'GROUP_GRADE_MISMATCH'; throw error; }
    const id = `student-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    await storage.execute("INSERT INTO students (id, family_id, school_id, grade_id, group_id, name, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8)", [id, familyId, schoolId, gradeId, groupId, name, now, now]);
    return { id, familyId, schoolId, gradeId, groupId, name, status: 'active' };
  }

  async function updateStudentAsync(id, changes, storage = database) {
    const current = await storage.one('SELECT id, family_id AS "familyId", school_id AS "schoolId", grade_id AS "gradeId", group_id AS "groupId" FROM students WHERE id = $1 AND status = \'active\'', [id]);
    if (!current) return null;
    const familyId = changes.familyId ?? current.familyId;
    const schoolId = changes.schoolId ?? current.schoolId;
    const gradeId = changes.gradeId ?? current.gradeId;
    const groupId = changes.groupId ?? current.groupId;
    const name = String(changes.name ?? '').trim();
    if (!name || !await storage.one("SELECT id FROM family_records WHERE id = $1 AND status = 'active'", [familyId])) { const error = new Error('Choose a name and active family for the student.'); error.code = 'STUDENT_VALIDATION'; throw error; }
    if (!await getSchoolAsync(schoolId, storage)) { const error = new Error('The selected school does not exist.'); error.code = 'SCHOOL_NOT_FOUND'; throw error; }
    const grade = await storage.one('SELECT id, school_id AS "schoolId" FROM grades WHERE id = $1 AND status = \'active\'', [gradeId]);
    const group = await storage.one('SELECT id, grade_id AS "gradeId" FROM groups WHERE id = $1 AND status = \'active\'', [groupId]);
    if (!grade || grade.schoolId !== schoolId) { const error = new Error('The selected grade does not belong to the selected school.'); error.code = 'GRADE_SCHOOL_MISMATCH'; throw error; }
    if (!group || group.gradeId !== gradeId) { const error = new Error('The selected group does not belong to the selected grade.'); error.code = 'GROUP_GRADE_MISMATCH'; throw error; }
    await storage.execute('UPDATE students SET family_id = $1, school_id = $2, grade_id = $3, group_id = $4, name = $5, updated_at = $6 WHERE id = $7', [familyId, schoolId, gradeId, groupId, name, new Date().toISOString(), id]);
    return storage.one('SELECT id, name, family_id AS "familyId", school_id AS "schoolId", grade_id AS "gradeId", group_id AS "groupId", status FROM students WHERE id = $1', [id]);
  }

  async function listStudentsAsync(storage = database) {
    return storage.query("SELECT s.id, s.name, s.family_id AS \"familyId\", f.display_name AS \"familyName\", s.school_id AS \"schoolId\", sc.name AS \"schoolName\", s.grade_id AS \"gradeId\", g.name AS \"gradeName\", s.group_id AS \"groupId\", gr.name AS \"groupName\", s.status FROM students s LEFT JOIN family_records f ON f.id = s.family_id LEFT JOIN schools sc ON sc.id = s.school_id LEFT JOIN grades g ON g.id = s.grade_id LEFT JOIN groups gr ON gr.id = s.group_id WHERE s.status = 'active' ORDER BY s.name");
  }

  return { createSchoolAsync, getSchoolAsync, listSchoolsAsync, updateSchoolAsync, addGradeAsync, listGradesAsync, addGroupAsync, listGroupsAsync, addTeacherAsync, updateTeacherAsync, listTeachersAsync, addStudentAsync, updateStudentAsync, listStudentsAsync };
}
module.exports = { createSchoolService };
