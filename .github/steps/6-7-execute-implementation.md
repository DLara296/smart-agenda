# Step 6-7: Execute Implementation

## Goal
Check your specification, plan, and tasks against each other for inconsistencies, use SpecKit to implement the tasks that add overdue task indicators to the todo application, then converge on anything the first pass left unbuilt. This is where the specification becomes reality.

## Choosing a Model

Spec-driven development leans heavily on reasoning quality, so use the most capable model available to you. In the GitHub Copilot chat **Model selector** dropdown, pick a current frontier model — at time of writing, the latest Claude Sonnet or Claude Opus. You can switch models at any time from the same dropdown.

## Instructions

### :keyboard: Activity: Analyze your artifacts before implementing

You now have three generated artifacts — `spec.md`, `plan.md`, and `tasks.md` — each produced in a separate chat session. They can disagree with each other without anything looking obviously wrong: a requirement in the spec that no task covers, a plan decision that contradicts your constitution, the same requirement stated twice in slightly different words. Implementation is the most expensive place to discover any of this.

`/speckit-analyze` reads all three and reports the conflicts. Run it **before** `/speckit-implement`.

1. Open the **Copilot** chat panel and switch to **Agent** mode using the dropdown menu.
2. Select a capable model from the **Model selector** dropdown (see above).
3. Start a **new chat** (a lab convention — see "A note on chat sessions" in Step 6-1).
4. In the Copilot chat input field, run the analyze command:
   ```
   /speckit-analyze
   ```
5. SpecKit will produce a findings table covering:
   - **Coverage gaps** — requirements with no corresponding task
   - **Duplication** — the same requirement expressed more than once
   - **Ambiguity** — items still too vague to implement
   - **Constitution conflicts** — anything violating `.specify/memory/constitution.md`, always flagged CRITICAL
6. Read the report and decide what actually needs fixing. Not every finding is worth acting on — that judgment is the point of the exercise.
7. Resolve anything CRITICAL before continuing. Depending on where the problem lives, that means editing `tasks.md` directly, or re-running `/speckit-plan` or `/speckit-specify` with a refinement.

> **Note:** `/speckit-analyze` is strictly read-only — it writes no files and changes nothing. Its output is a report in the chat, so there's nothing to commit from this activity. That also means the lab's automated check can't see whether you ran it; you're on the honor system, and you're the one who benefits.

### :keyboard: Activity: Execute implementation using SpecKit

1. Open the **Copilot** chat panel and switch to **Agent** mode using the dropdown menu.
2. Select a capable model from the **Model selector** dropdown (see above).
3. Start a **new chat** (a lab convention — see "A note on chat sessions" in Step 6-1).
4. In the Copilot chat input field, use the SpecKit implement command:
   ```
   /speckit-implement
   ```
5. SpecKit will work through `tasks.md` phase by phase and:
   - Generate or modify code files
   - Create tests, for the test tasks generated in Step 6-6
   - Follow your project constitution and coding guidelines
   - Mark each finished task `[X]` in `tasks.md` as it goes
   - Report progress after each completed task

   > **Note:** `/speckit-implement` does **not** commit anything. Committing is left to you, in the final activity of this step. (SpecKit can auto-commit through the `git` extension, but that's disabled by default and this lab doesn't turn it on.)

6. Monitor the implementation progress as SpecKit works through each task.
7. Once implementation is complete, verify that everything built correctly.

### :keyboard: Activity: Verify and test the implementation

1. Run the test suite to ensure all tests pass:
   ```bash
   npm test
   ```
2. Start the application to verify the UI works correctly:
   ```bash
   npm start
   ```
3. Test the overdue indicator functionality:
   - Create a todo with a due date in the past
   - Verify that it displays an overdue indicator
   - Check that the styling matches the design guidelines
4. Verify that the code follows your project's coding guidelines

Passing tests are a good sign, but they only cover what someone thought to test. The next activity checks something different: whether everything the spec asked for actually got built.

### :keyboard: Activity: Converge on the specification

Run `/speckit-converge` after every implementation pass — not just when something looks broken.

Converge reads `spec.md`, `plan.md`, and `tasks.md` as the source of intent, assesses what the code currently does, and appends anything unmet, incomplete, or only partially satisfied to `tasks.md` as new tasks. You run it to **find out** whether work remains, which is not something you can reliably determine by looking. A task can be marked complete while the requirement behind it is only half-satisfied, and neither `npm test` nor clicking through the UI will tell you.

