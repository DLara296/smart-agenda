const { createDatabase } = require('../../../db/database');
const { createSchoolService } = require('../schoolService');

test('creates a configurable school structure', () => {
  const database = createDatabase(':memory:');
  const service = createSchoolService(database);
  const school = service.createSchool({ name: 'Westfield Elementary', timezone: 'UTC', locale: 'en-US' });
  const grade = service.addGrade({ schoolId: school.id, name: 'Grade 1' });
  const group = service.addGroup({ gradeId: grade.id, name: 'Group A', code: 'G1-A' });
  const teacher = service.addTeacher({ name: 'Miss Mariela', email: 'mariela@example.com' });

  expect(service.listSchools()).toHaveLength(1);
  expect(group.gradeId).toBe(grade.id);
  expect(teacher.status).toBe('active');
});
