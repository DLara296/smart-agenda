# Observability and Operations

## Logging
- Use structured JSON logs for API requests, background jobs, and notification delivery events.
- Include correlation IDs for request tracing.
- Do not log raw sensitive values.
- Record actor role, entity type, entity ID, action, and provenance in audit records.
- Never log invitation tokens, child dates of birth, guardian contact values, or notification payloads.

## Metrics
- Track request latency, error rate, queue depth/age, notification attempt outcomes, provider configuration readiness, and missed coverage events.
- Distinguish queued, sending, accepted/sent, failed, suppressed, and cancelled counts. Gmail API acceptance is not inbox delivery confirmation.
- Expose metrics for onboarding, session activity, and critical scheduling jobs.
- Metrics and logs must not contain recipient addresses, message bodies, OAuth tokens, or raw provider responses.

## Alerting
- Trigger alerts on queue buildup, notification failure spikes, repeated OAuth refresh/configuration failures, stale `sending` rows, or invalid invite usage.
- Alert on missing volunteer coverage that exceeds configured thresholds.
- Assign an operational owner and test alert delivery in staging before production approval.

## Operational Review
- Review failed jobs and delivery attempts at a regular cadence. Check sanitized failure codes and attempt history, not raw payloads.
- Confirm backups, migrations, and user activity audits are current.
- Review missing-volunteer attention items and failed provider sends before each reading cycle.
- Verify Gmail OAuth readiness after credential rotation and periodically before a planned notification cycle.

## Notification Recovery
- For invalid OAuth configuration or refresh failure, keep Email disabled, verify Gmail API enablement, consent-screen publishing status, sender identity, and secret-manager values, then rotate/revoke and provision credentials through the approved operator process. Do not retry by pasting secrets into logs or support tickets.
- For a transient provider failure, inspect the persisted attempt and scheduled retry time. The worker uses bounded exponential backoff; manually resend only a failed notification after checking recipient consent and avoiding an unsafe duplicate.
- A stale `sending` claim is failed with `DELIVERY_OUTCOME_UNKNOWN` and an audit event rather than automatically requeued, because Gmail API does not guarantee request idempotency. Check the recipient inbox through an approved operational process before an administrator manually resends; the history UI displays this warning.
- For revoked consent or inactive/out-of-school recipients, the worker suppresses dispatch. Correct the canonical contact/consent through the normal application flow; do not alter notification history to bypass suppression.
- A `sent` state means Gmail accepted the API request. Verify inbox receipt separately with the dedicated staging recipient; the application has no delivery-receipt integration.
- SMS and WhatsApp are intentionally unavailable. Use the approved non-application communication process during an outage.

## Runbook Guidance
- Document the recovery path for each external provider failure.
- Provide manual or fallback handling for notification outages and database issues.
- Notification actions are currently administrator-only because coordinator-to-school membership is not modeled; do not broaden roles until school-scoped authorization tests pass.
