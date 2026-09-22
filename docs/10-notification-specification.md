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

## WhatsApp Wishlist
Automatic parsing of WhatsApp replies is not required for MVP. Future work should include a human-in-the-loop review model with webhook ingestion, sender mapping, confidence scores, and manual assignment approval step. Platform limitations, privacy constraints, and fallback paths must be documented before implementation.
