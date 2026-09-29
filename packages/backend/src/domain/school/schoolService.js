function createSchoolService(database) {
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

  function createSchool({ name, timezone = 'UTC', locale = 'en-US' }) {
    const normalizedName = validateSchool({ name, timezone, locale });
    const id = `school-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    database.prepare("INSERT INTO schools (id, name, timezone, locale, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', ?, ?)").run(id, normalizedName, timezone, locale, now, now);
    return { id, name: normalizedName, timezone, locale, status: 'active' };
  }
  function addGrade({ schoolId, name, academicPeriod = null }) {
    if (!schoolId) {
      const error = new Error('A school is required for every grade.');
      error.code = 'SCHOOL_REQUIRED';
      throw error;
    }
    if (!getSchool(schoolId)) {
      const error = new Error('The selected school does not exist.');
      error.code = 'SCHOOL_NOT_FOUND';
      throw error;
    }
    const trimmedName = String(name || '').trim();
    if (!trimmedName) {
      const error = new Error('A grade name is required.');
      error.code = 'GRADE_NAME_REQUIRED';
      throw error;
    }
    const id = `grade-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    database.prepare("INSERT INTO grades (id, school_id, name, academic_period, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', ?, ?)").run(id, schoolId, trimmedName, academicPeriod, new Date().toISOString(), new Date().toISOString());
    return { id, schoolId, name: trimmedName, academicPeriod, status: 'active' };
  }
  function addGroup({ gradeId, name, code }) {
    const trimmed = String(name || '').trim();
    if (!trimmed) {
      const error = new Error('A group name is required.');
      error.code = 'GROUP_NAME_REQUIRED';
      throw error;
    }
    if (!database.prepare("SELECT id FROM grades WHERE id = ? AND status = 'active'").get(gradeId)) {
      const error = new Error('The selected grade does not exist.');
      error.code = 'GRADE_NOT_FOUND';
      throw error;
    }
    const groupCode = code || trimmed.toUpperCase().replace(/\s+/g, '-');
    const id = `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    database.prepare("INSERT INTO groups (id, grade_id, name, code, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', ?, ?)").run(id, gradeId, trimmed, groupCode, new Date().toISOString(), new Date().toISOString());
    return { id, gradeId, name: trimmed, code: groupCode, status: 'active' };
  }
  function addTeacher({ name, email, phone = null, schoolId }) {
    if (!schoolId) {
      const error = new Error('A valid school is required for every teacher.');
      error.code = 'SCHOOL_REQUIRED';
      throw error;
    }
    if (!getSchool(schoolId)) {
      const error = new Error('The selected school does not exist.');
      error.code = 'SCHOOL_NOT_FOUND';
      throw error;
    }
    const id = `teacher-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    database.prepare("INSERT INTO teachers (id, name, email, phone, school_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)").run(id, name, email, phone, schoolId, new Date().toISOString(), new Date().toISOString());
    return { id, name, email, phone, schoolId, status: 'active' };
  }
  function updateTeacher(id, { name, email, phone = null, schoolId }) {
    const current = database.prepare("SELECT id FROM teachers WHERE id = ? AND status = 'active'").get(id);
    if (!current) return null;
    const normalizedName = String(name || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedName || !normalizedEmail || !schoolId || !getSchool(schoolId)) {
      const error = new Error('Enter a teacher name, valid email, and active school.');
      error.code = 'TEACHER_VALIDATION';
      throw error;
    }
    const duplicate = database.prepare('SELECT id FROM teachers WHERE email = ? AND id <> ?').get(normalizedEmail, id);
    if (duplicate) {
      const error = new Error('A teacher with this email already exists.');
      error.code = 'TEACHER_VALIDATION';
      throw error;
    }
    database.prepare('UPDATE teachers SET name = ?, email = ?, phone = ?, school_id = ?, updated_at = ? WHERE id = ?')
      .run(normalizedName, normalizedEmail, phone || null, schoolId, new Date().toISOString(), id);
    return database.prepare("SELECT id, name, email, phone, school_id AS schoolId, status FROM teachers WHERE id = ?").get(id);
  }
  function listSchools() { return database.prepare("SELECT id, name, timezone, locale, status FROM schools WHERE status = 'active' ORDER BY name").all(); }
  function getSchool(id) { return database.prepare("SELECT id, name, timezone, locale, status FROM schools WHERE id = ? AND status = 'active'").get(id) || null; }
  function updateSchool(id, changes) {
    const current = getSchool(id);
    if (!current) return null;
    const next = { name: changes.name ?? current.name, timezone: changes.timezone ?? current.timezone, locale: changes.locale ?? current.locale };
    next.name = validateSchool(next);
    database.prepare('UPDATE schools SET name = ?, timezone = ?, locale = ?, updated_at = ? WHERE id = ?').run(next.name, next.timezone, next.locale, new Date().toISOString(), id);
    return getSchool(id);
  }
  function listGrades(schoolId) { return database.prepare("SELECT id, name, academic_period AS academicPeriod, status FROM grades WHERE school_id = ? AND status = 'active' ORDER BY name").all(schoolId); }
  function listGroups(gradeId) { return database.prepare("SELECT id, name, code, status FROM groups WHERE grade_id = ? AND status = 'active' ORDER BY name").all(gradeId); }
  function addStudent({ familyId, schoolId, gradeId, groupId, name }) {
    if (!schoolId || !gradeId || !groupId) {
      const error = new Error('School, grade, and group are required for every student.');
      error.code = 'STUDENT_ASSIGNMENT_REQUIRED';
      throw error;
    }
    if (!getSchool(schoolId)) {
      const error = new Error('The selected school does not exist.');
      error.code = 'SCHOOL_NOT_FOUND';
      throw error;
    }
    const grade = database.prepare("SELECT id, school_id AS schoolId, status FROM grades WHERE id = ? AND status = 'active'").get(gradeId);
    if (!grade || grade.schoolId !== schoolId) {
      const error = new Error('The selected grade does not belong to the selected school.');
      error.code = 'GRADE_SCHOOL_MISMATCH';
      throw error;
    }
    const group = database.prepare("SELECT id, grade_id AS gradeId, status FROM groups WHERE id = ? AND status = 'active'").get(groupId);
    if (!group || group.gradeId !== gradeId) {
      const error = new Error('The selected group does not belong to the selected grade.');
      error.code = 'GROUP_GRADE_MISMATCH';
      throw error;
    }
    const id = `student-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    database.prepare("INSERT INTO students (id, family_id, school_id, grade_id, group_id, name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)").run(id, familyId, schoolId, gradeId, groupId, name, new Date().toISOString(), new Date().toISOString());
    return { id, familyId, schoolId, gradeId, groupId, name, status: 'active' };
  }
  function updateStudent(id, changes) {
    const current = database.prepare("SELECT id, family_id AS familyId, school_id AS schoolId, grade_id AS gradeId, group_id AS groupId FROM students WHERE id = ? AND status = 'active'").get(id);
    if (!current) return null;
    const familyId = changes.familyId ?? current.familyId;
    const schoolId = changes.schoolId ?? current.schoolId;
    const gradeId = changes.gradeId ?? current.gradeId;
    const groupId = changes.groupId ?? current.groupId;
    const name = String(changes.name ?? '').trim();
    if (!name || !database.prepare("SELECT id FROM family_records WHERE id = ? AND status = 'active'").get(familyId)) {
      const error = new Error('Choose a name and active family for the student.');
      error.code = 'STUDENT_VALIDATION';
      throw error;
    }
    if (!getSchool(schoolId)) {
      const error = new Error('The selected school does not exist.');
      error.code = 'SCHOOL_NOT_FOUND';
      throw error;
    }
    const grade = database.prepare("SELECT id, school_id AS schoolId FROM grades WHERE id = ? AND status = 'active'").get(gradeId);
    const group = database.prepare("SELECT id, grade_id AS gradeId FROM groups WHERE id = ? AND status = 'active'").get(groupId);
    if (!grade || grade.schoolId !== schoolId) {
      const error = new Error('The selected grade does not belong to the selected school.');
      error.code = 'GRADE_SCHOOL_MISMATCH';
      throw error;
    }
    if (!group || group.gradeId !== gradeId) {
      const error = new Error('The selected group does not belong to the selected grade.');
      error.code = 'GROUP_GRADE_MISMATCH';
      throw error;
    }
    database.prepare('UPDATE students SET family_id = ?, school_id = ?, grade_id = ?, group_id = ?, name = ?, updated_at = ? WHERE id = ?')
      .run(familyId, schoolId, gradeId, groupId, name, new Date().toISOString(), id);
    return database.prepare('SELECT id, name, family_id AS familyId, school_id AS schoolId, grade_id AS gradeId, group_id AS groupId, status FROM students WHERE id = ?').get(id);
  }
  function listTeachers(schoolId) {
    const query = `SELECT t.id, t.name, t.email, t.phone, t.school_id AS schoolId, s.name AS schoolName, t.status FROM teachers t LEFT JOIN schools s ON s.id = t.school_id WHERE t.status = 'active'${schoolId ? ' AND t.school_id = ?' : ''} ORDER BY t.name`;
    return schoolId ? database.prepare(query).all(schoolId) : database.prepare(query).all();
  }
  function listStudents() { return database.prepare("SELECT s.id, s.name, s.family_id AS familyId, f.display_name AS familyName, s.school_id AS schoolId, sc.name AS schoolName, s.grade_id AS gradeId, g.name AS gradeName, s.group_id AS groupId, gr.name AS groupName, s.status FROM students s LEFT JOIN family_records f ON f.id = s.family_id LEFT JOIN schools sc ON sc.id = s.school_id LEFT JOIN grades g ON g.id = s.grade_id LEFT JOIN groups gr ON gr.id = s.group_id WHERE s.status = 'active' ORDER BY s.name").all(); }
  return { createSchool, getSchool, updateSchool, addGrade, addGroup, addTeacher, updateTeacher, addStudent, updateStudent, listSchools, listGrades, listGroups, listTeachers, listStudents };
}
module.exports = { createSchoolService };
