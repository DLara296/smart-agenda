function createSchoolService(database) {
  function createSchool({ name, timezone = 'UTC', locale = 'en-US' }) {
    const id = `school-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    database.prepare("INSERT INTO schools (id, name, timezone, locale, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', ?, ?)").run(id, name, timezone, locale, now, now);
    return { id, name, timezone, locale, status: 'active' };
  }
  function addGrade({ schoolId, name, academicPeriod = null }) {
    const id = `grade-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    database.prepare("INSERT INTO grades (id, school_id, name, academic_period, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', ?, ?)").run(id, schoolId, name, academicPeriod, new Date().toISOString(), new Date().toISOString());
    return { id, schoolId, name, academicPeriod, status: 'active' };
  }
  function addGroup({ gradeId, name, code }) {
    const id = `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    database.prepare("INSERT INTO groups (id, grade_id, name, code, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', ?, ?)").run(id, gradeId, name, code, new Date().toISOString(), new Date().toISOString());
    return { id, gradeId, name, code, status: 'active' };
  }
  function addTeacher({ name, email, phone = null }) {
    const id = `teacher-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    database.prepare("INSERT INTO teachers (id, name, email, phone, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', ?, ?)").run(id, name, email, phone, new Date().toISOString(), new Date().toISOString());
    return { id, name, email, phone, status: 'active' };
  }
  function listSchools() { return database.prepare("SELECT id, name, timezone, locale, status FROM schools WHERE status = 'active' ORDER BY name").all(); }
  return { createSchool, addGrade, addGroup, addTeacher, listSchools };
}
module.exports = { createSchoolService };