1. Run the converge command:
   ```
   /speckit-converge
   ```

   > **Tip:** Starting a **new chat** first is worth it here. Converge is meant to assess the code as it actually exists on disk — running it in the same session that just wrote that code invites the agent to answer from memory of what it intended rather than from what it produced. SpecKit doesn't require this; the command reads everything it needs from your files either way.

2. SpecKit will assess the codebase against your artifacts and report one of two outcomes:
   - **Clean result** — the codebase satisfies everything, and `tasks.md` is left completely unchanged. You're done; continue to the commit activity.
   - **Remaining work** — a `## Phase N: Convergence` section is appended to `tasks.md` describing what's still missing.
3. If work was appended, review the new tasks, then re-run `/speckit-implement` to complete them.
4. Return to the verify activity above, test again, and run `/speckit-converge` once more.

Repeat until converge reports a clean result and your tests pass.

> **Note:** Converge is append-only by design. It never modifies `spec.md` or `plan.md`, never rewrites or reorders existing tasks, and never touches application code — completing the appended tasks is `/speckit-implement`'s job. It's also not a diff tool: it assesses the present state of the code, with no reference to git history or branch comparisons. That makes it safe to run as often as you like.

### :keyboard: Activity: Commit your work

Once your tests pass and `/speckit-converge` reports a clean result, commit and push your changes:

```bash
git add .
git commit -m "Implement overdue task indicators"
git push
```

#### Success Criteria
To complete this exercise successfully, ensure that:
- `/speckit-analyze` was run and any CRITICAL findings were resolved before implementing
- `/speckit-converge` was run after implementing and reports a clean result
- All tasks from `specs/001-*/tasks.md` have been implemented, including any appended Convergence phase
- Code changes are present in the appropriate files
- Tests have been created and are passing: `npm test`
- The application runs without errors: `npm start`
- Overdue indicators are visible in the UI with appropriate styling
- All code follows your project's coding guidelines
- Changes have been committed and pushed to the repository

If you encounter any issues, you can:
- Run `/speckit-converge` to have SpecKit identify what's still unbuilt and queue it as tasks
- If SpecKit reports "Feature directory not found", set `SPECIFY_FEATURE_DIRECTORY` as described in Step 6-5
- Re-run `/speckit-analyze` to confirm your artifacts still agree after any fixes
- Review the generated code for quality and correctness
- Run `npm test` to check for test failures
- Use `npm start` to verify the application works
- Ask Copilot to fix specific problems or regenerate code
- Check the git log to see what changes were made

## Why?
The implementation phase is where all the careful planning pays off. By following the structured specification → clarification → plan → tasks → implementation flow, you ensure that:
- The AI has clear, unambiguous requirements
- Implementation aligns with your project standards
- Code quality is maintained
- Testing is integrated from the start
- The feature is built exactly as designed

This structured approach reduces rework, maintains consistency, and produces production-ready code in a predictable manner.

### Why analyze first?

Every other step in this session taught you to **generate** an artifact. This one teaches you to **verify** them against each other, and it's the habit most worth carrying out of this lab.

Each artifact was produced in its own chat session, from the one before it. That's deliberate — it keeps context clean — but it also means nothing ever checks the set as a whole. Small divergences compound quietly: a requirement drops out between spec and tasks, a plan quietly contradicts a constitutional principle. None of it surfaces during generation, because each step only ever looked at its immediate input.

Implementation is where those gaps finally become visible, as code you have to throw away. A read-only pass across all three artifacts is far cheaper than debugging a feature that was built correctly from the wrong instructions.

### Why converge at the end?

The five-phase flow reads like a straight line, and for a small feature in a clean codebase it often is. On real work it usually isn't. `/speckit-implement` stops partway, a task turns out to depend on something nobody anticipated, or the generated code satisfies the letter of a task without satisfying the requirement behind it.

The hard part is that **you often can't tell**. A green test suite only proves the assertions someone wrote actually hold; it says nothing about requirements nobody turned into a test. A task marked `[x]` records that the agent believed it was finished. Neither is evidence that the spec was satisfied — which is why converge is something you run every pass, rather than something you reach for once you suspect trouble. If you already knew what was missing, you wouldn't need it.

That's also why a clean result is worth something. It isn't the boring case where nothing happened; it's the run that tells you the code and the specification actually agree.

And when work *is* found, converge keeps you inside the process instead of dropping you into hand-fixing code. Hand-fixing works, but it leaves your artifacts describing a system that no longer exists — and every future SpecKit command reads those artifacts. Measure, write the difference down as tasks, implement, measure again. Spec-driven development isn't a pipeline you run once. It's a loop you exit when the code and the spec finally agree.
