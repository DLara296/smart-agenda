# Step 6-3: Create Your First Specification

## Goal
Use SpecKit to create a detailed specification for adding overdue task indicators to the todo application. This is where you define **what** you want to build before thinking about **how** to build it.

## Choosing a Model

Spec-driven development leans heavily on reasoning quality, so use the most capable model available to you. In the GitHub Copilot chat **Model selector** dropdown, pick a current frontier model — at time of writing, the latest Claude Sonnet or Claude Opus. You can switch models at any time from the same dropdown.

## Instructions

### :keyboard: Activity: Create a specification using SpecKit

1. Open the **Copilot** chat panel and switch to **Agent** mode using the dropdown menu.
2. Select a capable model from the **Model selector** dropdown (see above).
3. Start a **new chat** (a lab convention — see "A note on chat sessions" in Step 6-1).
4. In the Copilot chat input field, type `/speckit-specify` and then paste the user story below **in the same message**, before sending:

   ```markdown
   /speckit-specify

   # Support for Overdue Todo Items

   ## User Story

   **As a** todo application user  
   **I want to** easily identify and distinguish overdue tasks in my todo list  
   **So that** I can prioritize my work and quickly see which tasks are past their due date

   ## Description

   Users need a clear, visual way to identify which todos have not been completed by their due date. This helps users quickly spot overdue items without having to manually check dates against today's date.

   ## Testing

   This feature must include automated tests covering the overdue determination logic and its display, following the existing Jest patterns in the repository.
   ```

   > **Note:** The testing section isn't decoration. `/speckit-tasks` only generates test tasks when tests are **explicitly requested in the specification** or you ask for a TDD approach — otherwise you'll get an implementation-only task list and no tests, despite this project already having a test suite.

5. SpecKit will create a new feature branch and generate the specification.

   > **Note:** The branch is created by the `git` extension you installed in Step 6-1, via a hook that runs before `/speckit-specify`. If you end up with a `specs/001-*/` directory but you're still on `feature/speckit`, the extension is missing — run `specify extension add git` and try again.

6. Alongside `spec.md`, SpecKit also writes `specs/001-*/checklists/requirements.md` — a quality checklist it generates and then runs the spec against. Skim it; it tells you which parts of your specification SpecKit itself considers weak.
7. Review the generated spec to ensure it captures the requirements correctly. Don't worry if some details seem unclear - we'll clarify and refine the specification in the next step.
8. Commit and push your changes - take note that you are on a new branch that speckit created

#### Success Criteria
To complete this exercise successfully, ensure that:
- A new Git branch matching the pattern `001-*` was created (e.g., `001-overdue-todos`)
- The file `specs/001-*/spec.md` exists with the detailed specification
- The specification includes the user story, requirements, and acceptance criteria

If you encounter any issues, you can:
- Make sure you're using Agent mode in Copilot chat
- Verify you started a new chat for this feature
- Check that the `/speckit-specify` command was recognized
- Review the created branch name (it should start with `001-`)
- Ask Copilot to regenerate the specification if needed

## Why?
Creating a specification before implementation is the foundation of Spec-Driven Development. The spec documents **what** needs to be built and **why**, without getting into implementation details. This gives the AI clear requirements to work from and creates a reference point for all subsequent steps (clarification, planning, tasks, and implementation). A good specification reduces ambiguity and ensures everyone understands the feature before any code is written.
