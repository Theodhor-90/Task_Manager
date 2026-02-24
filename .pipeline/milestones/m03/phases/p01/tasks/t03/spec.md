## Objective

Create the sidebar navigation panel that displays project navigation, branding, and a "New Project" action button. The sidebar is a presentational component that receives data via props.

## Deliverables

### Sidebar Component
- **File**: `packages/client/src/components/sidebar.tsx` (Create)
- A fixed-width left sidebar containing:
  - App logo/title ("TaskBoard") at the top
  - A "New Project" button that triggers a `onCreateProject` callback prop
  - A scrollable list of project names as `NavLink` elements linking to `/projects/:id/board`
  - Active-project highlighting: bold text or accent background when the route matches
- Shows a `LoadingSpinner` (from t01) while projects are loading
- Shows an empty-state message ("No projects yet") when the list is empty
- Props: `projects`, `isLoading`, `onCreateProject`
- Data fetching is NOT done inside the sidebar — it receives data from its parent
- Named export: `Sidebar`

## Constraints

- TypeScript strict mode, named exports
- Uses React Router's `NavLink` for project links with active state styling
- Imports `LoadingSpinner` from `components/ui/loading-spinner.tsx`
- Tailwind CSS styling — fixed width sidebar aesthetic
- kebab-case filename, PascalCase component name

## Dependencies

- Task 1 (Shared UI Components) — imports `LoadingSpinner`
- React Router `NavLink` from existing setup
- Project type from `@taskboard/shared` or locally defined

## Verification

1. `packages/client/src/components/sidebar.tsx` exists and compiles without errors
2. Sidebar renders "TaskBoard" branding at the top
3. Sidebar renders a "New Project" button that fires the `onCreateProject` callback
4. Sidebar renders a list of project `NavLink` elements pointing to `/projects/:id/board`
5. Active project link is visually highlighted when on a matching route
6. Shows `LoadingSpinner` when `isLoading` is true
7. Shows "No projects yet" when projects array is empty and not loading
8. Component is purely presentational — no internal data fetching