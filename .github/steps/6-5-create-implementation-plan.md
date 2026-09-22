# Step 6-5: Create Technical Implementation Plan

## Goal
Use SpecKit to create a technical implementation plan that defines the architecture, tech stack decisions, and approach for implementing the overdue task feature based on your clarified specification.

## Choosing a Model

Spec-driven development leans heavily on reasoning quality, so use the most capable model available to you. In the GitHub Copilot chat **Model selector** dropdown, pick a current frontier model — at time of writing, the latest Claude Sonnet or Claude Opus. You can switch models at any time from the same dropdown.

## Instructions

### :keyboard: Activity: Create a technical implementation plan using SpecKit

1. Open the **Copilot** chat panel and switch to **Agent** mode using the dropdown menu.
2. Select a capable model from the **Model selector** dropdown (see above).
3. Start a **new chat** (a lab convention — see "A note on chat sessions" in Step 6-1).
4. In the Copilot chat input field, use the SpecKit plan command:
   ```
   /speckit-plan
   ```

   > **If you get "Feature directory not found":** SpecKit locates the active feature through `.specify/feature.json`, written by `/speckit-specify`. That file is deliberately machine-local and **not committed**, and there is no fallback to your branch name — so if your Codespace was rebuilt, or you resumed this lab on a different machine, the pointer is gone even though your `specs/001-*/` directory is right there. Restore it by telling SpecKit where the feature lives:
   >
   > ```bash
   > export SPECIFY_FEATURE_DIRECTORY=specs/001-<your-feature-name>
   > ```
   >
   > Run that in the terminal, then re-run the command. This applies to `/speckit-tasks`, `/speckit-implement`, `/speckit-analyze`, and `/speckit-converge` too.
5. SpecKit will analyze the specification and clarifications, then run two design phases and write **several files**, not just `plan.md`:
   - `plan.md` — the technical approach and architecture decisions
   - `research.md` — resolutions for anything the spec left marked as needing clarification
   - `data-model.md` — the entities the feature introduces or changes
   - `quickstart.md` — how to validate the feature once it's built
   - `contracts/` — interface contracts, if the feature has any external interfaces

   Not every file appears for every feature. A small UI change may produce no meaningful contracts, for instance. The command stops after the design phase — it writes no application code.

6. Review the generated plan to ensure it aligns with your project structure and existing architecture. Skim the supporting files too; `research.md` in particular records assumptions that will shape the tasks.
7. Commit and push your changes:
   ```bash
   git add .
   git commit -m "Create implementation plan for overdue todo items"
   git push
   ```

#### :bulb: Optional: Generate a quality checklist

If you have time, SpecKit can generate a checklist that pressure-tests your **requirements** — not your code:

```
/speckit-checklist
```

It asks a few questions about which quality domain you care about (UX, API, security, performance), then writes `specs/001-*/checklists/[domain].md` containing items like *"Are the visual states for an overdue item specified for all themes?"*

Think of these as **unit tests for English**. Where `npm test` checks whether your code does what you meant, a checklist checks whether you actually said what you meant. It's the same instinct as Step 6-4's clarify, applied after the plan exists and aimed at one domain in depth.

This is optional and the lab won't check for it — skip it if you're short on time, and come back to it when you try SpecKit on real work.

#### Success Criteria
To complete this exercise successfully, ensure that:
- The file `specs/001-*/plan.md` exists with the technical implementation plan
- The plan references your specific project files and structure
- Technical decisions are clearly documented
- The plan respects your project's existing architecture and patterns

If you encounter any issues, you can:
- Make sure you're using Agent mode in Copilot chat
- Verify you started a new chat for this step
- Check that the `/speckit-plan` command was recognized
- Review that `specs/001-*/plan.md` was created
- Ask Copilot to regenerate the plan if needed

## Why?
The implementation plan bridges the gap between the "what" (specification) and the "how" (implementation). It documents technical decisions, architecture choices, and the specific approach for implementing the feature. Having a clear plan ensures that the implementation tasks are well-defined and that the generated code follows your project's patterns and conventions. This also provides a reference for code review and helps ensure consistency across the codebase.
