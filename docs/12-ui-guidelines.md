# UI Guidelines

## Purpose
The Smart Agenda interface should remain clean, trusted, and operationally useful for school coordinators and family users. The system must prioritize clear status visibility and low cognitive load.

## Responsive Strategy
- Mobile-first layout with adaptive breakpoints for desktop and tablet
- Dashboard remains readable on narrow screens without hiding critical warnings
- Forms stack appropriately and preserve keyboard usability

## Navigation
- Primary navigation groups: Dashboard, Sessions, Schools, Families, Notifications, History, Settings
- Provide clear access to the next reading session, active alerts, and summary cards
- Ensure keyboard focus movement is visible and logical

## Design Tokens
- Primary action color: blue or school-safe brand tone
- Warning color: amber for missing volunteer states
- Success color: green for confirmed coverage
- Danger color: red for cancellations or required action
- Accent text: consistent typography and spacing based on an 8px grid

## Layout Patterns
- Use cards for summary metrics, school records, and session states
- Use tables and lists for operational data with status badges
- Prefer reserved space for validation and error states

## Forms
- Label all inputs with clear descriptions and required markers
- Provide inline validation and accessible errors
- Keep destructive or irreversible actions behind confirmation dialogs

## Sessions and Dashboard
The dashboard must surface:
- next reading session
- participating groups
- teacher and language assignments
- confirmed volunteers
- missing volunteers
- cancellations
- notifications by status
- items needing attention today

## Status Visualization
- Use badges and color-coded states for pending, confirmed, failed, cancelled, and missing coverage
- Maintain consistent semantics across the app

## Loading and Empty States
- Show skeletons or spinners only when appropriate for data latency
- Empty states must explain what is missing and what the user can do next
- Error states must provide clear recovery actions

## Accessibility
- Maintain color contrast and keyboard focus visibility
- Use semantic markup and ARIA where it improves clarity
- Ensure forms, dialogs, and state changes are screen-reader friendly

## Mobile Behavior
- Use sticky action bars where actions belong at the bottom of a screen
- Avoid dense tables on small screens; prefer stacked cards or summary panels
- Keep gestures and tap targets large enough for usability
