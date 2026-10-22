# Product Requirements

## Summary
Smart Agenda is intended to support the coordination of school reading events by combining scheduling, volunteer management, language-aware assignments, communication, and traceable history in one secure application.

## Personas
### Administrator
Manages schools, grades, groups, teachers, sessions, notifications, and invite workflows.

### Family Guest
Registers a household, links children to school groups, and participates in volunteer assignments.

### Teacher
Needs to know which group is assigned, who is volunteering, and whether the reading session has coverage.

### School Coordinator
Creates reading sessions, validates coverage, sends reminders, and manages replacements.

## Product Requirements
- The system must support staffing and scheduling for reading events with language-aware volunteer filling.
- The system must support admin-only configuration and guest read-only access to explicitly approved content.
- The system must track sessions, participation, replacements, and historical records without deleting prior actions.
- The system must support provider-independent notification flows with queued status tracking.
- The system must be configurable beyond a two-group or two-teacher structure.

## MVP vs Wishlist
### MVP
- Responsive dashboard
- Admin and guest roles
- Invite-only admin registration
- Family registration with school membership
- Sessions with rotation metadata and manual overrides
- Volunteer assignment validation
- History retention and cancellation tracking
- Email-first automation with notification abstraction for SMS and WhatsApp

### Wishlist
- AI-driven WhatsApp parsing
- Rich analytics and forecasting
- Parent self-service scheduling
- Push notifications and native app patterns
- Expanded languages, school types, and calendar integrations

## Open Assumptions
- Family accounts may include multiple adults and children.
- Children are typically mapped to one active school group at a time.
- Guest access is limited to explicitly authorized records only.
- Administrators must approve family registration unless a product-owner chooses self-service onboarding.
- One volunteer can cover one group per session unless the product owner approves broader coverage.
