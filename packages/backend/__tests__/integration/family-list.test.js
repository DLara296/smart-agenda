const request = require('supertest');
const { createApp } = require('../../src/app');

test('lists family summaries for coordinators', async () => {
  const { app } = createApp({ database: ':memory:' });
  await request(app).post('/v1/families').set('x-user-role', 'admin').send({ displayName: 'Gonzalez Family', schoolId: 'school-1', guardians: [{ name: 'Maria', email: 'maria@example.com' }], children: [{ name: 'Sofia', gradeId: 'grade-1', groupId: 'group-a' }] });
  const response = await request(app).get('/v1/families').set('x-user-role', 'coordinator');
  expect(response.status).toBe(200);
  expect(response.body[0]).toEqual(expect.objectContaining({ displayName: 'Gonzalez Family', guardianCount: 1, childCount: 1 }));
});
