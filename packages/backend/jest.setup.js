const Test = require('supertest/lib/test');

// supertest's ephemeral servers listen on the dual-stack wildcard but it connects to 127.0.0.1:<port>.
// On macOS another local process (editor, browser) may own that IPv4 port and answer instead,
// causing sporadic "Parse Error: Expected HTTP/" failures. ::1 always reaches the test server.
const originalServerAddress = Test.prototype.serverAddress;
Test.prototype.serverAddress = function serverAddressOnIpv6Loopback(app, path) {
  return originalServerAddress.call(this, app, path).replace('://127.0.0.1:', '://[::1]:');
};
