# Notification Delivery Contract

## Capability and Interim UI

Until a channel is enabled by a validated provider configuration, selecting that channel for an individual recipient or saved group must:

- Show an accessible status message: `Delivery is not implemented yet. No message was sent.`
- Keep the selected channel visible so the user understands what is unavailable.
- Disable submission for a recipient selection containing an unavailable channel.
- Avoid calling `POST /v1/notifications` for that selection.
- Be enforced by the backend as well as the UI. An unsupported channel request returns `CHANNEL_UNAVAILABLE` and creates no notification row.

A channel is enabled only after its adapter configuration has been validated at startup or by an explicit readiness check. A fake adapter is labeled simulated and can never be reported as a real delivery.

The V1 Email adapter uses Gmail API `users.messages.send` with OAuth2 scope `https://www.googleapis.com/auth/gmail.send` (send-only). It does not use Gmail SMTP's broader `https://mail.google.com/` scope. The configured sender account must match the approved Google account/send-as identity.

Capabilities are runtime-derived and fail closed per channel. Without complete Gmail OAuth configuration, Email reports disabled; SMS and WhatsApp always report disabled. A direct request for an unavailable channel returns HTTP `503` with `error.code = CHANNEL_UNAVAILABLE` and `Delivery for {channel} is not implemented yet. No message was sent.` No notification row is created. If configured OAuth credentials fail token validation, Email remains unavailable and the readiness endpoint reports it disabled.

## Queue Request

`POST /v1/notifications` accepts only channels enabled by the backend configuration. The backend authorizes the school, resolves canonical recipient identity and current destination, checks active membership and consent/suppression, then persists idempotent queue records.

```json
{
  "schoolId": "school-uuid",
  "recipients": [
    { "groupId": "group-uuid" },
    { "id": "guardian-uuid", "type": "guardian", "channel": "email" }
  ],
  "message": "Reading session reminder",
  "idempotencyKey": "client-generated-uuid"
}
```

A successful response represents queue acceptance only:

```json
{
  "data": {
    "status": "queued",
    "notificationIds": ["notification-uuid"],
    "recipientCount": 1,
    "unavailableCount": 0
  }
}
```

No success text or UI state may claim `sent` or `delivered` based only on this response.

## Provider/Worker Boundary

The worker dispatches due notifications through an adapter selected by the configured channel/provider. The worker must:

1. Atomically claim eligible queued rows so concurrent workers cannot send the same row simultaneously. A claim that remains `sending` beyond the recovery threshold becomes failed with `DELIVERY_OUTCOME_UNKNOWN`; it is not automatically requeued because Gmail API does not guarantee request idempotency.
2. Re-resolve the canonical destination and current school membership at send time.
3. Check the approved channel consent and suppression policy before provider invocation.
4. Pass a stable idempotency reference when supported by the provider. Gmail API does not guarantee deduplication for repeated `users.messages.send` calls; a deterministic `Message-ID` header is diagnostic only, not provider idempotency.
5. Persist one `NotificationAttempt` for each actual provider invocation, including accepted/delivered/retryable/permanent/simulated outcome and a sanitized failure code.
6. Store provider message IDs and timestamps without storing a duplicate destination or message body in attempt records.
7. Mark the notification `sent` only on Gmail API provider acceptance. Gmail API send acceptance is not a delivery receipt; do not mark Gmail messages `delivered` without a separately approved delivery-confirmation mechanism. Persist failures and cancellation states independently.
8. Retry only eligible retryable failures using a bounded attempt limit and backoff. Never dispatch a cancelled or consent-suppressed notification.

The V1 vendor/sender direction is Gmail API OAuth2 for `david.lara170385@gmail.com`, for an initial Mexico market. Product/legal review must confirm provider processing terms because Mexico is not a strict Google data-residency guarantee. Enable Gmail API, configure the Google OAuth consent screen and server/web OAuth client, and obtain an offline refresh token granting the send-only scope. Google app verification/publishing and refresh-token expiry rules must be met before production use. OAuth client secrets and refresh tokens are deployment secrets, never request payloads or committed files.

## School-Scoped History and Actions

Notification list queries require a school ID and omit raw destination values, provider credentials, and message bodies. Cross-school reads and mutations are denied. The current application has no coordinator-to-school assignment model, so notification list, retry, cancel, and recipient-management routes are administrator-only; coordinator access is a release-blocking follow-up, not implied by role. Individual mutations require an audit record with actor, notification ID, action, timestamp, and attempt reference where applicable.

## Expected Error Semantics

- `CHANNEL_UNAVAILABLE`: channel adapter is not enabled; no queue record is created.
- `RECIPIENT_UNAVAILABLE`: recipient is inactive, outside the authorized school, lacks current contact data, or is suppressed by consent policy; no delivery is attempted.
- `INVALID_NOTIFICATION_STATE`: resend/cancel is not allowed from the current state.
- `PROVIDER_CONFIGURATION_INVALID`: adapter readiness check fails; channel remains disabled.
- `DELIVERY_OUTCOME_UNKNOWN`: a provider call may have been accepted before the worker lost its claim; inspect through an approved operational process before manual retry.

Provider errors returned to clients are sanitized. Detailed safe failure codes are retained in attempt records; raw provider payloads, credentials, contact addresses, and message bodies are not logged.
