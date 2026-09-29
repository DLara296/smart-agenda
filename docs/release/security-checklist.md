# Production Security Checklist

## Current Audit Risks

- [ ] **P0:** Restrict `GET /v1/sessions`; current guest role receives an unscoped session list.
- [ ] **P0:** Fail closed in production; current app creates a development admin using a known fallback password when environment is not exactly production.
- [ ] **P0:** Require explicit durable database configuration; default is in-memory SQLite.
- [ ] **P1:** Add rate limiting and abuse controls for registration, sign-in, invitation, and sensitive writes.
- [ ] **P1:** Implement full invitation acceptance/account-linking lifecycle with cryptographic single-use tokens.
- [ ] **P1:** Define and enforce recipient channel consent/opt-out before any real notification dispatch.
- [ ] **P2:** Configure explicit CORS origins and credential behavior; evaluate CSRF for cookie-authenticated writes.
- [ ] **P2:** Add production security headers and review reverse proxy/TLS behavior.
- [ ] **P2:** Review public account verification, recovery, session revocation, and admin provisioning flows.

## Required Verification Before V1

- [ ] Every read/write route has an authorization matrix and tests for admin, coordinator, and guest.
- [ ] Cross-family and cross-school data-access denial tests cover list, detail, history, search, and export APIs.
- [ ] Production startup rejects development credentials, demo seeding, missing DB, and invalid security config.
- [ ] Session cookie has reviewed `HttpOnly`, `Secure`, `SameSite`, path, expiry, and revocation behavior on actual domains.
- [ ] CORS accepts only approved origins; credentialed requests are tested end-to-end.
- [ ] CSRF strategy is documented/tested for cookies.
- [ ] Login/register/invitation endpoints have rate limits and safe lockout/abuse behavior.
- [ ] Request schemas, content types, file/image types/sizes, identifiers, and state transitions are validated.
- [ ] Errors disclose no stack traces, SQL, session tokens, invitation tokens, or provider details.
- [ ] Logs avoid passwords, tokens, contact data, student-sensitive fields, and full notification payloads.
- [ ] A dedicated secret scanner scans current files and git history; any exposed secret is revoked/rotated.
- [ ] Upload access, persistence, privacy, size limits, and cleanup are reviewed.
- [ ] Dependency audit and supported Node/runtime versions are documented and run in CI.
- [ ] Security review/penetration testing is performed at a depth approved for the data sensitivity and launch scope.

## Notification-Specific Gate

No Email/SMS/WhatsApp provider may be activated until recipient consent/suppression, data minimization, school scope, provider security, sender identity, region, credential rotation, error redaction, bounded retries, and audit history are approved and tested. Until then, UI/API fail closed and explicitly report that no message was sent.
