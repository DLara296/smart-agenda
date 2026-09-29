# API Contracts and Message Contracts

## Core REST API Contract

### Authentication

#### POST /v1/auth/login
Request:
```json
{
  "email": "coordinator@school.org",
  "password": "SecurePass123!"
}
```

Response:
```json
{
  "token": "jwt-token",
  "user": {
    "id": "uuid",
    "role": "coordinator",
    "schoolId": "uuid"
  }
}
```

### Schools

#### GET /v1/schools
Response:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Westfield Elementary",
      "status": "active"
    }
  ],
  "pagination": {
    "limit": 25,
    "offset": 0,
    "total": 1
  }
}
```

#### POST /v1/schools
Request:
```json
{
  "name": "Westfield Elementary",
  "timezone": "America/New_York",
  "locale": "en-US"
}
```

### Families

#### POST /v1/families
Request:
```json
{
  "displayName": "Johnson Family",
  "guardians": [
    {
      "name": "Maria Johnson",
      "email": "maria@example.com",
      "relationship": "mother",
      "supportedLanguages": ["en", "es"]
    }
  ],
  "children": [
    {
      "name": "Liam Johnson",
      "gradeId": "uuid",
      "groupId": "uuid"
    }
  ]
}
```

Response:
```json
{
  "id": "uuid",
  "displayName": "Johnson Family",
  "status": "active"
}
```

### Sessions

#### POST /v1/sessions
Request:
```json
{
  "schoolId": "uuid",
  "gradeId": "uuid",
  "sessionDate": "2026-10-01",
  "startTime": "09:00",
  "endTime": "10:30",
  "assignments": [
    {
      "groupId": "uuid",
      "teacherId": "uuid",
      "language": "en"
    }
  ]
}
```

Response:
```json
{
  "id": "uuid",
  "status": "scheduled",
  "coverage": {
    "missingGroups": [],
    "warningCount": 0
  }
}
```

### Volunteer Assignments

#### POST /v1/sessions/{id}/volunteers
Request:
```json
{
  "groupId": "uuid",
  "guardianId": "uuid",
  "teacherId": "uuid",
  "language": "en",
  "idempotencyKey": "assignment-abc-123"
}
```

Response:
```json
{
  "id": "uuid",
  "status": "confirmed",
  "idempotencyKey": "assignment-abc-123"
}
```

### Notifications

#### POST /v1/notifications/{id}/resend
Request:
```json
{
  "idempotencyKey": "notify-req-456"
}
```

Response:
```json
{
  "id": "uuid",
  "status": "queued",
  "scheduledFor": "2026-10-01T08:30:00Z"
}
```

## Error Contract

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request payload is invalid.",
    "details": [
      {
        "field": "guardians[0].email",
        "message": "must be a valid email"
      }
    ]
  }
}
```

## Authorization Rules

- Admin and coordinator endpoints require authenticated role-based access.
- Guest users may only access their own family record and approved session information.
- All data writes must be validated for tenant and family scope before persistence.

## Notification Provider Contract

```text
NotificationProvider
  - send(message)
  - validateConfiguration()
  - getStatus(messageId)
  - retry(message)
```

Implementations may include email, SMS, or WhatsApp adapters, but the business logic should call the provider interface instead of vendor-specific code.

The channel capability, unavailable-channel behavior, scoped dispatch, attempt records, and truthful queue/delivery status contract are defined in [notification-delivery.md](notification-delivery.md). Until an approved adapter is enabled, channel selection must show an accessible not-implemented message and must not create queued notifications.
