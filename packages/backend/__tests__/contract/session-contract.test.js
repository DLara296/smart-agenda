const request = require('supertest');
const { createApp } = require('../../src/app');

describe('session contract', () => {
  it('creates a scheduled session and returns coverage state', async () => {
    const { app, close } = createApp({ database: ':memory:', clock: () => new Date('2026-09-01T12:00:00.000Z') });
    const admin = (method, path, body) => request(app)[method](path).set('x-user-role', 'admin').send(body);
    const schools = await request(app).get('/v1/schools').set('x-user-role', 'admin');
    const schoolId = schools.body.data[0].id;
    const grade = await admin('post', '/v1/grades', { schoolId, name: 'Contract Grade' });
    const groupOne = await admin('post', '/v1/groups', { gradeId: grade.body.id, name: 'Contract Group One' });
    const groupTwo = await admin('post', '/v1/groups', { gradeId: grade.body.id, name: 'Contract Group Two' });
    const response = await request(app)
      .post('/v1/sessions')
      .set('x-user-role', 'coordinator')
      .send({
        schoolId,
        gradeId: grade.body.id,
        sessionDate: '2026-10-01',
        startTime: '09:00',
        endTime: '10:30',
        assignments: [
          { groupId: groupOne.body.id, language: 'en' },
          { groupId: groupTwo.body.id, language: 'en' },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('scheduled');
    expect(response.body.coverage.missingGroups).toEqual([groupOne.body.id, groupTwo.body.id]);
    expect(response.body.coverage.warningCount).toBe(2);
    close();
  });
});
