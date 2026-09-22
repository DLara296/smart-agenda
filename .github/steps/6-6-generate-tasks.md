# Step 6-6: Generate Actionable Tasks

## Goal
Use SpecKit to break down the implementation plan into granular, actionable tasks that can be completed step-by-step. This creates a clear roadmap for implementation.

## Choosing a Model

Spec-driven development leans heavily on reasoning quality, so use the most capable model available to you. In the GitHub Copilot chat **Model selector** dropdown, pick a current frontier model — at time of writing, the latest Claude Sonnet or Claude Opus. You can switch models at any time from the same dropdown.

## Instructions

### :keyboard: Activity: Generate tasks using SpecKit

1. Open the **Copilot** chat panel and switch to **Agent** mode using the dropdown menu.
2. Select a capable model from the **Model selector** dropdown (see above).
3. Start a **new chat** (a lab convention — see "A note on chat sessions" in Step 6-1).
4. In the Copilot chat input field, use the SpecKit tasks command:
   ```
   /speckit-tasks
   ```
5. SpecKit will analyze the design artifacts and write `tasks.md`, organized into phases:
   - **Phase 1: Setup** — project initialization
   - **Phase 2: Foundational** — prerequisites that block all the user stories
   - **Phase 3+** — one phase per user story, in the priority order from `spec.md`, each with its own goal and independent test criteria
   - **Final phase: Polish** — cross-cutting concerns

   It also produces a dependency graph showing the order stories can be completed in, parallel execution examples, and an implementation strategy that front-loads an MVP. Tasks marked `[P]` can be worked in parallel because they touch different files and have no incomplete dependencies.

6. Review the generated tasks to ensure they follow a logical sequence and cover the feature.

   > **Note:** Confirm there are test tasks. SpecKit generates them **only** when the specification explicitly asks for tests or you request a TDD approach — which is why Step 6-3's user story included a Testing section. If you don't see any, say so in chat and ask for test tasks to be added before moving on.
7. Commit and push your changes:
   ```bash
   git add .
   git commit -m "Generate implementation tasks for overdue todo items"
   git push
   ```

#### Success Criteria
To complete this exercise successfully, ensure that:
- The file `specs/001-*/tasks.md` exists with the complete task list
- Tasks are specific and actionable
- Tasks follow a logical order with dependencies considered
- The task list is organized into phases, with one phase per user story
- The task list includes test tasks (see the note above if it doesn't)

If you encounter any issues, you can:
- Make sure you're using Agent mode in Copilot chat
- If SpecKit reports "Feature directory not found", set `SPECIFY_FEATURE_DIRECTORY` as described in Step 6-5
- Verify you started a new chat for this step
- Check that the `/speckit-tasks` command was recognized
- Review that `specs/001-*/tasks.md` was created
- Ask Copilot to regenerate the tasks if needed

## Why?
Breaking down the implementation plan into specific tasks ensures that the implementation phase is well-structured and predictable. Each task should be small enough to be completed independently but contribute to the overall feature. Having a clear task list makes it easier to:
- Track progress during implementation
- Verify that all aspects (code, tests, documentation) are covered
- Provide clear requirements to the AI during implementation
