const request = require('supertest');
const { createApp } = require('../../src/app');

const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]);
const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(32)]);
const dataUrl = (type, bytes) => `data:image/${type};base64,${bytes.toString('base64')}`;

describe('appearance preferences', () => {
  let app;
  let close;
  let agent;

  beforeEach(async () => {
    ({ app, close } = createApp({ database: ':memory:' }));
    agent = request.agent(app);
    await agent.post('/v1/auth/register').send({ name: 'Guest Parent', familyName: 'Lara', email: 'appearance@example.com', password: 'correct-horse' });
  });

  afterEach(() => close());

  it('saves theme, background, and overlay per account and keeps the theme when the background is removed', async () => {
    const initial = await agent.get('/v1/appearance-preferences');
    await agent.put('/v1/appearance-preferences').send({ theme: 'dark' });
    const applied = await agent.put('/v1/appearance-preferences').send({ dashboardBackground: dataUrl('png', png), backgroundOverlay: 55 });
    const replaced = await agent.put('/v1/appearance-preferences').send({ dashboardBackground: dataUrl('webp', webp) });

    const relogin = request.agent(app);
    await relogin.post('/v1/auth/sign-in').send({ email: 'appearance@example.com', password: 'correct-horse' });
    const restored = await relogin.get('/v1/appearance-preferences');
    const removed = await relogin.put('/v1/appearance-preferences').send({ dashboardBackground: null });

    expect(initial.body.data).toEqual({ theme: null, dashboardBackground: null, backgroundOverlay: 40 });
    expect(applied.body.data).toEqual({ theme: 'dark', dashboardBackground: dataUrl('png', png), backgroundOverlay: 55 });
    expect(replaced.body.data.dashboardBackground).toBe(dataUrl('webp', webp));
    expect(restored.body.data).toEqual({ theme: 'dark', dashboardBackground: dataUrl('webp', webp), backgroundOverlay: 55 });
    expect(removed.body.data).toEqual({ theme: 'dark', dashboardBackground: null, backgroundOverlay: 55 });
  });

  it('accepts JPEG and rejects unsupported, mislabeled, malformed, and oversized images', async () => {
    const valid = await agent.put('/v1/appearance-preferences').send({ dashboardBackground: dataUrl('jpeg', jpeg) });
    const gif = await agent.put('/v1/appearance-preferences').send({ dashboardBackground: dataUrl('gif', Buffer.from('GIF89a')) });
    const svg = await agent.put('/v1/appearance-preferences').send({ dashboardBackground: 'data:image/svg+xml;base64,PHN2Zz4=' });
    const mislabeled = await agent.put('/v1/appearance-preferences').send({ dashboardBackground: dataUrl('png', jpeg) });
    const malformed = await agent.put('/v1/appearance-preferences').send({ dashboardBackground: 'data:image/png;base64,@@@' });
    const path = await agent.put('/v1/appearance-preferences').send({ dashboardBackground: '../../etc/passwd' });
    const oversized = await agent.put('/v1/appearance-preferences').send({ dashboardBackground: dataUrl('png', Buffer.concat([png, Buffer.alloc(1.6 * 1024 * 1024)])) });
    const after = await agent.get('/v1/appearance-preferences');

    expect(valid.status).toBe(200);
    [gif, svg, mislabeled, malformed, path, oversized].forEach(response => expect(response.status).toBe(400));
    expect(after.body.data.dashboardBackground).toBe(dataUrl('jpeg', jpeg));
  });

  it('accepts built-in backgrounds by name only', async () => {
    const preset = await agent.put('/v1/appearance-preferences').send({ dashboardBackground: 'preset:ocean' });
    const unknown = await agent.put('/v1/appearance-preferences').send({ dashboardBackground: 'preset:dragons' });
    const traversal = await agent.put('/v1/appearance-preferences').send({ dashboardBackground: 'preset:../../secrets' });
    const after = await agent.get('/v1/appearance-preferences');

    expect(preset.status).toBe(200);
    expect(unknown.status).toBe(400);
    expect(traversal.status).toBe(400);
    expect(after.body.data.dashboardBackground).toBe('preset:ocean');
  });

  it('validates theme and overlay values and requires authentication', async () => {
    expect((await agent.put('/v1/appearance-preferences').send({ theme: 'neon' })).status).toBe(400);
    expect((await agent.put('/v1/appearance-preferences').send({ backgroundOverlay: 95 })).status).toBe(400);
    expect((await agent.put('/v1/appearance-preferences').send({ backgroundOverlay: '20' })).status).toBe(400);
    expect((await request(app).get('/v1/appearance-preferences')).status).toBe(401);
    expect((await request(app).put('/v1/appearance-preferences').send({ theme: 'dark' })).status).toBe(401);
  });
});
