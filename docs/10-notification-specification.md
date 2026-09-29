# Notification Specification

## Goals
Power volunteer requests, teacher notifications, reminders, replacement notices, and cancellation notices using a provider abstraction. The business logic must be independent of email, SMS, or WhatsApp vendor APIs.

## Provider Interface
```text
NotificationService
  ├── EmailProvider
  ├── SmsProvider
  └── WhatsAppProvider
```

Each provider implements:
- send(message)
- validateConfiguration()
- getStatus(messageId)
- retry(message)

## Message Types
- Volunteer request
- Volunteer confirmation or cancellation
- Teacher confirmation notice
- Missing volunteer reminder
- Replacement notice
- Session cancellation notice

## Message States
- Queued
- Sent
- Delivered
- Failed
- Retried
- Cancelled

## Scheduling
- Notifications should be queued with scheduled times and explicit conversion to provider payloads.
- Delay offsets must be configurable per environment.
- Deduplication and idempotency must protect against duplicate sends.

## Delivery Requirements
- Maintain a record of each send attempt and related metadata.
- Retry only when the provider or transport supports it safely.
- Keep vendor failures visible without exposing internal system details to end users.

## Recipient Groups
- Admins can save school-scoped notification groups with a required name, one channel (`sms`, `whatsapp`, or `email`), and references to existing guardians or teachers.
- Group membership uses foreign keys to the canonical guardian and teacher records; deleting a group removes memberships only. Guardian phone numbers are stored on the guardian record, not copied into group membership.
- Group names are unique within a school, without case sensitivity. Group management and recipient lookup require the admin role.
- Email requires a valid email address. SMS and WhatsApp require a usable phone number. Member eligibility is checked when saving/editing a group and resolved again when queueing a notification.
- `GET /v1/notification-recipients?schoolId=...` and `GET /v1/notification-groups?schoolId=...` return contact names and channel eligibility, not raw email addresses or phone numbers. Group create/update/delete use `POST`, `PATCH`, and `DELETE /v1/notification-groups`.
- `POST /v1/notifications` requires a school, message, and at least one group or individual recipient reference. The backend resolves canonical contact data, skips group members that are no longer eligible, deduplicates by identity and channel, then creates a separate queued notification per valid recipient.
- The current notification service queues and tracks records; it does not invoke an external delivery provider. A queued response is not confirmation of delivery. Provider delivery and per-attempt outcomes remain dependent on a future transport integration.

## WhatsApp Wishlist
Automatic parsing of WhatsApp replies is not required for MVP. Future work should include a human-in-the-loop review model with webhook ingestion, sender mapping, confidence scores, and manual assignment approval step. Platform limitations, privacy constraints, and fallback paths must be documented before implementation.
