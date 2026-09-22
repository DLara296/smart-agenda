# Observability and Operations

## Logging
- Use structured JSON logs for API requests, background jobs, and notification delivery events.
- Include correlation IDs for request tracing.
- Do not log raw sensitive values.

## Metrics
- Track request latency, error rate, queue depth, notification delivery status, and missed coverage events.
- Expose metrics for onboarding, session activity, and critical scheduling jobs.

## Alerting
- Trigger alerts on queue buildup, notification failure spikes, or invalid invite usage.
- Alert on missing volunteer coverage that exceeds configured thresholds.

## Operational Review
- Review failed jobs and delivery attempts at a regular cadence.
- Confirm backups, migrations, and user activity audits are current.

## Runbook Guidance
- Document the recovery path for each external provider failure.
- Provide manual or fallback handling for notification outages and database issues.
