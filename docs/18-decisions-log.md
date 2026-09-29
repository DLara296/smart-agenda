# Decisions Log

## ADR-001: Monolith over microservices for MVP
Decision: Use a modular monolith for the initial product.
Rationale: The domain is complex but still manageable within a single deployable system, and premature service decomposition would increase operational overhead without clear benefit.

## ADR-002: Relational database as source of truth
Decision: Use a relational database for core domain records.
Rationale: The system needs explicit relationships across schools, grades, groups, teachers, students, families, and assignments.

## ADR-003: Notification abstraction
Decision: Business logic must interact with a notification abstraction instead of direct vendor APIs.
Rationale: This prevents business rules from becoming tightly coupled to vendor-specific delivery mechanics and better supports retries, status tracking, and future provider changes.

## ADR-004: Provider-first SMS and WhatsApp strategy
Decision: Support email-first launch with provider abstraction for SMS and WhatsApp, using mocks or sandboxes until production credentials and feasibility are confirmed.
Rationale: This avoids pretending production delivery works before provider approval and implementation review.

## ADR-005: Privacy-first guest access
Decision: Guests and family accounts default to least privilege and explicit authorization boundaries.
Rationale: Child and family data are sensitive and the product needs to minimize exposure by default.

## ADR-006: Email-first production notification scope
Decision: V1 notification delivery targets Email only, using the Gmail API with OAuth2 and the send-only `https://www.googleapis.com/auth/gmail.send` scope; `david.lara170385@gmail.com` is the requested sender. This is subject to Google account eligibility, sender verification, OAuth consent-screen/app verification, legal/provider review, and successful staging verification. SMS and WhatsApp remain disabled. Mexico is the initial user/market scope, not a strict data-residency commitment; Google may process email outside Mexico and that handling requires review. Guest accounts remain in V1; Google/Facebook sign-in is deferred.
Consent: Email dispatch requires explicit opt-in for each guardian or teacher. Missing, revoked, or unverified consent suppresses delivery. The application must store consent provenance and revocation history, not infer recipient consent from a user's session-reminder preferences.
Credential boundary: `GMAIL_SENDER_EMAIL`, `GMAIL_OAUTH_CLIENT_ID`, `GMAIL_OAUTH_CLIENT_SECRET`, and `GMAIL_OAUTH_REFRESH_TOKEN` configure the sender. OAuth client secrets and refresh tokens must be entered directly into a deployment secret manager. No credentials are stored in source control or sent in chat. Email remains disabled until runtime configuration validates and a real staging send/response is verified. Google OAuth consent must grant only the Gmail send scope; an external OAuth app may require Google verification, and a Testing-mode refresh token may expire. Complete Google's consent/app verification requirements before launch.
Rationale: The user approved an Email-only initial delivery scope. Keeping other channels disabled limits production complexity while preserving an auditable consent and provider boundary.
