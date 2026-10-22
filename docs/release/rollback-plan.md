# Production Rollback and Recovery Plan

**Status:** Design only; host, database, and deployment tooling are not selected. Replace these procedures with provider-specific commands after architecture approval and rehearse them in staging.

## Preconditions

- Known-good frontend/backend release identifiers and configuration snapshot.
- Verified pre-release database backup with tested restore instructions.
- Named release operator and rollback authority.
- Migration compatibility decision (application rollback is not assumed to imply schema rollback).
- Monitoring/health endpoint and smoke-test owner.

## Stop Conditions

Stop rollout and consider rollback when any critical condition occurs:
- health/readiness fails or DB connectivity is unstable;
- sign-in, session creation, scoped access, or data integrity smoke tests fail;
- unexpected authorization/data exposure is detected;
- migration errors, unexplained data loss, or elevated 5xx rates occur;
- required external integration causes unsafe duplicate or misdirected actions.

## Frontend Rollback

1. Stop further rollout.
2. Restore previous known-good static artifact/deployment alias.
3. Verify HTTPS, API routing, asset loading, and authentication from a fresh browser session.
4. Confirm current backend remains compatible with the previous frontend.

## Backend Rollback

1. Stop or drain new requests/background workers.
2. Restore previous application artifact and known-good configuration.
3. Restart one instance and verify DB readiness and migration compatibility.
4. Re-enable traffic and inspect errors, queue lag, and audit events.

## Database Recovery

- Do not automatically reverse a destructive migration.
- If data corruption/loss is suspected, stop writers, preserve current files/logs, select the approved recovery point, restore to an isolated instance first, validate integrity and scope constraints, then switch traffic only with approval.
- Record recovery point, data-loss window, RPO/RTO, operator, approvals, integrity results, and follow-up actions.
- If schema is forward-only, use a reviewed corrective migration and compatible previous application release rather than blind rollback.

## Configuration and External Services

Restore the previous versioned non-secret config, then reattach secret-manager versions. Revoke compromised or incompatible provider credentials. If a required external service fails, disable that channel safely and confirm the UI/API report unavailable rather than marking queued records as sent.

## Rehearsal Requirements

Before production, rehearse frontend rollback, backend rollback, migration failure recovery, DB restore, and secret/config rollback in staging. Capture timings and update this document with host-specific steps; “redeploy and hope” is not an accepted recovery plan.
