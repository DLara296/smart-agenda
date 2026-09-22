# Step 6-2: Establish Project Constitution

## Goal
Create a project constitution that defines governing principles and development guidelines. This ensures all AI-generated code follows your team's standards, coding conventions, and quality principles.

## Choosing a Model

Spec-driven development leans heavily on reasoning quality, so use the most capable model available to you. In the GitHub Copilot chat **Model selector** dropdown, pick a current frontier model — at time of writing, the latest Claude Sonnet or Claude Opus. You can switch models at any time from the same dropdown.

## Instructions

### :keyboard: Activity: Use SpecKit to create the project constitution

1. Open the **Copilot** chat panel and switch to **Agent** mode using the dropdown menu.
2. Select a capable model from the **Model selector** dropdown (see above).
3. Start a **new chat** (a lab convention — see "A note on chat sessions" in Step 6-1).
4. In the Copilot chat input field, use the SpecKit slash command to create your constitution:
   ```
   /speckit-constitution create principles based on existing guidelines in the docs folder
   ```
5. Review the generated constitution in `.specify/memory/constitution.md` to ensure it reflects your project's actual practices. SpecKit fills in every `[ALL_CAPS]` placeholder in the template, so check that the principles it inferred are ones you'd actually stand behind.
6. Read the **Sync Impact Report** SpecKit prepends to the file as an HTML comment. It records the version it assigned, what changed, and any `TODO(...)` items it deferred because it couldn't determine a value. Anything left as a TODO is yours to resolve.
7. Commit and push your changes:
   ```bash
   git add .
   git commit -m "Establish project constitution with SpecKit"
   git push origin feature/speckit
   ```

#### Success Criteria
To complete this exercise successfully, ensure that:
- The file `.specify/memory/constitution.md` has been updated with project-specific principles
- The constitution contains actual principles (not placeholder names like "PRINCIPLE_1_NAME")
- The constitution references your existing documentation (coding-guidelines.md, testing-guidelines.md, ui-guidelines.md, functional-requirements.md)
- Changes are committed and pushed to the `feature/speckit` branch

If you encounter any issues, you can:
- Make sure you're using Agent mode in Copilot chat
- Verify that the docs folder contains your project guidelines
- Check that `.specify/memory/constitution.md` was updated with real content
- Ask Copilot to regenerate the constitution if it contains placeholder text

## Why?
The constitution serves as the foundation for all spec-driven development in your project. It ensures consistency across all AI-generated specifications, plans, and implementations. By establishing clear principles upfront, you guide the AI to produce code that aligns with your team's standards, architectural decisions, testing requirements, and UI/UX guidelines. This reduces rework and maintains code quality throughout the development lifecycle.
