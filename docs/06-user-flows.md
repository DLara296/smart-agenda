# User Flows

## Admin Invite Flow
1. Administrator generates an invitation for an exact email and role; coordinator invitations also specify an active school and may specify a household.
2. The system creates a 256-bit cryptographic single-use token with a valid future expiry. The administrator delivers it through an approved secure channel; the application does not send invitation email.
3. The invitee submits the token, name, and a password of at least 12 characters.
4. The system uses the email, role, household, and school stored on the invitation; request fields cannot alter the assigned scope.
5. In one transaction, the system creates the account, consumes and links the invitation, grants coordinator school membership if applicable, records audit events, and starts an authenticated session.
6. Expired, revoked, duplicate-email, and replayed invitations fail with a generic response.

## School Setup Flow
1. Administrator creates a school record.
2. Administrator adds grades and groups.
3. Administrator adds teachers and assigns languages and school responsibilities.
4. System validates the relationship and availability.

## Family Registration Flow
1. Guest selects family registration.
2. Guest enters family profile data, adults, and children.
3. Guest selects relationships, school, group, and supported languages.
4. Registration is sent for approval if required.
5. Admin approves or rejects the family record.
6. The family becomes active for volunteer assignment workflows.

## Session Planning Flow
1. Coordinator creates a reading session.
2. System resolves the relevant school, grade, teacher, and rotation assignment.
3. System builds a volunteer request and notification schedule.
4. Families receive requests and respond.
5. Coordinator records volunteers and validates coverage.
6. Missing groups trigger reminders or escalations.

## Volunteer Coverage Flow
1. Volunteer is selected for a session and group.
2. System checks family linkage, language match, and duplicate booking.
3. If valid, the assignment is confirmed.
4. If invalid, a clear error is shown and the record is rejected.

## Cancellation and Replacement Flow
1. A volunteer cancels an assignment.
2. System preserves original history and marks the assignment as cancelled.
3. Replacement logic searches for eligible volunteers or escalates to the coordinator.
4. The replacement is linked to the original assignment as traceable history.

## Completion Flow
1. Session occurs.
2. Coordinator marks the session complete.
3. System stores completion metadata and keeps historical participation records intact.
