# Coding Guidelines

## Principles
- TypeScript is preferred for both frontend and backend code.
- Avoid unjustified any usage and prefer explicit, narrow types.
- Favor descriptive naming and explicit boundaries around business logic.
- Keep components and functions focused on one responsibility.
- Prefer readable code over clever code.
- Do not add unnecessary useEffect calls or derived state when a value can be calculated or normalized elsewhere.
- Keep API access isolated in client or repository layers.
- Keep backend controllers thin and push business logic into services and use cases.
- Validate user inputs at boundary layers and centralize error handling.
- Use early returns and explicit Promise handling.
- Protect against unsafe concurrency in jobs and external integrations.
- Keep code organized by domain and not by file system accident.

## Quality Gates
- Use ESLint and Prettier consistently.
- Sort imports and organize them by type.
- Comment only when the rationale is not obvious.
- Avoid unrelated refactors in the same change.
- Never commit secrets or credentials to source control.
- Include accessibility and security considerations in all user-facing work.

## Definition of Done
A change is complete only when the required behavior is implemented, protected by relevant tests, and documented when important. Do not claim completion without verification evidence from linting, type-checking, or targeted tests.
