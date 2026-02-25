## Objective

Connect the sidebar's "New Project" button to open the create project modal from anywhere in the app, by lifting modal state into `AppLayout`.

## Deliverables

- **Modify**: `packages/client/src/components/app-layout.tsx`
- **Modify**: `packages/client/src/components/__tests__/app-layout.test.tsx` (add test for sidebar button triggering modal)

## Implementation Details

- Add `isCreateModalOpen` state to `AppLayout`
- Replace the existing no-op `handleCreateProject` callback with `() => setIsCreateModalOpen(true)`
- Render `ProjectFormModal` (create mode, no `project` prop) within `AppLayout`, controlled by `isCreateModalOpen` state
- `onClose` callback sets `isCreateModalOpen = false`
- When on the dashboard page, two "create" triggers exist: the sidebar button and the dashboard's own "New Project" button — both should work independently
- Consider potential duplicate modal issue: if dashboard also renders a `ProjectFormModal`, ensure only one modal is shown at a time (either coordinate via context or accept that each trigger opens its own modal instance)

## Dependencies

- **Task 1** (`ProjectFormModal`) — must be completed first
- Phase 1 components: `Sidebar`, `AppLayout` (existing scaffold)

## Verification Criteria

1. Clicking the sidebar "New Project" button opens the `ProjectFormModal`
2. Creating a project via the sidebar-triggered modal adds it to the project list
3. The modal closes correctly after successful creation or on cancel
4. The sidebar button works on all authenticated routes (dashboard, board page, etc.)
5. Updated `AppLayout` tests pass, including the new test for sidebar create button