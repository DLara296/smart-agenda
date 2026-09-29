const { google } = require('googleapis');
const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function createGmailProvider({ config = {}, googleApi = google } = {}) {
  const senderEmail = String(config.senderEmail || '').trim().toLowerCase();
  const oauthClientId = config.oauthClientId;
  const oauthClientSecret = config.oauthClientSecret;
  const oauthRefreshToken = config.oauthRefreshToken;
  const configured = isEmail(senderEmail) && Boolean(oauthClientId && oauthClientSecret && oauthRefreshToken);
  let oauthClient = null;
  let gmailClient = null;

  function clients() {
    if (!configured) {
      const error = new Error('Gmail OAuth2 configuration is incomplete.');
      error.code = 'PROVIDER_CONFIGURATION_INVALID';
      error.retryable = false;
      throw error;
    }
    if (!oauthClient) {
      oauthClient = new googleApi.auth.OAuth2(oauthClientId, oauthClientSecret);
      oauthClient.setCredentials({ refresh_token: oauthRefreshToken });
    }
    if (!gmailClient) gmailClient = googleApi.gmail({ version: 'v1', auth: oauthClient });
    return { oauthClient, gmailClient };
  }

  async function validateConfiguration({ verifyConnection = false } = {}) {
    if (!configured) return { valid: false, code: 'PROVIDER_CONFIGURATION_INVALID' };
    if (!verifyConnection) return { valid: true, verified: false };
    try {
      const { oauthClient: client } = clients();
      const credentials = await client.getAccessToken();
      return credentials?.token
        ? { valid: true, verified: true }
        : { valid: false, verified: true, code: 'GMAIL_OAUTH_TOKEN_UNAVAILABLE' };
    } catch (error) {
      return { valid: false, verified: true, code: sanitizeFailureCode(error) };
    }
  }

  async function send(message) {
    if (message.channel !== 'email') {
      const error = new Error('Gmail provider only supports Email.');
      error.code = 'CHANNEL_UNSUPPORTED';
      error.retryable = false;
      throw error;
    }
    if (!isEmail(message.to) || !String(message.text || '').trim()) {
      const error = new Error('Email recipient and text content are required.');
      error.code = 'INVALID_EMAIL_MESSAGE';
      error.retryable = false;
      throw error;
    }
    try {
      const { gmailClient } = clients();
      const raw = toRawMessage({
        from: senderEmail,
        to: message.to,
        subject: message.subject || 'SmartAgenda notification',
        text: message.text,
        messageId: message.id,
      });
      const result = await gmailClient.users.messages.send({ userId: 'me', requestBody: { raw } });
      return { status: 'accepted', providerMessageId: result.data?.id || null };
    } catch (error) {
      const normalized = new Error('The email provider rejected or could not accept the message.');
      normalized.code = sanitizeFailureCode(error);
      normalized.retryable = isRetryable(error);
      throw normalized;
    }
  }

  return { key: 'gmail-api-oauth2', channel: 'email', senderEmail, scope: GMAIL_SEND_SCOPE, validateConfiguration, send };
}

function toRawMessage({ from, to, subject, text, messageId }) {
  const senderDomain = from.slice(from.lastIndexOf('@') + 1);
  const safeMessageId = String(messageId || 'notification').replace(/[^A-Za-z0-9._-]/g, '-');
  const safeSubject = String(subject || 'SmartAgenda notification').replace(/[\r\n]+/g, ' ').slice(0, 180);
  const encodedSubject = /^[\x20-\x7E]*$/.test(safeSubject) ? safeSubject : `=?UTF-8?B?${Buffer.from(safeSubject, 'utf8').toString('base64')}?=`;
  const mime = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    `Message-ID: <${safeMessageId}@${senderDomain}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(String(text), 'utf8').toString('base64').replace(/.{1,76}/g, '$&\r\n').trim(),
  ].join('\r\n');
  return Buffer.from(mime, 'utf8').toString('base64url');
}

function sanitizeFailureCode(error) {
  const status = Number(error?.response?.status || error?.code || 0);
  if (status >= 400 && status <= 599) return `GMAIL_API_${status}`;
  const code = String(error?.code || 'GMAIL_API_ERROR').toUpperCase();
  return /^[A-Z0-9_]{1,40}$/.test(code) ? code : 'GMAIL_API_ERROR';
}

function isRetryable(error) {
  if (typeof error?.retryable === 'boolean') return error.retryable;
  const status = Number(error?.response?.status || error?.code || 0);
  if (status === 429 || status >= 500) return true;
  if (status >= 400) return false;
  return ['ETIMEDOUT', 'ECONNECTION', 'ECONNRESET', 'ESOCKET', 'EDNS', 'EAI_AGAIN'].includes(String(error?.code || ''));
}

module.exports = { GMAIL_SEND_SCOPE, createGmailProvider, isEmail, isRetryable, sanitizeFailureCode, toRawMessage };
