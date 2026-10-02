# Production Security Checklist

## Current Audit Risks

- [x] **P0:** Restrict guest `GET /v1/sessions` through family-linked session history.
- [x] **P0:** Fail closed in production and disable development-admin/demo seeding.
- [x] **P0:** Require explicit durable database and security configuration in production.
- [ ] **P1:** Authentication and invitation rate limits are implemented; limits for notification and other sensitive writes remain under review.
- [ ] **P1:** Implement full invitation acceptance/account-linking lifecycle with cryptographic single-use tokens.
- [ ] **P1:** Define and enforce recipient channel consent/opt-out before any real notification dispatch.
- [x] **P2:** Require one canonical HTTPS frontend origin, credentialed CORS, and exact-origin checks for unsafe cookie-authenticated requests.
- [ ] **P2:** Helmet security headers are implemented; reverse proxy/TLS behavior still requires staging review.
- [ ] **P2:** Review public account verification, recovery, session revocation, and admin provisioning flows.

## Required Verification Before V1

- [ ] Every read/write route has an authorization matrix and tests for admin, coordinator, and guest.
- [ ] Cross-family and cross-school data-access denial tests cover list, detail, history, search, and export APIs.
- [x] Production startup rejects development credentials, demo seeding, missing DB, and invalid security config.
- [ ] Session cookie has reviewed `HttpOnly`, `Secure`, `SameSite`, path, expiry, and revocation behavior on actual domains.
- [x] CORS accepts only the configured HTTPS origin and credentialed requests have production-like integration coverage.
- [x] Unsafe production requests require the configured origin as the cookie-authentication CSRF defense.
- [x] Login, registration, invitation issuance, and invitation acceptance use bounded per-IP rate limits and a stable 429 response.
- [ ] Request schemas, content types, file/image types/sizes, identifiers, and state transitions are validated.
- [ ] Errors disclose no stack traces, SQL, session tokens, invitation tokens, or provider details.
- [ ] Logs avoid passwords, tokens, contact data, student-sensitive fields, and full notification payloads.
- [ ] A dedicated secret scanner scans current files and git history; any exposed secret is revoked/rotated.
- [ ] Upload access, persistence, privacy, size limits, and cleanup are reviewed.
- [ ] CI rejects critical production dependency advisories on Node 20; remaining high/moderate CRA toolchain findings require a separately tested migration plan.
- [ ] Security review/penetration testing is performed at a depth approved for the data sensitivity and launch scope.

## Notification-Specific Gate

No Email/SMS/WhatsApp provider may be activated until recipient consent/suppression, data minimization, school scope, provider security, sender identity, region, credential rotation, error redaction, bounded retries, and audit history are approved and tested. Until then, UI/API fail closed and explicitly report that no message was sent.
