## Objective

Connect the existing `DashboardPage` scaffold (built in Phase 1) to the `ProjectFormModal`, `ProjectCard`, and `ConfirmDialog` components to enable complete project management operations (create, edit, delete) from the dashboard.

## Deliverables

- **Modify**: `packages/client/src/pages/dashboard-page.tsx`
- **Modify**: `packages/client/src/pages/__tests__/dashboard-page.test.tsx` (add tests for CRUD flows)

## Implementation Details

- Add state variables:
  - `isCreateOpen: boolean` — controls create modal
  - `editingProject: Project | null` — when set, opens `ProjectFormModal` in edit mode
  - `deletingProject: Project | null` — when set, opens `ConfirmDialog`
- **"New Project" button** on the dashboard opens `ProjectFormModal` in create mode (sets `isCreateOpen = true`)
- Render project list using `ProjectCard` components (replacing any existing inline rendering)
- Each `ProjectCard` receives:
  - `onEdit`: sets `editingProject` to the clicked project (opens edit modal)
  - `onDelete`: sets `deletingProject` to the clicked project (opens confirm dialog)
- **`ConfirmDialog` message**: "Are you sure you want to delete \"{project.name}\"? All boards, tasks, comments, and labels in this project will be permanently deleted."
- Confirm handler calls `useProjects().removeProject(id)`, shows `ErrorMessage` on failure
- Close/cancel callbacks reset corresponding state (`isCreateOpen = false`, `editingProject = null`, `deletingProject = null`)

## Dependencies

- **Task 1** (`ProjectFormModal`) — must be completed first
- **Task 2** (`ProjectCard`) — must be completed first
- Phase 1 components: `ConfirmDialog`, `ErrorMessage`, `LoadingSpinner`
- `ProjectsContext` with `removeProject()` method

## Verification Criteria

1. "New Project" button opens `ProjectFormModal` in create mode
2. Creating a project adds it to the dashboard grid and sidebar
3. Clicking edit on a `ProjectCard` opens `ProjectFormModal` pre-filled with project data
4. Saving edits updates the project in the dashboard grid and sidebar
5. Clicking delete on a `ProjectCard` opens `ConfirmDialog` with cascade warning
6. Confirming delete removes the project from the dashboard grid and sidebar
7. Canceling any operation (create, edit, delete) leaves the project list unchanged
8. API errors during delete display an error message and revert optimistic removal
9. All new and existing dashboard tests pass