const request = require('supertest');
const { createApp } = require('../../src/app');
const { createDatabase } = require('../../src/db/database');

describe('profile editing boundaries and persistence', () => {
  let app;
  let database;
  let close;

  beforeEach(() => {
    database = createDatabase(':memory:');
    ({ app, close } = createApp({ database }));
  });

  afterEach(() => close());

  it('persists the current user profile independently', async () => {
    const update = await request(app)
      .patch('/v1/profile')
      .set('x-user-role', 'coordinator')
      .set('x-user-id', 'user-1')
      .send({ name: 'Mariela Garcia', avatar: { value: 'MG', tone: 'default' } });
    const read = await request(app)
      .get('/v1/profile')
      .set('x-user-role', 'coordinator')
      .set('x-user-id', 'user-1');

    expect(update.status).toBe(200);
    expect(update.body.data.name).toBe('Mariela Garcia');
    expect(read.body.data.avatar.value).toBe('MG');
  });

  it('updates only the selected school and rejects guests', async () => {
    const createdA = await request(app).post('/v1/schools').set('x-user-role', 'admin').send({ name: 'School A' });
    const createdB = await request(app).post('/v1/schools').set('x-user-role', 'admin').send({ name: 'School B' });
    const schoolA = createdA.body.id;
    const schoolB = createdB.body.id;
    const now = new Date().toISOString();
    database.prepare('INSERT INTO users (id, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run('admin-1', 'Administrator', 'admin', now, now);
    database.prepare('INSERT INTO users (id, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run('user-1', 'Coordinator', 'coordinator', now, now);
    const membership = await request(app)
      .post('/v1/admin/school-memberships')
      .set('x-user-role', 'admin')
      .set('x-user-id', 'admin-1')
      .send({ userId: 'user-1', schoolId: schoolA });
    const denied = await request(app).patch(`/v1/schools/${schoolA}`).set('x-user-role', 'guest').send({ name: 'Unauthorized' });
    const updated = await request(app).patch(`/v1/schools/${schoolA}`).set('x-user-role', 'coordinator').set('x-user-id', 'user-1').send({ name: 'School A Updated' });
    const untouched = await request(app).get(`/v1/admin/schools/${schoolB}`).set('x-user-role', 'admin');

    expect(membership.status).toBe(201);
    expect(denied.status).toBe(403);
    expect(updated.body.data.name).toBe('School A Updated');
    expect(untouched.body.data.name).toBe('School B');
  });

  it('rejects teacher creation without a valid school and stores the association', async () => {
    const school = await request(app).post('/v1/schools').set('x-user-role', 'admin').send({ name: 'Teacher School' });
    const missing = await request(app).post('/v1/teachers').set('x-user-role', 'admin').send({ name: 'Unassigned', email: 'unassigned@example.com' });
    const invalid = await request(app).post('/v1/teachers').set('x-user-role', 'admin').send({ name: 'Unknown', email: 'unknown@example.com', schoolId: 'missing' });
    const created = await request(app).post('/v1/teachers').set('x-user-role', 'admin').send({ name: 'Assigned', email: 'assigned@example.com', schoolId: school.body.id });

    expect(missing.status).toBe(400);
    expect(invalid.status).toBe(400);
    expect(created.status).toBe(201);
    expect(created.body.schoolId).toBe(school.body.id);
  });

  it('rejects inconsistent student hierarchy assignments', async () => {
    const schoolA = await request(app).post('/v1/schools').set('x-user-role', 'admin').send({ name: 'School A' });
    const schoolB = await request(app).post('/v1/schools').set('x-user-role', 'admin').send({ name: 'School B' });
    const grade = await request(app).post('/v1/grades').set('x-user-role', 'admin').send({ schoolId: schoolA.body.id, name: 'Grade 1' });
    const otherGrade = await request(app).post('/v1/grades').set('x-user-role', 'admin').send({ schoolId: schoolB.body.id, name: 'Grade 2' });
    const group = await request(app).post('/v1/groups').set('x-user-role', 'admin').send({ gradeId: grade.body.id, name: 'Group A', code: 'G1-A' });
    const missing = await request(app).post('/v1/students').set('x-user-role', 'admin').send({ name: 'Missing' });
    const invalid = await request(app).post('/v1/students').set('x-user-role', 'admin').send({ name: 'Invalid', schoolId: schoolA.body.id, gradeId: otherGrade.body.id, groupId: group.body.id });
    const created = await request(app).post('/v1/students').set('x-user-role', 'admin').send({ familyId: 'family-1', name: 'Valid', schoolId: schoolA.body.id, gradeId: grade.body.id, groupId: group.body.id });

    expect(missing.status).toBe(400);
    expect(invalid.status).toBe(400);
    expect(created.status).toBe(201);
    expect(created.body.schoolId).toBe(schoolA.body.id);
    expect(created.body.gradeId).toBe(grade.body.id);
    expect(created.body.groupId).toBe(group.body.id);
  });

  it('rejects grade creation without a valid school', async () => {
    const missing = await request(app).post('/v1/grades').set('x-user-role', 'admin').send({ name: 'Grade 1' });
    const invalid = await request(app).post('/v1/grades').set('x-user-role', 'admin').send({ schoolId: 'missing', name: 'Grade 1' });
    const school = await request(app).post('/v1/schools').set('x-user-role', 'admin').send({ name: 'Grade School' });
    const created = await request(app).post('/v1/grades').set('x-user-role', 'admin').send({ schoolId: school.body.id, name: 'Grade 1' });

    expect(missing.status).toBe(400);
    expect(invalid.status).toBe(400);
    expect(created.status).toBe(201);
    expect(created.body.schoolId).toBe(school.body.id);
  });
});
