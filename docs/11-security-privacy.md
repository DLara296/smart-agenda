# Security and Privacy

## Security Controls
- Authentication is required for admin and protected user workflows
- Role-based access control enforces least privilege by resource and role
- Invitation tokens expire and are invalidated after use
- Input validation protects API endpoints from injection and malformed payloads
- Files are stored with safe content controls and limited storage exposure
- Secret material is stored outside source control

## Privacy Controls
- Data minimization: only required fields are collected
- Child data is treated as sensitive and private-by-default
- Guest access is restricted to personal or explicitly authorized data only
- Media and profile photos should require explicit consent and secure handling
- Audit logs must avoid raw sensitive values where practical

## Legal and Compliance Notes
- Product-owner and legal review is required for media consent and retention policy decisions.
- Special care is needed for data exported, archived, or used for analytics.

## Threat Model Highlights
- Unauthorized access to family or child records
- Replay of expired invitation tokens
- Duplicate notification deliveries
- Unsafe file uploads
- Data leakage through logs or error responses

## Required Defenses
- Rate limiting on sensitive flows such as signup and password reset
- Signed tokens and validation on all protected endpoints
- Strict boundary validation for object identifiers and role enforcement
- Safe error handling so internal stack traces do not leak to clients
