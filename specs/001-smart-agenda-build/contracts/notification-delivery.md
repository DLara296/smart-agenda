# Notification Delivery Contract

## Capability and Interim UI

Until a channel is enabled by a validated provider configuration, selecting that channel for an individual recipient or saved group must:

- Show an accessible status message: `Delivery is not implemented yet. No message was sent.`
- Keep the selected channel visible so the user understands what is unavailable.
- Disable submission for a recipient selection containing an unavailable channel.
- Avoid calling `POST /v1/notifications` for that selection.
- Be enforced by the backend as well as the UI. An unsupported channel request returns `CHANNEL_UNAVAILABLE` and creates no notification row.

A channel is enabled only after its adapter configuration has been validated at startup or by an explicit readiness check. A fake adapter is labeled simulated and can never be reported as a real delivery.

The current backend capability list is empty and fails closed. Direct requests for Email, SMS, or WhatsApp return HTTP `503` with `error.code = CHANNEL_UNAVAILABLE` and the message `Delivery for {channel} is not implemented yet. No message was sent.` No notification row is created.

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

1. Atomically claim eligible queued rows so concurrent workers cannot send the same row simultaneously.
2. Re-resolve the canonical destination and current school membership at send time.
3. Check the approved channel consent and suppression policy before provider invocation.
4. Pass a stable idempotency reference when supported by the provider.
5. Persist one `NotificationAttempt` for each actual provider invocation, including accepted/delivered/retryable/permanent/simulated outcome and a sanitized failure code.
6. Store provider message IDs and timestamps without storing a duplicate destination or message body in attempt records.
7. Mark the notification `sent` only on provider acceptance; mark `delivered` only when delivery is confirmed by a provider callback/status query. Persist failures and cancellation states independently.
8. Retry only eligible retryable failures using a bounded attempt limit and backoff. Never dispatch a cancelled or consent-suppressed notification.

Vendor choice, sender setup, regions, credentials, and consent requirements are deployment prerequisites. Secrets are supplied through environment/deployment secret storage, never request payloads or committed files.

## School-Scoped History and Actions

Notification list, retry, cancel, and worker claim operations must enforce the authenticated actor's school scope. Queries are paginated and omit raw destination values, provider credentials, and message bodies unless a separate permission and product requirement explicitly authorizes message display. Individual mutations require an audit record with actor, notification ID, action, timestamp, and attempt reference where applicable.

## Expected Error Semantics

- `CHANNEL_UNAVAILABLE`: channel adapter is not enabled; no queue record is created.
- `RECIPIENT_UNAVAILABLE`: recipient is inactive, outside the authorized school, lacks current contact data, or is suppressed by consent policy; no delivery is attempted.
- `INVALID_NOTIFICATION_STATE`: resend/cancel is not allowed from the current state.
- `PROVIDER_CONFIGURATION_INVALID`: adapter readiness check fails; channel remains disabled.

Provider errors returned to clients are sanitized. Detailed safe failure codes are retained in attempt records; raw provider payloads, credentials, contact addresses, and message bodies are not logged.
