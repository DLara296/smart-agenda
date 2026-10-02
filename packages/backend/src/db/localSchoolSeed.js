function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function seedDefaultSchools(database) {
  const count = database.prepare("SELECT COUNT(*) AS count FROM schools WHERE status = 'active'").get().count;
  if (count > 0) return;
  const insert = database.prepare("INSERT INTO schools (id, name, timezone, locale, status, created_at, updated_at) VALUES (?, ?, 'UTC', 'en-US', 'active', ?, ?)");
  const now = new Date().toISOString();
  for (const name of ['Westfield Elementary', 'Northview Primary', 'Lakeside Academy']) {
    insert.run(makeId('school'), name, now, now);
  }
}

function seedDevelopmentSchoolHierarchy(database) {
  const school = database.prepare("SELECT id FROM schools WHERE name = 'Westfield Elementary' AND status = 'active' LIMIT 1").get()
    || database.prepare("SELECT id FROM schools WHERE status = 'active' ORDER BY name LIMIT 1").get();
  if (!school) return;
  for (const gradeName of ['Grade 1', 'Grade 2', 'Grade 3']) {
    let grade = database.prepare("SELECT id FROM grades WHERE school_id = ? AND name = ? AND status = 'active'").get(school.id, gradeName);
    if (!grade) {
      const id = makeId('grade');
      const now = new Date().toISOString();
      database.prepare("INSERT INTO grades (id, school_id, name, academic_period, status, created_at, updated_at) VALUES (?, ?, ?, NULL, 'active', ?, ?)").run(id, school.id, gradeName, now, now);
      grade = { id };
    }
    for (const groupName of ['Group A', 'Group B']) {
      const existing = database.prepare("SELECT id FROM groups WHERE grade_id = ? AND name = ? AND status = 'active'").get(grade.id, groupName);
      if (!existing) {
        const now = new Date().toISOString();
        database.prepare("INSERT INTO groups (id, grade_id, name, code, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', ?, ?)").run(makeId('group'), grade.id, groupName, groupName.toUpperCase().replace(/\s+/g, '-'), now, now);
      }
    }
  }
}

module.exports = { seedDefaultSchools, seedDevelopmentSchoolHierarchy };
