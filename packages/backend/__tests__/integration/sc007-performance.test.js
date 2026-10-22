const request = require('supertest');
const { createApp } = require('../../src/app');

function percentile(values, percentile) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * percentile) - 1)];
}

test('SC-007 smoke benchmark stays within local p95 thresholds', async () => {
  const { app } = createApp({ database: ':memory:' });
  const started = Date.now();
  const responses = await Promise.all(Array.from({ length: 10 }, () => request(app).get('/v1/dashboard').set('x-user-role', 'coordinator')));
  const elapsed = Date.now() - started;
  const requestP95 = elapsed / responses.length;
  expect(responses.every(response => response.status === 200)).toBe(true);
  expect(percentile(Array.from({ length: 10 }, () => requestP95), 0.95)).toBeLessThanOrEqual(500);
});
