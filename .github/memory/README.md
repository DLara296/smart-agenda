# Working Memory System

This directory stores the project’s working knowledge that is created while developing the product. It complements the persistent operating guidance in [.github/copilot-instructions.md](../copilot-instructions.md).

## Purpose
The memory system helps the team and AI assistants track:

- Patterns discovered during implementation
- Decisions made during debugging and refactoring
- Lessons learned from tests, linting, and deployment issues
- Useful context for future work in the same codebase

The goal is to preserve practical knowledge without hiding it in ad hoc notes or memory alone.

## Two Types of Memory

### 1) Persistent Memory
Location: [.github/copilot-instructions.md](../copilot-instructions.md)

This file holds the durable project guidance:

- principles and standards
- workflow expectations
- required development habits
- high-level architecture and coding expectations

This is the foundational memory for the repository and should remain stable and intentional.

### 2) Working Memory
Location: [.github/memory/](.)

This directory captures project learnings developed during active work, including:

- session summaries
- recurring patterns
- debugging discoveries
- active scratch notes for the current task

This is meant to reflect what was learned while working, not just what is permanently enforced.

## Directory Structure

```text
.github/memory/
├── README.md
├── session-notes.md
├── patterns-discovered.md
└── scratch/
    ├── .gitignore
    └── working-notes.md
```

### session-notes.md
This file is for completed session summaries. It is committed to git and acts as a historical record of what happened, what was learned, and what decisions were made.

Use it after a session concludes, when the work has been validated or the issue has been resolved. This is the place to record the final state and lessons for future agents and developers.

### patterns-discovered.md
This file accumulates patterns the team has learned while building the app. It records reusable code or workflow solutions such as service initialization decisions, validation habits, testing patterns, and architecture lessons.

This is committed and should evolve over time as patterns become established.

### scratch/working-notes.md
This is the active working area for the current session. It is intentionally not committed to git so it stays ephemeral and flexible during active development.

Use this file while:

- debugging a failing test
- working through a lint or type error
- exploring a new bug or architecture decision
- capturing thoughts before they are refined into permanent notes

## When to Use Each File

### During TDD
- Write the failing test first.
- Capture the expected behavior and the bug in scratch/working-notes.md if the issue is complex.
- Once the fix is validated, summarize the learning in session-notes.md if it matters for future work.
- If the issue reveals a reusable pattern, add it to patterns-discovered.md.

### During Linting
- If lint rules highlight a recurring setup or style issue, document the pattern in patterns-discovered.md.
- Use scratch/working-notes.md for temporary notes about lint fixes while iterating.
- After the fix lands, move the relevant learnings into the historical summary once they are no longer active.

### During Debugging
- Use scratch/working-notes.md to track hypotheses, reproduction steps, and root cause findings.
- Record the root cause and resolution in session-notes.md when the debugging is complete.
- Add a reusable pattern in patterns-discovered.md if the fix reveals a general principle the team should remember.

## How AI Reads and Applies These Files
The AI assistant should read the memory files before making recommendations so it can align with project-specific learnings instead of repeating old mistakes.

The expected flow is:

1. Check scratch/working-notes.md for current active context.
2. Review session-notes.md for completed historical learnings.
3. Review patterns-discovered.md for reusable patterns and conventions.
4. Use that context to provide more relevant suggestions, debugging help, and implementation guidance.

This makes the project memory cumulative: active work informs the current task, and prior task learnings reduce repeated mistakes and improve consistency.

## Important Distinction

### session-notes.md
- historical summary of completed work
- committed to git
- intended as a durable record for future sessions
- should be concise but informative

### scratch/working-notes.md
- active note-taking file for the current work session
- not committed to git
- meant to be temporary and disposable
- used while investigating, coding, and debugging

This distinction keeps active work fluid while protecting important lessons over time.

## Usage Guidance

- Keep scratch notes short and actionable while the work is active.
- Summarize only the findings that matter to future work before ending a session.
- Prefer writing reusable patterns down once, then reusing them instead of rediscovering the same issue repeatedly.
- Keep the memory system helpful, specific, and grounded in actual project outcomes.
