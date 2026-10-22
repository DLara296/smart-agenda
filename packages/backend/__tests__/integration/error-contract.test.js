const request = require('supertest');
const { createApp } = require('../../src/app');

test('unknown API routes return the documented error contract', async () => {
  const { app } = createApp({ database: ':memory:' });
  const response = await request(app).get('/v1/unknown');
  expect(response.status).toBe(404);
  expect(response.body.error).toEqual(expect.objectContaining({ code: 'NOT_FOUND', message: expect.any(String) }));
});
