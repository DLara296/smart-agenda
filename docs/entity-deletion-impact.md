# Entity Deletion Impact Map

## Policy

Management actions named Delete are archival operations for entities whose references are part of SmartAgenda history. A reading session is canceled rather than removed. The backend is authoritative; list refresh happens only after successful API confirmation. Audit records retain the acting user ID and entity reference.

| Entity | Relationship | On delete |
|---|---|---|
| Teacher | School | Preserve school and association on the inactive teacher record. |
| Teacher | Session group assignments and volunteer assignments | Preserve references and history; teacher is soft-deleted. |
| Teacher | Notification group membership | Preserve membership row; recipient resolution marks inactive teacher unavailable. |
| School | Active teachers | Block school archive until resolved. |
| School | Active students | Block school archive until resolved. |
| School | Non-cancelled reading sessions | Block school archive until resolved. |
| School | Notification groups | Block school archive until groups are removed. |
| School | Grades and groups | Archive with school once the blockers above are absent; preserve their IDs for historical references. |
| Student | Family, school, grade, group | Preserve references on inactive student record. |
| Student | Volunteer assignments and history | Preserve references and history; student is soft-deleted. |
| Family | Active guardians and students | Soft-delete together in one transaction. |
| Family | Active user accounts | Block family archive until linked accounts are handled. |
| Family | Pending invitations | Block family archive until invitations are revoked or resolved. |
| Family | Session and volunteer history | Preserve related rows; guardians and students are not hard-deleted. |
| Reading Session | Group assignments, volunteer assignments, rotation overrides, audit records | Preserve all records and references. |
| Reading Session | Queued notifications | Mark queued notifications canceled in the same transaction. |
| Reading Session | Session row | Set status to `cancelled`; retain the row for history. |

## Implementation Notes

- Teachers, students, and families have `active`/`inactive` status columns; schools have an equivalent status. Operational list APIs filter inactive entities.
- `reading_sessions` stores a status and is retained. Canceling is the safe equivalent of deletion.
- Many core relationship columns are plain IDs, not foreign keys. Hard deletes could silently strand assignments/history, so they are intentionally avoided.
- The school impact preview is counted by the backend. The backend blocks archive if active people, non-cancelled sessions, or notification groups still depend on it.
- The family impact preview is counted by the backend. The backend blocks archive while active accounts or pending invitations reference the family.
- The existing audit repository has no foreign key to its target entity, so audit entries remain after archival. Mutation audit records are written transactionally with the archive.
- Family history currently derives its child selector from active students. Archived students remain in the database and assignments, but may no longer appear as selectable children in the family history UI; a history retention improvement may be needed if family deletion must preserve that view.
