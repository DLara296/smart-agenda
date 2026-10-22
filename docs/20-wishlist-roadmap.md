# Wishlist and Roadmap

## Wishlist
- Automatic parsing of WhatsApp volunteer responses with human-in-the-loop approval
- AI-assisted assignment recommendations and message drafting
- Additional languages and more advanced school scheduling rules
- Advanced analytics and school-level reporting
- Parent self-service volunteer participation and event updates
- Push notifications and mobile-first experiences
- Calendar integrations with external school systems
- Native apps for families and coordinators

## Roadmap Phases
### Phase 0: Discovery and specification
Define requirements, assumptions, and acceptance criteria. Validate the minimal product scope.

### Phase 1: Architecture and foundation
Establish TypeScript, repository structure, environment configuration, and the CI and testing pipeline.

### Phase 2: Authentication and authorization
Build admin invitation, guest registration, and RBAC controls.

### Phase 3: School domain
Complete school, grade, group, and teacher configuration.

### Phase 4: Family domain
Add family, guardian, and student records and volunteer profile management.

### Phase 5: Reading sessions
Create sessions, validate coverage, manage rotation, and log completion.

### Phase 6: Notifications
Add provider abstraction, scheduling, status tracking, and retries.

### Phase 7: Cancellation and recovery
Handle replacements, missed coverage, and event changes without erasing history.

### Phase 8: Dashboard and history
Build the operational dashboard and historical audit journey.

### Phase 9: Hardening and deployment
Finalize security, responsiveness, observability, backup, and production readiness.
