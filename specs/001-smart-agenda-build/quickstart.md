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
