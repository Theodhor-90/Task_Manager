## Objective

Update the board page to work within the new AppLayout, display the project name, and show a meaningful placeholder for the kanban board (coming in Milestone 4). Ensure sidebar highlights the correct project.

## Deliverables

### Board Page Update
- **File**: `packages/client/src/pages/board-page.tsx` (Modify)
- Remove the PRIORITIES debug display (existing debug content)
- Show the project name in a heading (fetched via route param `:id` from the projects context or a direct API call)
- Display a "Board coming in Milestone 4" placeholder message
- Ensure the sidebar highlights the correct project when this page is active (this should work automatically via React Router's `NavLink` active state if sidebar is implemented correctly)

## Constraints

- TypeScript strict mode, named exports
- Tailwind CSS styling
- Works within the `AppLayout` shell
- Uses route param `id` from React Router to identify the project
- Can use `useProjects()` from ProjectsContext to find project name, or fetch directly

## Dependencies

- Task 4 (Projects Context) — for accessing project data by ID
- Task 5 (AppLayout and Router Integration) — page renders inside the layout
- Task 3 (Sidebar) — sidebar `NavLink` active styling should highlight the current project

## Verification

1. Board page renders inside the app shell layout
2. The project name is displayed as a heading (not just the ID)
3. A placeholder message indicates the board is coming in Milestone 4
4. No PRIORITIES debug display is present
5. The sidebar highlights the correct project when viewing `/projects/:id/board`
6. Page compiles without TypeScript errors
7. Navigating to `/projects/:id/board` from the sidebar or dashboard renders this page correctly