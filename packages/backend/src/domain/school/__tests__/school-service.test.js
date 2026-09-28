const { createDatabase } = require('../../../db/database');
const { createSchoolService } = require('../schoolService');

test('creates a configurable school structure', () => {
  const database = createDatabase(':memory:');
  const service = createSchoolService(database);
  const school = service.createSchool({ name: 'Westfield Elementary', timezone: 'UTC', locale: 'en-US' });
  const grade = service.addGrade({ schoolId: school.id, name: 'Grade 1' });
  const group = service.addGroup({ gradeId: grade.id, name: 'Group A', code: 'G1-A' });
  const teacher = service.addTeacher({ name: 'Miss Mariela', email: 'mariela@example.com', schoolId: school.id });

  expect(service.listSchools()).toHaveLength(1);
  expect(group.gradeId).toBe(grade.id);
  expect(teacher.status).toBe('active');
  expect(teacher.schoolId).toBe(school.id);
});

test('requires a valid school when creating a teacher', () => {
  const service = createSchoolService(createDatabase(':memory:'));
  expect(() => service.addTeacher({ name: 'Unassigned', email: 'unassigned@example.com' })).toThrow('school is required');
  expect(() => service.addTeacher({ name: 'Unknown', email: 'unknown@example.com', schoolId: 'missing' })).toThrow('school does not exist');
});

test('requires a consistent school, grade, and group when creating a student', () => {
  const database = createDatabase(':memory:');
  const service = createSchoolService(database);
  const school = service.createSchool({ name: 'Westfield Elementary' });
  const otherSchool = service.createSchool({ name: 'Northview Primary' });
  const grade = service.addGrade({ schoolId: school.id, name: 'Grade 1' });
  const otherGrade = service.addGrade({ schoolId: otherSchool.id, name: 'Grade 2' });
  const group = service.addGroup({ gradeId: grade.id, name: 'Group A', code: 'G1-A' });

  expect(() => service.addStudent({ name: 'Missing', schoolId: school.id })).toThrow(/school, grade, and group are required/i);
  expect(() => service.addStudent({ name: 'Wrong grade', schoolId: school.id, gradeId: otherGrade.id, groupId: group.id })).toThrow('grade does not belong');
  expect(() => service.addStudent({ familyId: 'family-1', name: 'Valid', schoolId: school.id, gradeId: grade.id, groupId: group.id })).not.toThrow();
});

test('requires a valid school when creating a grade', () => {
  const service = createSchoolService(createDatabase(':memory:'));
  expect(() => service.addGrade({ name: 'Grade 1' })).toThrow(/school is required/i);
  expect(() => service.addGrade({ schoolId: 'missing', name: 'Grade 1' })).toThrow(/school does not exist/i);
});
