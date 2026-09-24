const request = require('supertest');
const { createApp } = require('../../src/app');

describe('family registration', () => {
  it('creates a household with multiple guardians and children', async () => {
    const { app } = createApp({ database: ':memory:' });
    const response = await request(app)
      .post('/v1/families')
      .set('x-user-role', 'admin')
      .send({
        displayName: 'Johnson Family',
        schoolId: 'school-1',
        guardians: [{ name: 'Maria Johnson', email: 'maria@example.com', relationship: 'mother', supportedLanguages: ['en', 'es'] }],
        children: [{ name: 'Liam Johnson', gradeId: 'grade-1', groupId: 'group-1' }],
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(expect.objectContaining({ displayName: 'Johnson Family', status: 'active' }));
    const children = await request(app).get(`/v1/families/${response.body.id}/children`).set('x-user-role', 'admin');
    expect(children.body).toHaveLength(1);
  });
});
