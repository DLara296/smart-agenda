const request = require('supertest');
const { createApp } = require('../../src/app');

test('lists family summaries only for administrators', async () => {
  const { app } = createApp({ database: ':memory:' });
  await request(app).post('/v1/families').set('x-user-role', 'admin').send({ displayName: 'Gonzalez Family', schoolId: 'school-1', guardians: [{ name: 'Maria', email: 'maria@example.com' }], children: [{ name: 'Sofia', gradeId: 'grade-1', groupId: 'group-a' }] });
  const response = await request(app).get('/v1/families').set('x-user-role', 'admin');
  expect(response.status).toBe(200);
  expect(response.body[0]).toEqual(expect.objectContaining({ displayName: 'Gonzalez Family', guardianCount: 1, childCount: 1 }));
  expect((await request(app).get('/v1/families').set('x-user-role', 'coordinator')).status).toBe(403);
  expect((await request(app).get('/v1/families').set('x-user-role', 'guest')).status).toBe(403);
});

test('returns only the signed-in account family and allows one family per guest', async () => {
  const { app } = createApp({ database: ':memory:' });
  const agent = request.agent(app);
  await agent.post('/v1/auth/register').send({ name: 'Guest Parent', familyName: 'Lara', email: 'lara@example.com', password: 'correct-horse' });
  const before = await agent.get('/v1/families/me');
  await request(app).post('/v1/families').set('x-user-role', 'admin').send({ displayName: 'Other Family', schoolId: 'school-1' });
  await agent.post('/v1/families').send({ displayName: 'Lara Family', schoolId: 'school-1', guardians: [{ name: 'David' }], children: [{ name: 'Juliette', gradeId: 'grade-1', groupId: 'group-a' }] });
  const mine = await agent.get('/v1/families/me');
  const second = await agent.post('/v1/families').send({ displayName: 'Second Family', schoolId: 'school-1' });

  expect(before.body.data).toBeNull();
  expect(mine.body.data).toEqual(expect.objectContaining({ displayName: 'Lara Family' }));
  expect(mine.body.data.children.map(child => child.name)).toEqual(['Juliette']);
  expect(second.status).toBe(409);
});
