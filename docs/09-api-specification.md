# API Specification

## API Principles
- Versioned REST APIs with explicit auth and validation
- No exposure of sensitive database fields
- Structured error payloads for all failure states
- Idempotency keys for create and notification actions
- Pagination and filtering for list endpoints

## Authentication and Authorization
- Admin and guest flows use secure token-based authentication
- RBAC roles apply at endpoint and resource boundaries
- Protected data endpoints must validate current user identity and scope before returning records

## Common Error Contract
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request payload is invalid.",
    "details": [
      { "field": "email", "message": "must be a valid email" }
    ]
  }
}
```

## Major Endpoints
### Auth
- POST /v1/auth/login
- POST /v1/auth/logout
- POST /v1/auth/refresh
- POST /v1/invitations
- POST /v1/admin/register
- POST /v1/guest/register

### Schools
- GET /v1/schools
- POST /v1/schools
- GET /v1/schools/{id}
- PATCH /v1/schools/{id}

### Grades and Groups
- GET /v1/grades
- POST /v1/grades
- GET /v1/groups
- POST /v1/groups

### Teachers and Families
- GET /v1/teachers
- POST /v1/teachers
- GET /v1/families
- POST /v1/families
- GET /v1/families/{id}/children

### Sessions and Volunteer Assignments
- GET /v1/sessions
- POST /v1/sessions
- GET /v1/sessions/{id}
- PATCH /v1/sessions/{id}
- GET /v1/sessions/{id}/volunteers
- POST /v1/sessions/{id}/volunteers
- PATCH /v1/volunteer-assignments/{id}

### Notifications
- GET /v1/notifications
- POST /v1/notifications/{id}/resend
- POST /v1/notifications/{id}/cancel

### Audit and History
- GET /v1/audit
- GET /v1/history/sessions/{id}

## Pagination and Querying
- Use limit and offset or cursor-based pagination
- Support sort, status filters, and school or date range filters
- Validate all query parameters and return explicit error codes for invalid filters

## OpenAPI Strategy
- Maintain a versioned OpenAPI document for all public APIs
- Separate internal admin, guest, and coordinator endpoints by auth scope
- Document request and response schemas for all resource types

## Security Notes
- Never return raw password hashes or internal DB identifiers beyond what is required
- Limit family and child records to the current user context
- Ensure all writes are validated by permission and business rules
