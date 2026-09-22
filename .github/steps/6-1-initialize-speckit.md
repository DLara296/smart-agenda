# Step 6-1: Initialize SpecKit in Your Project

## Overview
Welcome to Session 6! In this lesson, we're building on top of the foundation you created in Session 2. You already have a working todo application with context documents that guide Copilot. Now, we'll use **SpecKit** to add new functionality to the application using Spec-Driven Development - a structured approach that focuses on specifications, plans, and tasks before implementation.

Before we begin with SpecKit, let's verify that your todo application is working correctly.

## Goal
Initialize SpecKit in your project to enable Spec-Driven Development with structured workflows and slash commands for your AI coding assistant.

## Choosing a Model

Spec-driven development leans heavily on reasoning quality, so use the most capable model available to you. In the GitHub Copilot chat **Model selector** dropdown, pick a current frontier model — at time of writing, the latest Claude Sonnet or Claude Opus. You can switch models at any time from the same dropdown.

## Instructions

### :keyboard: Activity: Launch a Codespace for this repository and create a new branch

Click the below button to open the **Create Codespace** page in a new tab. Use the default configuration.

   [![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/{{full_repo_name}}?quickstart=1)

:pencil2: Create a new branch called `feature/speckit`. :pencil2:

#### :keyboard: Activity: Verify the application is running

1. Open a **terminal** in your Codespace.
2. Start the application:
   ```bash
   npm start
   ```
3. Verify that both the frontend and backend start successfully and the todo app is accessible.
4. Stop the application (Ctrl+C) once you've confirmed it's working.

#### :keyboard: Activity: Initialize SpecKit

> **Note:** The `uv` package manager should be automatically installed in your Codespace. If for any reason you need to install it manually, follow the instructions at [https://docs.astral.sh/uv/getting-started/installation/](https://docs.astral.sh/uv/getting-started/installation/).

1. Install the SpecKit CLI tool using `uv`, pinned to a known-good release:
   ```bash
   uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v0.16.2
   ```

   > **Note:** The version is pinned on purpose. SpecKit is under active development and its commands and directory layout change between releases; pinning keeps this lab reproducible. To try the newest release instead, replace `v0.16.2` with the latest tag from the [SpecKit releases page](https://github.com/github/spec-kit/releases) — but expect small differences from the instructions below.

2. Initialize SpecKit in the current project directory:
   ```bash
   specify init --here --force --integration copilot --extension git
   ```

   > **Note:** The `--extension git` flag is required for this lab. As of v0.16.0, core SpecKit no longer creates a Git branch for you — that behavior lives in the optional `git` extension. The lab's automated checks look for a `001-*` feature branch, so without this flag the later steps will never be marked complete.

3. Verify that SpecKit created two things:
   - `.specify/` — templates, scripts, and `memory/constitution.md`
   - `.github/skills/speckit-*/` — the SpecKit skills that Copilot will expose as slash commands

4. Commit and push your changes:
   ```bash
   git add .
   git commit -m "Initialize SpecKit for spec-driven development"
   git push origin feature/speckit
   ```

#### A note on command names

SpecKit installs its commands for Copilot as **agent skills**, which you invoke with a **hyphen**:

```
/speckit-constitution    ✅ correct
/speckit.constitution    ❌ older syntax, no longer recognized
```

You'll use these throughout the remaining steps. Older tutorials and blog posts use the dotted form — if a command isn't recognized, check the separator first.

Here's the full set you now have available:

| Command | Used in | What it does |
| --- | --- | --- |
| `/speckit-constitution` | Step 6-2 | Establish governing principles |
| `/speckit-specify` | Step 6-3 | Define what to build |
| `/speckit-clarify` | Step 6-4 | Resolve ambiguity before planning |
| `/speckit-plan` | Step 6-5 | Decide how to build it |
| `/speckit-tasks` | Step 6-6 | Break the plan into tasks |
| `/speckit-analyze` | Step 6-7 | Check spec, plan, and tasks against each other |
| `/speckit-implement` | Step 6-7 | Execute the tasks |
| `/speckit-converge` | Step 6-7 | Find unbuilt work and queue it as new tasks |
| `/speckit-checklist` | Optional | Quality-check your requirements |
| `/speckit-taskstoissues` | Not used here | Turn tasks into GitHub issues |

#### A note on chat sessions

The steps that follow ask you to start a **new chat** before each command. That's a convention of this lab, not a SpecKit requirement — every command reads its inputs from files on disk (`spec.md`, `plan.md`, `tasks.md`, `constitution.md`), never from your conversation history. Nothing breaks if you stay in one long chat.

It's still a good default: a fresh chat keeps the agent from being influenced by earlier discussion that has since been superseded. Two places where it matters more than usual:

- **Don't** start a new chat partway through `/speckit-clarify`. It's an interactive question-and-answer loop, and your answers need to stay in one session.
- **Do** start a fresh one before `/speckit-analyze` and `/speckit-converge`. Both assess what's actually on disk, and running them in the session that just produced that work invites the agent to answer from memory of what it meant to do.

#### Success Criteria
To complete this exercise successfully, ensure that:
- A new `feature/speckit` branch is pushed
- The `.specify/` directory exists in the project root
- The file `.specify/memory/constitution.md` exists
- The `.specify/` directory contains the SpecKit templates and configuration
- The `.github/skills/` directory contains the `speckit-*` skills (including `speckit-git-feature` from the `git` extension)

If you encounter any issues, you can:
- Double check that the newly pushed branch is called `feature/speckit`
- Verify that `uv` is installed by running `uv --version`
- Review that `.specify/memory/constitution.md` was created
- Check that the specify init command ran successfully without errors
- Confirm the `git` extension installed by running `specify extension list` — you should see `git` in the output

## Why?
Initializing SpecKit sets up your project with the tools and templates needed for Spec-Driven Development. This structured approach helps you build high-quality software by focusing on specifications, plans, and tasks before implementation - rather than "vibe coding" from scratch. The `.specify/` directory contains templates for constitution, specifications, plans, and tasks that guide the development process.
