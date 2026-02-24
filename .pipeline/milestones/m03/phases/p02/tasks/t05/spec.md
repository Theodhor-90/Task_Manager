## Objective

Verify and ensure that the sidebar correctly supports project navigation, active-project highlighting on all routes, and real-time synchronization with project CRUD operations performed on the dashboard.

## Deliverables

- **Verify/Modify**: `packages/client/src/components/sidebar.tsx`
- **Verify/Modify**: sidebar tests if updates are needed

## Implementation Details

- Verify that `NavLink` with `isActive` styling correctly highlights the active project when on `/projects/:id/board` routes
- Verify the sidebar updates immediately when projects are created, edited, or deleted (should already work via shared `ProjectsContext`)
- Verify sidebar displays updated project names after an edit operation
- If any of the above verifications fail, fix the underlying issues
- Update sidebar tests if needed to cover:
  - Project list reflects `ProjectsContext` changes (add, update, remove)
  - Active state is correct on board routes
  - Sidebar shows updated project name after edit

## Dependencies

- **Tasks 1-4** — should be completed first so CRUD flows can be verified end-to-end
- `ProjectsContext` providing reactive project list
- React Router `NavLink` for active state detection

## Verification Criteria

1. Sidebar project list updates when a project is created on the dashboard
2. Sidebar project list updates when a project is deleted on the dashboard
3. Sidebar shows the new project name after a project is edited on the dashboard
4. Active project is highlighted correctly when navigating to `/projects/:id/board`
5. All sidebar tests pass (existing + any new ones)