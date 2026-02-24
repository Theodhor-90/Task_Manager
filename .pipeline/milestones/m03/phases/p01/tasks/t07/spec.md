## Objective

Update the dashboard page to work within the new AppLayout and prepare it for Phase 2's project list implementation. The page should look intentional with proper structure, not a bare placeholder.

## Deliverables

### Dashboard Page Update
- **File**: `packages/client/src/pages/dashboard-page.tsx` (Modify)
- Remove the standalone logout button (now handled by Header component)
- Add a page title ("Projects" or "Dashboard")
- Render a placeholder area where the project list will be built in Phase 2
- Show a "New Project" button that will be connected in Phase 2
- The page should look intentional — a proper empty state or a minimal project grid layout — not a bare placeholder
- Should consume `useProjects()` from ProjectsContext to display project count or basic info

## Constraints

- TypeScript strict mode, named exports
- Tailwind CSS styling
- Works within the `AppLayout` shell (no standalone header/nav elements)
- Must not duplicate sidebar functionality
- Keep it minimal — Phase 2 will build the full project list, create/edit/delete flows

## Dependencies

- Task 4 (Projects Context) — can use `useProjects()` for project data
- Task 5 (AppLayout and Router Integration) — page renders inside the layout via `<Outlet />`
- The standalone logout button removal assumes Header (t02) is handling logout

## Verification

1. Dashboard page renders inside the app shell layout (sidebar visible, header visible)
2. No standalone logout button on the dashboard (handled by header)
3. Page displays a "Projects" or "Dashboard" heading
4. A "New Project" button is visible (can be non-functional placeholder for now)
5. Page has a clean, intentional layout — not a blank page
6. Page compiles without TypeScript errors
7. Navigation to `/` after login shows this dashboard page within the layout