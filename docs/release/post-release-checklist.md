# Post-Release Verification Checklist

## Immediately After Deployment

- [ ] Open production URL over HTTPS and verify static assets.
- [ ] Backend readiness reports app and database readiness, not just process liveness.
- [ ] Sign in with dedicated production test admin; verify logout and session persistence.
- [ ] Verify admin/coordinator/guest authorization and cross-family denial.
- [ ] Create/view a test school/session using dedicated non-sensitive test records.
- [ ] Verify session uniqueness and cancellation/history behavior.
- [ ] Verify backup job ran and backup artifact is recoverable.
- [ ] Verify notifications remain blocked unless a provider/channel has passed approval and smoke checks; never treat queued or simulated as delivered.
- [ ] Confirm logs/metrics/alerts are receiving events and do not expose secrets/contact data.
- [ ] Confirm frontend/backend versions and migration level match release record.

## Monitoring Window

- [ ] Review 4xx/5xx rates and p95 latency.
- [ ] Review auth failures, access-denied anomalies, and account provisioning.
- [ ] Review DB availability, size, disk, locks, and backup completion.
- [ ] Review upload/storage errors and capacity if enabled.
- [ ] Review job/queue lag and provider attempts only for approved channels.
- [ ] Confirm critical alert delivery to named on-call owner.
- [ ] Capture user-reported defects and assign severity/owner.

## Closeout

- [ ] Confirm rollback remains available for the release window.
- [ ] Record incidents, user impact, provider status, backup/restore checks, and follow-up work.
- [ ] Revoke temporary staging/production test credentials and rotate any shared setup secrets.
- [ ] Hold post-release review and update release notes, runbooks, audit, and task status.
