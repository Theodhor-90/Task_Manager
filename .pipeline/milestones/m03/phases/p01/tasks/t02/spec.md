## Objective

Create the top header bar for the authenticated application layout. The header displays the page title, user info, and logout functionality.

## Deliverables

### Header Component
- **File**: `packages/client/src/components/header.tsx` (Create)
- Renders a fixed-height header bar with:
  - The current page title on the left (accepted as a prop or derived from route)
  - The logged-in user's display name on the right
  - A "Logout" button on the right
- Logout calls `auth.logout()` from the existing `useAuth()` hook
- Styled with Tailwind: white background, bottom border, horizontal padding
- Named export: `Header`

## Constraints

- TypeScript strict mode, named exports
- Uses the existing `useAuth()` hook from `packages/client/src/context/auth-context.tsx` to access user info and logout
- Tailwind CSS for styling — consistent with a clean, professional aesthetic
- kebab-case filename, PascalCase component name

## Dependencies

- Task 1 (Shared UI Components) — no direct import dependency, but establishes the UI component pattern
- Existing `AuthContext` and `useAuth()` hook must be available

## Verification

1. `packages/client/src/components/header.tsx` exists and compiles without errors
2. Header renders the page title on the left side
3. Header shows the logged-in user's display name
4. Header shows a "Logout" button that calls `auth.logout()` when clicked
5. Header is styled with white background and bottom border
6. Component uses named export