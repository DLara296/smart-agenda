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
});
