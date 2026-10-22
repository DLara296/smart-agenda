# Functional Requirements

## Requirement Format
Each requirement below includes the required artifact fields and a concise acceptance pattern.

## FR-AUTH-001: Admin Invite and Registration
- Title: Admin invite and registration
- Description: An administrator registration flow must be invite-only, secure, single-use, and time-limited.
- Actors: Administrator, Platform
- Preconditions: Invite exists and is valid.
- Trigger: New admin registers for first access.
- Main flow: Invitation is created, stored with expiry metadata, and accepted by a user. The user completes profile registration and verification.
- Alternative flows: Expired invite, duplicate user, invalid email, already accepted invite.
- Validation rules: Email uniqueness, valid phone, password or identity verification policy.
- Business rules: Single-use invite becomes invalid after acceptance or expiry.
- Error/failure cases: Expired, revoked, duplicate, invalid token.
- Permissions: Only invite creator or system can issue invites.
- Acceptance criteria: Given a valid invite, when the user completes checkout, then the account is activated and the invite is consumed.
- Priority: MVP
- Dependencies: Auth service, invitation repository

## FR-SCHOOL-001: Create and Manage School
- Title: School management
- Description: A school record supports core organizational metadata and status.
- Actors: Administrator
- Preconditions: Administrator signed in.
- Trigger: School creation or update.
- Main flow: Admin creates school with required metadata and status.
- Alternative flows: Update inactive school, reactivate school.
- Validation rules: Unique name per region or configuration rule.
- Business rules: A school must have at least one grade or a valid status for configuration.
- Acceptance criteria: Given proper permissions, when a school is created, then it is persisted and visible in the school directory.
- Priority: MVP
- Dependencies: School domain

## FR-GRADE-001: Create and Manage Grade
- Title: Grade management
- Description: Grades must be attached to a school and remain configurable.
- Actors: Administrator
- Preconditions: School exists.
- Trigger: Grade creation.
- Main flow: Admin creates or updates a grade for a school.
- Acceptance criteria: Given a valid school, when a grade is added, then it is associated to that school.
- Priority: MVP
- Dependencies: School model

## FR-GROUP-001: Create and Manage Group
- Title: Group management
- Description: A group belongs to a grade and may be active or inactive.
- Actors: Administrator
- Preconditions: Grade exists.
- Trigger: Group creation or update.
- Acceptance criteria: Given a grade, when a group is created, then it is associated with that grade and can be scheduled in sessions.
- Priority: MVP

## FR-TEACHER-001: Teacher Assignment
- Title: Teacher management
- Description: Teachers must have language responsibilities and assigned groups.
- Actors: Administrator
- Preconditions: School/grade/group exist.
- Trigger: Teacher creation or assignment.
- Acceptance criteria: Given a valid assignment, when a teacher is saved, then the assignment is visible to the sessions service.
- Priority: MVP

## FR-FAMILY-001: Family Registration
- Title: Family registration
- Description: Family records can include multiple adults and children, with school relationships and language preferences.
- Actors: Guest, Administrator
- Preconditions: Registration is open or approved.
- Trigger: New family signs up.
- Main flow: Family enters household details, adults, and children.
- Alternative flows: Family registration pending approval or rejected.
- Acceptance criteria: Given complete household data, when registration is submitted, then the family record is created and linked to child/school data.
- Priority: MVP

## FR-EVENT-001: Reading Session Creation
- Title: Reading session creation
- Description: A coordinator can create a reading session with required time, grade, group, and teacher metadata.
- Actors: Administrator, Coordinator
- Preconditions: School grade and group data exist.
- Trigger: Session creation.
- Acceptance criteria: Given valid session data, when the session is saved, then it appears in the calendar and dashboard.
- Priority: MVP

## FR-VOLUNTEER-001: Record Volunteer Assignment
- Title: Volunteer assignment
- Description: A volunteer assignment must be linked to a session, a group, a parent, and a valid language match.
- Actors: Coordinator, Administrator
- Preconditions: Session exists and volunteer eligibility is validated.
- Trigger: Assignment is saved.
- Business rules: No duplicate booking; language must match assignment; volunteer must belong to a valid family record.
- Acceptance criteria: Given an eligible volunteer, when assignment is confirmed, then the session shows the volunteer as confirmed and the coverage logic updates.
- Priority: MVP

## FR-VOLUNTEER-002: Coverage Validation
- Title: Coverage validation
- Description: The system must flag missing volunteers for groups without coverage or mismatched language.
- Actors: System, Coordinator
- Preconditions: Session and volunteer assignments exist.
- Trigger: Assignment update or session review.
- Acceptance criteria: Given an incomplete session, when coverage is checked, then a warning is displayed with missing groups and language gaps.
- Priority: MVP

## FR-NOTIFY-001: Notification Scheduling
- Title: Notification scheduling
- Description: The system must support scheduled volunteer requests, teacher confirmations, and reminders.
- Actors: System, Coordinator
- Preconditions: Session is configured.
- Trigger: Notification job is due.
- Acceptance criteria: Given a scheduled notification, when the trigger time is reached, then the message is queued and status is recorded.
- Priority: MVP

## FR-CANCEL-001: Cancellation and Replacement
- Title: Cancellation and replacement workflow
- Description: A canceled assignment must preserve history while allowing replacement or escalation.
- Actors: Coordinator, Administrator
- Preconditions: Assignment exists.
- Trigger: Volunteer cancellation or replacement.
- Acceptance criteria: Given a cancellation, when a replacement is assigned or the group remains unfilled, then history remains intact and the dashboard updates.
- Priority: MVP

## FR-HISTORY-001: Participation History
- Title: Participation history
- Description: Session actions and volunteer outcomes must be retained for audit and reporting.
- Actors: Administrator, Coordinator
- Preconditions: Session has participation events.
- Trigger: Session completion or cancellation.
- Acceptance criteria: Given a completed or canceled session, when history is reviewed, then the timeline includes prior assignments and changes.
- Priority: MVP

## Requirements Coverage Matrix

| Major user need | Functional requirement(s) |
| --- | --- |
| Admin onboarding | FR-AUTH-001 |
| School and grade setup | FR-SCHOOL-001, FR-GRADE-001 |
| Teacher and group planning | FR-GROUP-001, FR-TEACHER-001 |
| Family registration | FR-FAMILY-001 |
| Session creation and planning | FR-EVENT-001 |
| Volunteer coverage | FR-VOLUNTEER-001, FR-VOLUNTEER-002 |
| Notifications and reminders | FR-NOTIFY-001 |
| Cancellations and replacements | FR-CANCEL-001 |
| Operational history and audit | FR-HISTORY-001 |

## Validation Summary
The functional requirement set above covers the major MVP flows required by Smart Agenda. Additional wishlist features should be introduced only after the core flow is validated in a production-ready mode.
