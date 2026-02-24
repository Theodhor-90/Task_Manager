## Objective

Enhance the existing login page with production-ready visual design and UX improvements including loading states, error display, and proper form handling.

## Deliverables

### Login Page Enhancement
- **File**: `packages/client/src/pages/login-page.tsx` (Modify)
- Improve the visual design:
  - Centered card layout on a light gray background
  - TaskBoard branding/title above the form
  - Properly styled email and password inputs with labels
  - Submit button with loading state (spinner + disabled while authenticating)
  - `ErrorMessage` component (from t01) for displaying login failures
- Ensure the form handles Enter key submission
- Ensure redirect-to-dashboard-if-already-authenticated works correctly (if user navigates to `/login` while already logged in, redirect to `/`)

## Constraints

- TypeScript strict mode, named exports
- Imports `ErrorMessage` and `LoadingSpinner` from `components/ui/`
- Uses the existing `useAuth()` hook for login and auth state checking
- Tailwind CSS styling — clean, professional login form aesthetic
- Must not break the existing login functionality — enhance, don't rebuild

## Dependencies

- Task 1 (Shared UI Components) — imports `ErrorMessage`, `LoadingSpinner`
- Existing `AuthContext`, `useAuth()`, `login()` API function
- Task 5 (Router Integration) — login page must work correctly with the new route structure

## Verification

1. Login page renders a centered card on a light gray background
2. TaskBoard branding/title is displayed above the form
3. Email and password fields have proper labels and styling
4. Submit button shows a loading spinner and is disabled during authentication
5. Failed login attempts display an error message via `ErrorMessage` component
6. Successful login redirects to the dashboard (`/`)
7. Navigating to `/login` while already authenticated redirects to `/`
8. Enter key submits the form
9. The page renders outside the app shell (no sidebar or header)