const request = require('supertest');
const { createApp } = require('../../src/app');

describe('grade-based session history', () => {
  let app;
  let close;
  let ids;

  const admin = (method, path, body) => request(app)[method](path).set('x-user-role', 'admin').send(body);
  const createSession = async (gradeId, groupId, sessionDate, status) => {
    const session = await admin('post', '/v1/sessions', { schoolId: ids.school, gradeId, sessionDate, startTime: '07:40', endTime: '08:40', assignments: [{ groupId, teacherId: ids.teacher, language: 'es' }] });
    if (status) await admin('patch', `/v1/sessions/${session.body.id}`, { status });
    return session.body.id;
  };
  const registerFamily = async (email, children) => {
    const agent = request.agent(app);
    await agent.post('/v1/auth/register').send({ name: 'Parent', familyName: 'Family', email, password: 'correct-horse' });
    await agent.post('/v1/families').send({ displayName: 'Family', schoolId: ids.school, children });
    return agent;
  };

  beforeEach(async () => {
    ({ app, close } = createApp({ database: ':memory:' }));
    ids = {};
    ids.school = (await admin('post', '/v1/schools', { name: 'Test School' })).body.id;
    ids.grade1 = (await admin('post', '/v1/grades', { schoolId: ids.school, name: 'Grade 1' })).body.id;
    ids.grade2 = (await admin('post', '/v1/grades', { schoolId: ids.school, name: 'Grade 2' })).body.id;
    ids.grade3 = (await admin('post', '/v1/grades', { schoolId: ids.school, name: 'Grade 3' })).body.id;
    ids.group1A = (await admin('post', '/v1/groups', { gradeId: ids.grade1, name: 'Group A', code: '1A' })).body.id;
    ids.group1B = (await admin('post', '/v1/groups', { gradeId: ids.grade1, name: 'Group B', code: '1B' })).body.id;
    ids.group2A = (await admin('post', '/v1/groups', { gradeId: ids.grade2, name: 'Group A', code: '2A' })).body.id;
    ids.group3B = (await admin('post', '/v1/groups', { gradeId: ids.grade3, name: 'Group B', code: '3B' })).body.id;
    ids.teacher = (await admin('post', '/v1/teachers', { name: 'Miss Mariela', email: 'mariela@school.test', schoolId: ids.school })).body.id;

    ids.otherGroupGrade1 = await createSession(ids.grade1, ids.group1B, '2026-09-01', 'completed');
    ids.juliette = await createSession(ids.grade1, ids.group1A, '2026-10-06');
    ids.mateoCancelled = await createSession(ids.grade3, ids.group3B, '2026-10-13', 'cancelled');
    ids.mateoConfirmed = await createSession(ids.grade3, ids.group3B, '2026-10-20', 'confirmed');
    ids.unrelatedGrade = await createSession(ids.grade2, ids.group2A, '2026-10-07');
  });

  afterEach(() => close());

  const history = (agent, query = '') => agent.get(`/v1/history/sessions${query}`);

  it('defaults to every session in the grades of the account children, in date order, with any status', async () => {
    const agent = await registerFamily('family@example.com', [{ name: 'Juliette', gradeId: ids.grade1, groupId: ids.group1A }, { name: 'Mateo', gradeId: ids.grade3, groupId: ids.group3B }]);
    const response = await history(agent);

    expect(response.status).toBe(200);
    expect(response.body.data.sessions.map(session => session.id)).toEqual([ids.otherGroupGrade1, ids.juliette, ids.mateoCancelled, ids.mateoConfirmed]);
    expect(response.body.data.sessions.map(session => session.status)).toEqual(['completed', 'scheduled', 'cancelled', 'confirmed']);
    expect(response.body.data.grades.map(grade => grade.name).sort()).toEqual(['Grade 1', 'Grade 3']);
    const gradeOnly = response.body.data.sessions.find(session => session.id === ids.otherGroupGrade1);
    expect(gradeOnly.relatedChildren).toEqual([]);
    expect(gradeOnly.groups[0]).toEqual(expect.objectContaining({ groupName: 'Group B', teacherName: 'Miss Mariela', language: 'es' }));
  });

  it('filters by my children, a specific child, grade, and status without expanding scope', async () => {
    const agent = await registerFamily('family@example.com', [{ name: 'Juliette', gradeId: ids.grade1, groupId: ids.group1A }, { name: 'Mateo', gradeId: ids.grade3, groupId: ids.group3B }]);
    const { children } = (await history(agent)).body.data;
    const juliette = children.find(child => child.name === 'Juliette');

    const mine = await history(agent, '?view=children');
    const onlyJuliette = await history(agent, `?view=child&childId=${juliette.id}`);
    const byGrade = await history(agent, `?gradeId=${ids.grade3}`);
    const cancelled = await history(agent, '?status=cancelled');
    const byGroup = await history(agent, `?groupId=${ids.group1B}`);

    expect(mine.body.data.sessions.map(session => session.id)).toEqual([ids.juliette, ids.mateoCancelled, ids.mateoConfirmed]);
    expect(onlyJuliette.body.data.sessions.map(session => session.id)).toEqual([ids.juliette]);
    expect(onlyJuliette.body.data.sessions[0].relatedChildren).toEqual([{ id: juliette.id, name: 'Juliette' }]);
    expect(byGrade.body.data.sessions.map(session => session.id)).toEqual([ids.mateoCancelled, ids.mateoConfirmed]);
    expect(cancelled.body.data.sessions.map(session => session.id)).toEqual([ids.mateoCancelled]);
    expect(byGroup.body.data.sessions.map(session => session.id)).toEqual([ids.otherGroupGrade1]);
    expect(byGroup.body.data.groups.map(group => group.id).sort()).toEqual([ids.group1A, ids.group1B, ids.group3B].sort());
  });

  it('does not duplicate sessions when children share a grade', async () => {
    const agent = await registerFamily('same-grade@example.com', [{ name: 'Juliette', gradeId: ids.grade1, groupId: ids.group1A }, { name: 'Mateo', gradeId: ids.grade1, groupId: ids.group1B }]);
    const response = await history(agent);

    expect(response.body.data.grades).toHaveLength(1);
    expect(response.body.data.sessions.map(session => session.id)).toEqual([ids.otherGroupGrade1, ids.juliette]);
  });

  it('rejects grades and children outside the account', async () => {
    const agent = await registerFamily('family@example.com', [{ name: 'Juliette', gradeId: ids.grade1, groupId: ids.group1A }]);
    const other = await registerFamily('other@example.com', [{ name: 'Other Child', gradeId: ids.grade2, groupId: ids.group2A }]);
    const otherChild = (await history(other)).body.data.children[0];

    expect((await history(agent, `?gradeId=${ids.grade2}`)).status).toBe(403);
    expect((await history(agent, `?groupId=${ids.group2A}`)).status).toBe(403);
    expect((await history(agent, `?view=child&childId=${otherChild.id}`)).status).toBe(403);
    expect((await history(agent, '?view=everything')).status).toBe(400);
    const allowed = await history(agent);
    expect(allowed.body.data.sessions.map(session => session.id)).not.toContain(ids.unrelatedGrade);
    expect(allowed.body.data.children.map(child => child.name)).toEqual(['Juliette']);
  });

  it('returns an empty result for accounts without children and grants no write access', async () => {
    const agent = request.agent(app);
    await agent.post('/v1/auth/register').send({ name: 'No Kids', familyName: 'Solo', email: 'solo@example.com', password: 'correct-horse' });
    const response = await history(agent);
    const edit = await agent.patch(`/v1/sessions/${ids.juliette}`).send({ status: 'cancelled' });
    const post = await agent.post('/v1/history/sessions').send({});

    expect(response.body.data).toEqual({ children: [], grades: [], groups: [], sessions: [] });
    expect(edit.status).toBe(403);
    expect(post.status).toBe(404);
  });
});
