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

test('stores default, built-in, and uploaded avatars for the household, guardians, and children', async () => {
  const { app } = createApp({ database: ':memory:' });
  const agent = request.agent(app);
  await agent.post('/v1/auth/register').send({ name: 'Guest Parent', familyName: 'Lara', email: 'avatar@example.com', password: 'correct-horse' });
  const invalid = await agent.post('/v1/families').send({ displayName: 'Lara Family', schoolId: 'school-1', avatar: 'preset:dragon', guardians: [{ name: 'David' }], children: [] });
  await agent.post('/v1/families').send({ displayName: 'Lara Family', schoolId: 'school-1', guardians: [{ name: 'David', relationship: 'Father' }], children: [{ name: 'Juliette', gradeId: 'grade-1', groupId: 'group-a' }] });
  const defaults = (await agent.get('/v1/families/me')).body.data;
  const photo = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
  const updated = await agent.put('/v1/families/me').send({
    displayName: 'Lara Family', schoolId: 'school-1', avatar: 'preset:family',
    guardians: [{ id: defaults.guardians[0].id, name: 'David', relationship: 'Father', avatar: photo }],
    children: [{ id: defaults.children[0].id, name: 'Juliette', gradeId: 'grade-1', groupId: 'group-a', avatar: 'preset:girl' }],
  });
  const script = await agent.put('/v1/families/me').send({ displayName: 'Lara Family', schoolId: 'school-1', avatar: 'data:image/svg+xml;base64,PHN2Zz4=', guardians: [{ name: 'David' }], children: [{ name: 'Juliette', gradeId: 'grade-1', groupId: 'group-a' }] });

  expect(invalid.status).toBe(400);
  expect(defaults.avatar).toBe('preset:house');
  expect(defaults.guardians[0].avatar).toBe('preset:adult');
  expect(defaults.children[0].avatar).toBe('preset:child');
  expect(updated.body.data.avatar).toBe('preset:family');
  expect(updated.body.data.guardians[0].avatar).toBe(photo);
  expect(updated.body.data.children[0].avatar).toBe('preset:girl');
  expect(script.status).toBe(400);
});

test('edits the account family with several guardians and children', async () => {
  const { app } = createApp({ database: ':memory:' });
  const agent = request.agent(app);
  await agent.post('/v1/auth/register').send({ name: 'Guest Parent', familyName: 'Lara', email: 'edit@example.com', password: 'correct-horse' });
  const noFamily = await agent.put('/v1/families/me').send({ displayName: 'X' });
  await agent.post('/v1/families').send({ displayName: 'Lara Family', schoolId: 'school-1', guardians: [{ name: 'David', relationship: 'Father' }], children: [{ name: 'Juliette', gradeId: 'grade-1', groupId: 'group-a' }] });
  const original = (await agent.get('/v1/families/me')).body.data;
  const other = await request(app).post('/v1/families').set('x-user-role', 'admin').send({ displayName: 'Other', schoolId: 'school-1', children: [{ name: 'Stranger', gradeId: 'grade-9', groupId: 'group-z' }] });
  const otherChildId = (await request(app).get(`/v1/families/${other.body.id}/children`).set('x-user-role', 'admin')).body[0].id;

  const updated = await agent.put('/v1/families/me').send({
    displayName: 'Lara Garcia',
    schoolId: 'school-1',
    guardians: [{ id: original.guardians[0].id, name: 'David Lara', relationship: 'Father' }, { name: 'Rosa', relationship: 'Grandmother', supportedLanguages: ['es'] }],
    children: [{ id: original.children[0].id, name: 'Juliette', gradeId: 'grade-1', groupId: 'group-b' }, { name: 'Mateo', gradeId: 'grade-3', groupId: 'group-a' }],
  });
  const hijack = await agent.put('/v1/families/me').send({ displayName: 'Lara', schoolId: 'school-1', guardians: [{ name: 'David' }], children: [{ id: otherChildId, name: 'Taken', gradeId: 'grade-1', groupId: 'group-a' }] });
  const invalid = await agent.put('/v1/families/me').send({ displayName: 'Lara', schoolId: 'school-1', guardians: [], children: [] });
  const removed = await agent.put('/v1/families/me').send({ displayName: 'Lara Garcia', schoolId: 'school-1', guardians: [{ id: original.guardians[0].id, name: 'David Lara', relationship: 'Father' }], children: [{ id: original.children[0].id, name: 'Juliette', gradeId: 'grade-1', groupId: 'group-b' }] });

  expect(noFamily.status).toBe(404);
  expect(updated.status).toBe(200);
  expect(updated.body.data.displayName).toBe('Lara Garcia');
  expect(updated.body.data.guardians.map(guardian => guardian.name)).toEqual(['David Lara', 'Rosa']);
  expect(updated.body.data.children.map(child => child.name)).toEqual(['Juliette', 'Mateo']);
  expect(updated.body.data.children[0].id).toBe(original.children[0].id);
  expect(hijack.status).toBe(400);
  expect(invalid.status).toBe(400);
  expect(removed.body.data.guardians).toHaveLength(1);
  expect(removed.body.data.children).toHaveLength(1);
});
