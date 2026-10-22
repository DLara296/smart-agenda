const request = require('supertest');
const { createApp } = require('../../src/app');

describe('family registration', () => {
  it('creates a household with multiple guardians and children', async () => {
    const { app } = createApp({ database: ':memory:' });
    const admin = (path, body) => request(app).post(path).set('x-user-role', 'admin').send(body);
    const school = (await admin('/v1/admin/schools', { name: 'Registration School' })).body.data;
    const grade = (await admin('/v1/grades', { schoolId: school.id, name: 'Grade 1' })).body;
    const group = (await admin('/v1/groups', { gradeId: grade.id, name: 'Group 1' })).body;
    const response = await request(app)
      .post('/v1/families')
      .set('x-user-role', 'admin')
      .send({
        displayName: 'Johnson Family',
        schoolId: school.id,
        guardians: [{ name: 'Maria Johnson', email: 'maria@example.com', relationship: 'mother', supportedLanguages: ['en', 'es'] }],
        children: [{ name: 'Liam Johnson', gradeId: grade.id, groupId: group.id }],
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(expect.objectContaining({ displayName: 'Johnson Family', status: 'active' }));
    const children = await request(app).get(`/v1/families/${response.body.id}/children`).set('x-user-role', 'admin');
    expect(children.body).toHaveLength(1);
  });
});
