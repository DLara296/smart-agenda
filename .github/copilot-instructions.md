# GitHub Copilot Instructions

> **Note**: This file is located at `.github/copilot-instructions.md` and is used by GitHub Copilot to understand project context.

This file contains high-level instructions for GitHub Copilot to follow when generating code for this project. For detailed guidance, refer to the documentation files in the `docs/` directory.

## Documentation Overview

The project documentation will be built during the bootcamp sessions.

- [Project Overview](../docs/project-overview.md) - Overview of the project
- [Coding Guidelines](../docs/coding-guidelines.md) - Coding style, quality principles, and best practices
- [Functional Requirements](../docs/functional-requirements.md) - Core functional requirements for the todo app
- [UI Guidelines](../docs/ui-guidelines.md) - Design system and UI guidelines for the todo app
- [Testing Guidelines](../docs/testing-guidelines.md) - Testing strategy and best practices

## Memory System

- Persistent Memory: This file (.github/copilot-instructions.md) contains foundational principles and workflows.
- Working Memory: The .github/memory/ directory contains discoveries, patterns, and session notes created during active development.
- During active development, take notes in .github/memory/scratch/working-notes.md. These notes are not committed to git and should capture the current task, approach, findings, blockers, and next steps.
- At the end of each session, summarize key findings into .github/memory/session-notes.md. This file is committed as a historical record for future reference.
- Document recurring code patterns in .github/memory/patterns-discovered.md. This file is committed and should accumulate reusable learnings over time.
- Reference these files when providing context-aware suggestions so the project benefits from prior debugging, testing, and refactoring discoveries.

## Commit Workflow

- After each completed task, stop and ask the user whether they want to commit the changes using /speckit-git-commit.
- If the user confirms, ask them for the exact commit message to use before executing the commit command.
- Do not commit automatically without explicit user approval and a provided commit message.
- Keep the commit prompt brief, clear, and actionable, for example: "Would you like me to commit these changes with /speckit-git-commit? If yes, please provide the commit message."
