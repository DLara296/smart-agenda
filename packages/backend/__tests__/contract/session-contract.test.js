const request = require('supertest');
const { createApp } = require('../../src/app');

describe('session contract', () => {
  it('creates a scheduled session and returns coverage state', async () => {
    const { app, close } = createApp({ database: ':memory:', clock: () => new Date('2026-09-01T12:00:00.000Z') });
    const response = await request(app)
      .post('/v1/sessions')
      .set('x-user-role', 'coordinator')
      .send({
        schoolId: 'school-1',
        gradeId: 'grade-1',
        sessionDate: '2026-10-01',
        startTime: '09:00',
        endTime: '10:30',
        assignments: [
          { groupId: 'group-1', language: 'en' },
          { groupId: 'group-2', language: 'en' },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('scheduled');
    expect(response.body.coverage.missingGroups).toEqual(['group-1', 'group-2']);
    expect(response.body.coverage.warningCount).toBe(2);
    close();
  });
});
