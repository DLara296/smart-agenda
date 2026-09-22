# User Roles and Permissions

## Roles
### Administrator
- Full access to configuration, scheduling, invitations, users, and operational settings.
- Can create and update schools, grades, groups, teachers, sessions, families, and assignments.
- Can configure notifications and view history and audit data.

### Coordinator
- Can manage reading sessions, validate coverage, log volunteers, and handle replacements.
- Can view relevant school and family records needed for operational management.
- Cannot modify global settings or access unrestricted admin configuration.

### Guest
- Can self-register and access only explicitly authorized information.
- Can view their own family record and the specific session and volunteer-related records relevant to them.
- Cannot modify protected child or family data outside their own registration and allowed volunteer actions.

## Authorization Model
| Role | Schools | Grades | Groups | Teachers | Family Data | Child Data | Session Management | Notifications | Settings |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Administrator | Full | Full | Full | Full | Full | Full | Full | Full | Full |
| Coordinator | Read/Write for assigned school | Read/Write | Read/Write | Read/Write | Limited | Limited | Full | Limited | No |
| Guest | No | No | No | No | Own record only | Own children only | Read for own assignments | No | No |

## Privacy Rules
- Guests must never see contact information for other families or children beyond explicit shared data.
- Child profiles should be viewable only when necessary for school coordination and volunteer assignment tasks.
- Access should be limited to the active school context, not global visibility across all schools.

## Registration and Approval
- Admin registration is invite-only and uses a secure invite workflow.
- Family registration may be self-serve or admin-approved depending on product-owner decision; the default assumption is admin review for first deployment.
- Any approvals must be logged as audit information.

## Least-Privilege Summary
The system must avoid broad read access by default. Every permission should be tied to a clear use case such as session coverage, notification delivery, family registration, or school administration.
