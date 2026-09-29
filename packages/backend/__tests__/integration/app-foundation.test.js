const request = require('supertest');
const { createApp } = require('../../src/app');

describe('backend app foundation', () => {
  it('exposes health and JSON error contracts', async () => {
    const { app, close } = createApp({ database: ':memory:' });
    const health = await request(app).get('/health');
    const error = await request(app).get('/v1/not-found');

    expect(health.status).toBe(200);
    expect(health.body).toEqual({ status: 'ok' });
    expect(error.status).toBe(404);
    expect(error.body.error).toEqual(expect.objectContaining({ code: 'NOT_FOUND' }));

    close();
  });

  it('seeds sample Grades and Groups in development mode', () => {
    const previousEnvironment = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const { db, close } = createApp({ database: ':memory:' });

    try {
      const rows = db.prepare(`
        SELECT grades.name AS grade, groups.name AS groupName
        FROM grades JOIN groups ON groups.grade_id = grades.id
        JOIN schools ON schools.id = grades.school_id
        WHERE schools.name = 'Westfield Elementary'
        ORDER BY grades.name, groups.name
      `).all();

      expect(rows).toEqual([
        { grade: 'Grade 1', groupName: 'Group A' },
        { grade: 'Grade 1', groupName: 'Group B' },
        { grade: 'Grade 2', groupName: 'Group A' },
        { grade: 'Grade 2', groupName: 'Group B' },
        { grade: 'Grade 3', groupName: 'Group A' },
        { grade: 'Grade 3', groupName: 'Group B' },
      ]);
    } finally {
      close();
      if (previousEnvironment === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousEnvironment;
    }
  });
});
