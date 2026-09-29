const { createGmailProvider } = require('../gmailProvider');

const config = {
  senderEmail: 'david.lara170385@gmail.com',
  oauthClientId: 'client-id',
  oauthClientSecret: 'client-secret',
  oauthRefreshToken: 'refresh-token',
};

function fakeGoogleApi({ send, accessToken = 'access-token' } = {}) {
  const oauthClient = { setCredentials: jest.fn(), getAccessToken: jest.fn(async () => ({ token: accessToken })) };
  const sendRequest = send || jest.fn(async () => ({ data: { id: 'gmail-message-1' } }));
  return {
    auth: { OAuth2: jest.fn(() => oauthClient), oauthClient },
    gmail: jest.fn(() => ({ users: { messages: { send: sendRequest } } })),
    sendRequest,
  };
}

test('Gmail adapter validates OAuth2 configuration and sends using only the Gmail send scope', async () => {
  const googleApi = fakeGoogleApi();
  const provider = createGmailProvider({ config, googleApi });

  expect(await provider.validateConfiguration()).toEqual({ valid: true, verified: false });
  expect(await provider.validateConfiguration({ verifyConnection: true })).toEqual({ valid: true, verified: true });
  const result = await provider.send({ id: 'notification-1', channel: 'email', to: 'family@example.test', subject: 'Reminder', text: 'Tomorrow at 9.' });

  expect(googleApi.auth.oauthClient.setCredentials).toHaveBeenCalledWith({ refresh_token: config.oauthRefreshToken });
  expect(googleApi.sendRequest).toHaveBeenCalledWith(expect.objectContaining({ userId: 'me', requestBody: { raw: expect.any(String) } }));
  const raw = Buffer.from(googleApi.sendRequest.mock.calls[0][0].requestBody.raw, 'base64url').toString('utf8');
  expect(raw).toContain(`From: ${config.senderEmail}`);
  expect(raw).toContain('To: family@example.test');
  expect(raw).toContain('Subject: Reminder');
  const encodedBody = raw.split('\r\n\r\n').pop().replace(/\s/g, '');
  expect(Buffer.from(encodedBody, 'base64').toString('utf8')).toBe('Tomorrow at 9.');
  expect(result).toEqual({ status: 'accepted', providerMessageId: 'gmail-message-1' });
});

test('Gmail adapter fails closed when OAuth2 configuration is incomplete', async () => {
  const googleApi = fakeGoogleApi();
  const provider = createGmailProvider({ config: { senderEmail: config.senderEmail }, googleApi });

  expect(await provider.validateConfiguration()).toEqual({ valid: false, code: 'PROVIDER_CONFIGURATION_INVALID' });
  await expect(provider.send({ id: 'notification-2', channel: 'email', to: 'family@example.test', text: 'Hello' }))
    .rejects.toMatchObject({ code: 'PROVIDER_CONFIGURATION_INVALID', retryable: false });
  expect(googleApi.gmail).not.toHaveBeenCalled();
});

test('Gmail adapter sanitizes provider failures and marks temporary transport errors retryable', async () => {
  const send = jest.fn(async () => { const error = new Error('contains private provider response'); error.code = 503; throw error; });
  const provider = createGmailProvider({ config, googleApi: fakeGoogleApi({ send }) });

  await expect(provider.send({ id: 'notification-3', channel: 'email', to: 'family@example.test', text: 'Hello' }))
    .rejects.toMatchObject({ code: 'GMAIL_API_503', retryable: true, message: 'The email provider rejected or could not accept the message.' });
});
