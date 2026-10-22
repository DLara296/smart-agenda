const { createSandboxProvider } = require('../sandboxProvider');

test('sandbox provider exposes the notification provider contract', async () => {
  const provider = createSandboxProvider();
  expect(await provider.validateConfiguration()).toBe(true);
  const sent = await provider.send({ id: 'notification-1' });
  expect(sent.status).toBe('sent');
  expect(await provider.getStatus(sent.providerMessageId)).toBe('sent');
  expect((await provider.retry({ id: 'notification-1' })).status).toBe('queued');
});
