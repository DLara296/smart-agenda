# Project Overview

## Mission
Smart Agenda is a responsive school coordination platform focused on reading programs and event scheduling. It helps school coordinators manage reading sessions, assign volunteers, validate language coverage, communicate with families, retain participation history, and avoid manual scheduling errors.

## Problem Statement
The current workflow is fragmented and relies on manual coordination across WhatsApp, email, and ad hoc records. The process is error-prone when matching volunteers to groups, languages, dates, and cancellation scenarios. Smart Agenda centralizes the workflow into a structured, auditable system that remains configurable for different school settings.

## Product Vision
Provide a secure, role-aware system for schools and family volunteers that can schedule reading sessions, track attendance, confirm volunteeers, notify stakeholders, and preserve history without hard-coding the current two-group and two-teacher scenario.

## MVP Scope
- Admin invitation and registration
- Guest and family registration
- School, grade, group, and teacher management
- Session creation and rotation logic
- Volunteer coverage validation and language matching
- Manual volunteer assignment with audit trail
- Notification scheduling and provider abstraction
- Cancellation and replacement handling
- Dashboard and history for operational oversight

## Non-Goals for MVP
- Full AI interpretation of WhatsApp replies
- Multi-school analytics beyond basic reporting
- Native mobile apps
- Deep calendar integrations outside the initial platform

## Stakeholders
- School administrators and coordinators
- Teachers and staff
- Families, guardians, and relatives
- Students and their school assignments
- Support and operations teams

## Product Principles
- Keep the user interface understandable and fast
- Protect child and family data by default
- Prefer explicit domain modeling and auditable state transitions
- Support manual override paths while keeping the system consistent
- Design for mobile, tablet, and desktop usage

## Success Criteria
- A coordinator can create a session and validate group coverage
- A volunteer can be assigned only when eligible and correctly matched to language
- A missing volunteer is visible on the dashboard and can trigger follow-up actions
- A cancellation and replacement are preserved in history without erasing the original record
- A teacher receives a notification at the configured time with proper status tracking
