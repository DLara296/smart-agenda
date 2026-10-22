const { createDatabase } = require('../../../db/database');
const { createSchoolService } = require('../schoolService');
const { createDatabaseContract } = require('../../../db/databaseContract');

test('school service exposes async contract operations without synchronous SQLite methods', async () => {
  const storage = createDatabaseContract({ driver: 'sqlite', legacy: createDatabase(':memory:') });
  const service = createSchoolService(storage);
  expect(service.createSchoolAsync).toEqual(expect.any(Function));
  expect(service.createSchool).toBeUndefined();
  expect(service.addGrade).toBeUndefined();
  await storage.close();
});

test('creates a configurable school structure', async () => {
  const database = createDatabase(':memory:');
  const storage = createDatabaseContract({ driver: 'sqlite', legacy: database });
  const service = createSchoolService(storage);
  const school = await service.createSchoolAsync({ name: 'Westfield Elementary', timezone: 'UTC', locale: 'en-US' });
  const grade = await service.addGradeAsync({ schoolId: school.id, name: 'Grade 1' });
  const group = await service.addGroupAsync({ gradeId: grade.id, name: 'Group A', code: 'G1-A' });
  const teacher = await service.addTeacherAsync({ name: 'Miss Mariela', email: 'mariela@example.com', schoolId: school.id });

  expect(await service.listSchoolsAsync()).toHaveLength(1);
  expect(group.gradeId).toBe(grade.id);
  expect(teacher.status).toBe('active');
  expect(teacher.schoolId).toBe(school.id);
  await storage.close();
});

test('requires a valid school when creating a teacher', async () => {
  const storage = createDatabaseContract({ driver: 'sqlite', legacy: createDatabase(':memory:') });
  const service = createSchoolService(storage);
  await expect(service.addTeacherAsync({ name: 'Unassigned', email: 'unassigned@example.com' })).rejects.toThrow('school is required');
  await expect(service.addTeacherAsync({ name: 'Unknown', email: 'unknown@example.com', schoolId: 'missing' })).rejects.toThrow('school does not exist');
  await storage.close();
});

test('requires a consistent school, grade, and group when creating a student', async () => {
  const database = createDatabase(':memory:');
  const storage = createDatabaseContract({ driver: 'sqlite', legacy: database });
  const service = createSchoolService(storage);
  const school = await service.createSchoolAsync({ name: 'Westfield Elementary' });
  const otherSchool = await service.createSchoolAsync({ name: 'Northview Primary' });
  const grade = await service.addGradeAsync({ schoolId: school.id, name: 'Grade 1' });
  const otherGrade = await service.addGradeAsync({ schoolId: otherSchool.id, name: 'Grade 2' });
  const group = await service.addGroupAsync({ gradeId: grade.id, name: 'Group A', code: 'G1-A' });

  await expect(service.addStudentAsync({ name: 'Missing', schoolId: school.id })).rejects.toThrow(/school, grade, and group are required/i);
  await expect(service.addStudentAsync({ name: 'Wrong grade', schoolId: school.id, gradeId: otherGrade.id, groupId: group.id })).rejects.toThrow('grade does not belong');
  await expect(service.addStudentAsync({ familyId: 'family-1', name: 'Valid', schoolId: school.id, gradeId: grade.id, groupId: group.id })).resolves.toEqual(expect.objectContaining({ name: 'Valid', gradeId: grade.id, groupId: group.id }));
  await storage.close();
});

test('requires a valid school when creating a grade', async () => {
  const storage = createDatabaseContract({ driver: 'sqlite', legacy: createDatabase(':memory:') });
  const service = createSchoolService(storage);
  await expect(service.addGradeAsync({ name: 'Grade 1' })).rejects.toThrow(/school is required/i);
  await expect(service.addGradeAsync({ schoolId: 'missing', name: 'Grade 1' })).rejects.toThrow(/school does not exist/i);
  await storage.close();
});
