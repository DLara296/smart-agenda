function createSandboxProvider() {
  const statuses = new Map();
  return {
    async send(message) {
      const providerMessageId = `sandbox-${message.id}`;
      statuses.set(providerMessageId, 'sent');
      return { status: 'sent', providerMessageId };
    },
    async validateConfiguration() { return true; },
    async getStatus(providerMessageId) { return statuses.get(providerMessageId) || 'unknown'; },
    async retry(message) { return { status: 'queued', messageId: message.id }; },
  };
}

module.exports = { createSandboxProvider };
