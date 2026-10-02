# Patterns Discovered

This file captures recurring solutions and lessons discovered during development. It should be updated when a reusable pattern becomes important enough to preserve for future work.

## Pattern Template

### Pattern Name
- Name: [Pattern name]

### Context
- [When this pattern appears]

### Problem
- [What issue or complexity it addresses]

### Solution
- [How the team solves it]

### Example
- [Short example or pseudo-code]

### Related files
- [Relevant files, modules, or docs]

---

## Example Pattern: Service initialization (empty array vs null)

### Pattern Name
- Name: Service initialization should normalize empty state to an empty array

### Context
- Service methods commonly return or store collections such as tasks, records, or assignments.
- These may start as empty, undefined, or null depending on how data is loaded.

### Problem
- Mixing empty arrays and null values creates inconsistent downstream behavior.
- UI code and service code may add repeated null checks and edge-case handling.
- Tests may pass or fail depending on original initialization values rather than actual behavior.

### Solution
- Normalize the collection at initialization time so the app always uses an empty array when no data exists.
- Keep the rest of the code working with a consistent collection contract.
- Avoid passing null to consumers unless the business rule specifically requires it.

### Example
```js
const items = data?.items ?? [];
return items;
```

### Related files
- service layer / API normalization
- UI state initialization
- related tests covering empty-state behavior

---

## Accumulated Learnings

### Append-only event ordering
- Timestamp ties can make randomly generated IDs select an older state as the current event.
- For sequential updates, advance event timestamps monotonically; for equal-time consent ties, prefer revocation so uncertainty fails closed.
- Do not rely on random ID ordering to represent event chronology.

- Prefer consistent empty-state handling over scattered null checks.
- Document failures that recur so future work can avoid repeated debugging cycles.
- Capture both technical and workflow learnings in one place.
- Preserve the reason behind a decision, not just the final code change.
