# Quickstart: Smart Agenda MVP

## Local Setup

### Prerequisites
- Node.js 18+
- npm 9+
- Git

### Install dependencies

```bash
npm install
npm run install:all
```

### Start the application

```bash
npm start
```

This runs the frontend and backend in the workspace concurrently.

## Backend Validation

Run the backend tests:

```bash
npm run test:backend
```

Target checks:
- session creation
- volunteer coverage validation
- duplicate assignment protection
- notification status progression
- authorization boundaries

## Frontend Validation

Run the frontend tests:

```bash
npm run test:frontend
```

Target checks:
- dashboard rendering
- form validation
- session status displays
- cancellation and replacement UI flows
- guest access restriction messaging

## Notification Delivery Readiness

Until a provider is approved and enabled, use the frontend to open Send Notification and select Email, SMS, and WhatsApp individually. Each unsupported selection must show `Delivery is not implemented yet. No message was sent.`, prevent submission, and leave the backend notification count unchanged. Group planning may be saved independently, but selecting an unavailable group channel must also prevent sending.

Automated checks for the interim behavior:

```bash
npm test --workspace=frontend -- --runInBand src/__tests__/ActionForm.test.js
npm test --workspace=backend -- --runInBand __tests__/integration/notification-groups.test.js
```

The V1 Gmail API adapter and worker use a fake provider in automated integration tests. Run the backend suite to verify provider acceptance, retryable/permanent failure, bounded retries, duplicate worker claims, cancellation, consent suppression, cross-school history/resend/cancel denial, OAuth-disabled capabilities, and migration upgrades. A Gmail API acceptance is not confirmed inbox delivery. Production credentials are not needed for fake-provider tests and must never be committed.

See [contracts/notification-delivery.md](contracts/notification-delivery.md) and [data-model.md](data-model.md) for the state and attempt expectations.

## Critical Validation Flow

The core path to validate before release:
1. create school and grading structure
2. register family and child records
3. create reading session
4. validate coverage gaps
5. assign volunteer
6. trigger reminder or teacher notification
7. handle cancellation and replacement
8. confirm session completion and history retention
9. verify guest cannot access unrelated family data

## Environment Notes

- Use a local SQLite database for starter workflows.
- Store secrets in environment variables, not source control.
- Keep provider credentials in sandbox/test mode during MVP validation.
- Use mock or stub providers for notification automation tests.

## Definition of Done for Local Validation

Do not consider the project ready until:
- all targeted unit tests pass
- the critical session flow passes in integration tests
- the dashboard renders required operational alerts
- authorization checks deny unrelated guest access
- the app builds successfully in the workspace
