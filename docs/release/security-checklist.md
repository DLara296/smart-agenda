# Production Security Checklist

## Current Audit Risks

- [x] **P0:** Restrict guest `GET /v1/sessions` through family-linked session history.
- [x] **P0:** Fail closed in production and disable development-admin/demo seeding.
- [x] **P0:** Require explicit durable database and security configuration in production.
- [ ] **P1:** Authentication and invitation rate limits are implemented; limits for notification and other sensitive writes remain under review.
- [x] **P1:** Implement full invitation acceptance/account-linking lifecycle with cryptographic single-use tokens and validated future expiry. Acceptance creates the account from the invitation's stored identity/scope, records the accepted user, grants coordinator school membership, creates a session, and is covered by SQLite/PostgreSQL tests. Invitation delivery remains an operator responsibility; no email is sent by the application.
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

## Authorization Route Matrix

| Data surface | Admin | Coordinator | Guest | Regression evidence |
|---|---|---|---|---|
| Account/profile/preferences | Own authenticated account | Own authenticated account | Own authenticated account | `authentication.test.js`, `auth-boundary.test.js` |
| Family directory and admin family detail | All families | Denied for directory/admin detail | Own family only through self/detail routes | `family-list.test.js`, `auth-boundary.test.js`, `session-history.test.js` |
| Family children | Any family | Only families in actively assigned schools | Own family only | `coordinator-school-authorization.test.js`, `session-history.test.js` |
| School list and grade/group catalogs | All active schools/catalogs | Active membership schools/catalogs | Active public catalogs for onboarding | `coordinator-school-authorization.test.js`, `admin-schools.test.js` |
| Teacher directory | All schools; optional school filter | Requires an assigned school filter | Denied | `coordinator-school-authorization.test.js` |
| Student directory | All students | Students in active membership schools | Denied | `coordinator-school-authorization.test.js` |
| Session list and dashboard | All schools | Active membership schools | `/v1/sessions` only returns family-linked grade history; dashboard denied | `coordinator-school-authorization.test.js`, `session-history.test.js` |
| Session detail, assignments, and per-session history | All schools | Active membership school of the session | Denied | `coordinator-school-authorization.test.js`, `session-flow.test.js` |
| Calendar/history endpoint | School-wide; no child records | Active membership schools; no child records | Own family's linked grades and children only | `coordinator-school-authorization.test.js`, `postgres-database.test.js`, `session-history.test.js`, frontend History/Calendar tests |
| Notification recipients, groups, history, send, retry, cancel | Any active school | Active membership school; object school must match requested school | Denied | `coordinator-school-authorization.test.js`, `notification-groups.test.js`, `notification-delivery.test.js` |
| Search/export endpoints | No server-side search/export routes exist; calendar export is a client-generated link from an already authorized session | Same | Same | Route inventory in `packages/backend/src/app.js`; calendar export tests |

All school-scoped coordinator reads and writes derive access from active `user_school_memberships`; changing a request-supplied `schoolId` does not grant access. Guest family scope is derived from the authenticated session, not query parameters. Admin-only routes use explicit role guards. This matrix records current intended behavior; the unchecked checklist items above still require full security review and launch approval.

## Notification-Specific Gate

No Email/SMS/WhatsApp provider may be activated until recipient consent/suppression, data minimization, school scope, provider security, sender identity, region, credential rotation, error redaction, bounded retries, and audit history are approved and tested. Until then, UI/API fail closed and explicitly report that no message was sent.
