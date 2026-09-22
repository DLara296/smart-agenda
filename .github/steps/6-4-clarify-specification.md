# Step 6-4: Clarify the Specification

## Goal
Use SpecKit to identify and resolve any ambiguous or underspecified areas in the specification before creating the technical plan. This ensures clarity and prevents misunderstandings during implementation.

## Choosing a Model

Spec-driven development leans heavily on reasoning quality, so use the most capable model available to you. In the GitHub Copilot chat **Model selector** dropdown, pick a current frontier model — at time of writing, the latest Claude Sonnet or Claude Opus. You can switch models at any time from the same dropdown.

## Instructions

### :keyboard: Activity: Clarify the specification using SpecKit

1. Open the **Copilot** chat panel and switch to **Agent** mode using the dropdown menu.
2. Select a capable model from the **Model selector** dropdown (see above).
3. Start a **new chat** (a lab convention — see "A note on chat sessions" in Step 6-1).
4. In the Copilot chat input field, use the SpecKit clarify command:
   ```
   /speckit-clarify
   ```
5. SpecKit will scan the spec for ambiguity, then ask you **up to five questions, one at a time**. It won't show them all at once, and it stops early once the remaining ambiguity stops mattering.

   Most questions arrive as a multiple-choice table with SpecKit's recommended option called out. You can reply with the option letter, say "yes" to accept the recommendation, or type your own short answer. Expect topics like how "overdue" is determined at a date boundary, what the indicator looks like, and whether overdue items reorder or filter — but the actual questions depend on what your spec left open, so don't be surprised if they differ.

6. Answer each question with a specific decision. Vague answers produce vague requirements.

   > **Important:** Stay in this chat until the questioning finishes. Unlike the other commands, `/speckit-clarify` is an interactive loop and your answers only exist in this session until it writes them out.

7. SpecKit will add a `## Clarifications` section to `spec.md` with a `### Session YYYY-MM-DD` subsection containing one bullet per answer.
8. Commit and push your changes:
   ```bash
   git add .
   git commit -m "Clarify specification for overdue todo items"
   git push
   ```

#### Success Criteria
To complete this exercise successfully, ensure that:
- The file `specs/001-*/spec.md` has been updated
- The specification now contains a "Clarifications" section
- All ambiguities from the original spec have been addressed
- Additional requirements or constraints are documented

If you encounter any issues, you can:
- Make sure you're using Agent mode in Copilot chat
- Verify you started a new chat for this step
- Check that `/speckit-clarify` command was recognized
- Review that the spec file now contains the "Clarifications" section
- Ask Copilot to regenerate clarifications if needed

## Why?
The clarify step is crucial for reducing ambiguity and ensuring alignment before investing time in planning and implementation. By asking clarifying questions early, you capture important design and behavior decisions in writing. This creates a shared understanding and provides reference documentation for the implementation phase. It also prevents the common scenario where different team members have different assumptions about what needs to be built.
