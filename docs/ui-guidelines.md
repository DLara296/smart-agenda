# UI Guidelines - Todo App

## Overview
A clean, Material Design-inspired todo application with a Halloween theme. The interface features a single-column layout with generous spacing and supports both light and dark modes.

## Design System

### Color Palette

#### Light Mode
- **Background**: `#faf9f7` (off-white/cream)
- **Surface**: `#ffffff` (white)
- **Primary**: `#ff6b35` (Halloween orange)
- **Secondary**: `#004e89` (deep blue/purple)
- **Accent**: `#9d4edd` (purple)
- **Text Primary**: `#1a1a1a` (near black)
- **Text Secondary**: `#666666` (gray)
- **Border**: `#e0e0e0` (light gray)
- **Success**: `#2e7d32` (green for completed items)
- **Danger**: `#c62828` (red for delete actions)

#### Dark Mode
- **Background**: `#1a1a1a` (dark gray/black)
- **Surface**: `#2d2d2d` (charcoal)
- **Primary**: `#ff8c42` (bright Halloween orange)
- **Secondary**: `#9d4edd` (purple)
- **Accent**: `#bb86fc` (light purple)
- **Text Primary**: `#ffffff` (white)
- **Text Secondary**: `#b0b0b0` (light gray)
- **Border**: `#404040` (dark gray)
- **Success**: `#66bb6a` (light green)
- **Danger**: `#ef5350` (light red)

### Typography

- **Font Family**: System fonts (San Francisco, Segoe UI, Roboto, Ubuntu) or `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;`
- **Heading**: 28px, bold (700)
- **Subheading**: 18px, semi-bold (600)
- **Body**: 16px, regular (400)
- **Caption**: 12px, regular (400)
- **Button**: 14px, semi-bold (600)

### Spacing

All spacing follows an 8px grid system for consistency:
- **xs**: 8px (small gaps)
- **sm**: 16px (standard padding)
- **md**: 24px (section spacing)
- **lg**: 32px (major section spacing)
- **xl**: 48px (large gaps between major sections)

## Layout

### Overall Structure
- **Single Column**: Full-width responsive single column
- **Max Width**: 600px (on larger screens)
- **Margins**: Generous side margins (16px on mobile, 32px on desktop)
- **Padding**: All sections have `md` (24px) padding

### Header Section
- Page title: "My Todos"
- Halloween-themed icon or emoji (🎃 or similar)
- Dark/Light mode toggle (top-right corner)
- Spacing: `lg` below header

### Input Section (Inline Form at Top)
- **Location**: Directly below header
- **Layout**: Card container with `sm` padding
- **Background**: Primary color (orange)
- **Elements**:
  - Title input field (placeholder: "Add a new todo...")
  - Due date picker (optional)
  - "Add" button
  - Layout: Title field full-width, due date and button on second row
- **Spacing**: `md` bottom margin to separate from todo list

### Todo List Section
- **Container**: Scrollable list with `lg` top spacing
- **Empty State**: Display message "No todos yet. Add one to get started! 👻" when list is empty

## Components

### Todo Item Card
- **Container**: Card with subtle shadow and border radius (8px)
- **Background**: Surface color
- **Padding**: `sm` (16px)
- **Margin**: `sm` (16px) between cards
- **Border**: 1px solid border color
- **Hover Effect**: Subtle background color change (no animation, just instant change)

#### Card Layout
- **Checkbox**: Left side, vertically centered
- **Content Area**: Middle section with title and due date
  - Title text: `Body` typography
  - Due date (if present): `Caption` typography, text-secondary color
  - Layout: Title on top, due date below
- **Actions**: Right side with edit and delete buttons
  - Edit icon/button: Secondary color
  - Delete icon/button: Danger color

#### Completed State
- Title text: Strike-through with reduced opacity (0.6)
- Checkbox: Marked/filled with success color

### Input Fields
- **Border**: 1px solid border color
- **Border Radius**: 4px
- **Padding**: `sm` (16px)
- **Font**: Body typography
- **Focus State**: Border color changes to primary color
- **Placeholder**: Text-secondary color

### Buttons
- **Padding**: 8px 16px (vertical × horizontal)
- **Border Radius**: 4px
- **Font**: Button typography
- **Background**: Primary color
- **Text Color**: White
- **Hover State**: Slightly darker shade of background
- **Disabled State**: Opacity 0.5

#### Button Variants
- **Primary**: Orange background (primary color)
- **Secondary**: Transparent background with border
- **Danger**: Red background (danger color)

### Icons
- **Size**: 20px × 20px (standard), 24px × 24px (large)
- **Color**: Inherit from context (primary, secondary, danger)
- **Cursor**: Pointer on interactive icons

### Confirmation Dialog
- **Overlay**: Semi-transparent dark overlay
- **Dialog Box**: Centered, card-like container with rounded corners
- **Title**: "Delete Todo?"
- **Message**: "Are you sure you want to delete this todo? This action cannot be undone."
- **Buttons**: Cancel (secondary) and Delete (danger)
- **Padding**: `md` throughout dialog

## Interaction States

### Hover States (Desktop)
- Todo card: Subtle background color shift
- Buttons: Darker shade
- Icon buttons: Color shift to primary color

### Focus States
- Input fields: Border color to primary
- Buttons: Outline/focus indicator visible
- Icons: Color shift to primary

### Active States
- Pressed buttons: Even darker shade
- Checkboxes: Animated fill (if using native or styled checkboxes)

## Responsive Design

- **Mobile (< 768px)**: 
  - Margins: 16px
  - Max width: 100%
  - Stack all form elements vertically
  
- **Tablet (768px - 1024px)**:
  - Margins: 24px
  - Max width: 600px
  
- **Desktop (> 1024px)**:
  - Margins: 32px
  - Max width: 600px
  - Centered on screen

## Accessibility

- All interactive elements are keyboard accessible
- Color contrast meets WCAG AA standards
- Form labels are properly associated with inputs
- Icon buttons have descriptive titles/aria-labels
- Focus indicators are visible and distinct

## Dark/Light Mode Toggle

- **Toggle Button**: Located in top-right corner
- **Icon**: Sun/moon icon
- **Persistence**: Save user's preference in localStorage
- **System Preference**: Default to system preference on first visit

## Halloween Theme Elements

- **Icons & Emojis**: Use spooky elements (🎃, 👻, 🦇, 🕷️, etc.)
- **Accent Colors**: Orange (#ff6b35/#ff8c42) and purple (#9d4edd/#bb86fc)
- **Typography**: Consider using a spooky font for the header/title (optional)
- **Overall Vibe**: Playful and spooky, not scary or disturbing

## Material Design Principles

- **Elevation**: Cards have subtle shadows to create depth
- **Color**: Strategic use of color to guide user attention
- **Typography**: Clear hierarchy with consistent sizing
- **Motion**: Minimal to no motion (per requirements)
- **Shape**: 4-8px border radius for modern feel
