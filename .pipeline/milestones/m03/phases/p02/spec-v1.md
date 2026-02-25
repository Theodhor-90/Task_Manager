Now I have a thorough understanding of the complete codebase. Let me produce the phase specification.

# Phase 2: Project Dashboard

## Goal

Deliver a fully interactive project management dashboard that connects the existing UI scaffolding to the project CRUD API — enabling the user to create new projects via a modal form, edit existing project details, delete projects with a confirmation warning, and click through to the board view — while keeping the sidebar project list and dashboard grid synchronized through the shared `ProjectsContext`.

## Design Decisions

### 1. Create/Edit via Modal, not inline editing
Both create and edit operations use the `Modal` component (already built in Phase 1). A single `ProjectFormModal` component handles both modes, receiving an optional `project` prop — when present it pre-fills the form for editing; when absent it renders a blank form for creation. This avoids duplicating form logic and keeps the interaction pattern consistent.

**Rationale**: The `Modal` component already supports title, ESC-to-close, backdrop-click-to-close, and body scroll lock. Reusing it for both create and edit reduces code and gives users a uniform experience. Inline editing adds complexity (focus management, click-outside detection per card) with little benefit for an MVP.

### 2. Shared state via ProjectsContext — no additional data layer
All project CRUD operations flow through the existing `ProjectsContext` (`addProject`, `updateProject`, `removeProject`). The sidebar reads from the same context, so mutations on the dashboard automatically reflect in the sidebar without extra synchronization logic.

**Rationale**: Phase 1 already built `ProjectsProvider` with optimistic delete and immediate state updates on create/edit. Adding another data layer (React Query, SWR, Zustand) would be over-engineering for a single-user app.

### 3. Delete uses ConfirmDialog with explicit cascade warning
Deleting a project shows the existing `ConfirmDialog` with a message explaining that all boards, tasks, comments, and labels will be permanently deleted. The confirm button is labeled "Delete" and styled with the red destructive pattern already established in `ConfirmDialog`.

**Rationale**: Cascade deletion is irreversible. An explicit warning prevents accidental data loss.

### 4. Project cards are clickable, with edit/delete on hover or via action buttons
Each project card in the grid is a clickable `<Link>` to `/projects/:id/board`. Edit and delete actions appear as icon buttons (pencil, trash) that stop event propagation so clicks on them don't trigger navigation.

**Rationale**: The primary action for a project card is navigation to the board. Secondary actions (edit, delete) are visually secondary but accessible without extra clicks.

### 5. Form validation is client-side only (name required, non-empty)
The create/edit form validates that `name` is a non-empty string before submission. No additional validation (length limits, duplicate name checks) is added client-side — the server enforces those constraints and the API client surfaces server errors via `ErrorMessage`.

**Rationale**: The server already validates input. Duplicating complex validation client-side adds maintenance burden without meaningful UX improvement for a single-user MVP.

### 6. Sidebar "New Project" button triggers the same modal
The `onCreateProject` callback passed to `Sidebar` (already wired but no-op in Phase 1) opens the same create project modal. The modal state is lifted to `AppLayout` so both the sidebar button and dashboard button can trigger it.

**Rationale**: The modal state must be accessible from both the sidebar (in `AppLayout`) and the dashboard page. Lifting modal-open state to `AppLayout` keeps it in scope for both triggers.

### 7. Loading and error states on form submission
During form submission, the submit button shows a disabled/loading state. On error, the error message is displayed inside the modal above the form buttons. On success, the modal closes automatically.

**Rationale**: Prevents double-submission and gives clear feedback without leaving the modal context.

## Tasks

### Task 1: Create `ProjectFormModal` component

Build a reusable modal form component for creating and editing projects.

**Deliverables**:
- New file: `packages/client/src/components/project-form-modal.tsx`
- Named export: `ProjectFormModal`
- Props interface:
  ```typescript
  interface ProjectFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    project?: Project;  // if provided, edit mode; if absent, create mode
  }
  ```
- Uses the existing `Modal` component with title "New Project" or "Edit Project" based on mode
- Form fields: `name` (text input, required) and `description` (textarea, optional)
- Pre-fills fields when `project` prop is provided
- Calls `useProjects().addProject()` on create, `useProjects().updateProject()` on edit
- Disabled submit button with "Creating..." / "Saving..." text during API call
- Displays inline `ErrorMessage` inside modal on failure
- Clears form and closes modal on success
- Unit tests in `packages/client/src/components/__tests__/project-form-modal.test.tsx`

### Task 2: Create `ProjectCard` component

Extract project card rendering into a dedicated component with edit and delete action buttons.

**Deliverables**:
- New file: `packages/client/src/components/project-card.tsx`
- Named export: `ProjectCard`
- Props interface:
  ```typescript
  interface ProjectCardProps {
    project: Project;
    onEdit: (project: Project) => void;
    onDelete: (project: Project) => void;
  }
  ```
- Renders: project name, truncated description (`line-clamp-2`), creation date
- Wraps card content in `<Link to={/projects/${project._id}/board}>` for navigation
- Edit (pencil icon) and delete (trash icon) buttons that call `onEdit`/`onDelete` with `e.preventDefault()` and `e.stopPropagation()` to prevent navigation
- Uses existing Tailwind patterns: `rounded-lg border border-gray-200 bg-white p-4 shadow-sm`
- Hover state on action buttons for discoverability
- Unit tests in `packages/client/src/components/__tests__/project-card.test.tsx`

### Task 3: Wire up `DashboardPage` with full CRUD interactions

Connect the dashboard page to the `ProjectFormModal`, `ProjectCard`, and `ConfirmDialog` to enable all project management operations.

**Deliverables**:
- Modify: `packages/client/src/pages/dashboard-page.tsx`
- State management: `isCreateOpen`, `editingProject`, `deletingProject` state variables
- "New Project" button opens `ProjectFormModal` in create mode
- Each `ProjectCard` receives `onEdit` (opens `ProjectFormModal` in edit mode) and `onDelete` (opens `ConfirmDialog`) callbacks
- `ConfirmDialog` message: "Are you sure you want to delete \"{project.name}\"? All boards, tasks, comments, and labels in this project will be permanently deleted."
- Confirm handler calls `useProjects().removeProject(id)`, shows error via `ErrorMessage` on failure
- Close modal/dialog callbacks reset corresponding state
- Update existing tests in `packages/client/src/pages/__tests__/dashboard-page.test.tsx` to cover: create flow, edit flow, delete flow with confirmation, cancel flows, error handling

### Task 4: Wire sidebar "New Project" button via `AppLayout`

Connect the sidebar's "New Project" button to open the create project modal from anywhere in the app.

**Deliverables**:
- Modify: `packages/client/src/components/app-layout.tsx`
- Add `isCreateModalOpen` state to `AppLayout`
- Replace the no-op `handleCreateProject` with `() => setIsCreateModalOpen(true)`
- Render `ProjectFormModal` (create mode) within `AppLayout`, controlled by `isCreateModalOpen`
- When on the dashboard, two create buttons exist (sidebar + dashboard header) — both open the same modal via context or state
- Update tests in `packages/client/src/components/__tests__/app-layout.test.tsx` to verify the sidebar button triggers the modal

### Task 5: Update `Sidebar` to support project navigation from dashboard

Ensure clicking a project in the sidebar navigates correctly and the active project is highlighted on all routes.

**Deliverables**:
- Verify: `packages/client/src/components/sidebar.tsx` — `NavLink` with `isActive` styling already works for `/projects/:id/board` routes
- Ensure the sidebar updates immediately when projects are created, edited, or deleted (already handled via shared `ProjectsContext`)
- Verify sidebar displays updated project names after an edit
- Update sidebar tests if needed to cover: project list reflects context changes, active state on board route

### Task 6: Integration verification and test cleanup

Run all client tests, verify all CRUD flows work end-to-end against the dev server, and ensure no regressions.

**Deliverables**:
- All existing Phase 1 tests continue to pass
- All new tests from Tasks 1–5 pass
- Manual verification: login → create project → see it in sidebar and dashboard → edit project → see updated name everywhere → delete project → confirm → project gone from sidebar and dashboard → click project card → navigate to board page
- `npm run lint` and `npm run typecheck` pass with no errors (if configured)

## Exit Criteria

1. A "New Project" button on the dashboard opens a modal with name (required) and description (optional) fields; submitting creates the project and it appears in both the dashboard grid and sidebar without page reload.
2. A "New Project" button in the sidebar opens the same create modal and works identically.
3. Each project card displays the project name, truncated description, and creation date, and is clickable to navigate to `/projects/:id/board`.
4. An edit button on each project card opens a modal pre-filled with the project's current name and description; saving updates the project in the dashboard grid and sidebar.
5. A delete button on each project card opens a confirmation dialog warning about cascade deletion of all related data; confirming deletes the project and removes it from the dashboard grid and sidebar.
6. Canceling a create, edit, or delete operation leaves the project list unchanged.
7. API errors during create, edit, or delete display an error message to the user without losing form data (for create/edit) or corrupting the project list (for delete, the optimistic removal is reverted).
8. The sidebar project list stays in sync with the dashboard project list for all operations (create, edit, delete).
9. All client-side unit tests pass (`npm run test` in `packages/client`).
10. No TypeScript compilation errors (`npm run typecheck` or `tsc --noEmit`).

## Dependencies

- **Phase 1 (m03/p01) completed**: `AppLayout`, `Header`, `Sidebar`, `ProtectedRoute`, `Modal`, `ConfirmDialog`, `LoadingSpinner`, `ErrorMessage`, `LoginPage`, `DashboardPage` (scaffold), `BoardPage` (placeholder), `AuthContext`, `ProjectsContext`, API client with JWT auth, React Router configuration — all delivered and tested.
- **Milestone 2 (Core API) completed**: All project CRUD endpoints operational — `GET /api/projects`, `POST /api/projects`, `GET /api/projects/:id`, `PUT /api/projects/:id`, `DELETE /api/projects/:id` — with correct response envelopes, cascade deletion, and board auto-creation.
- **Shared types available**: `Project`, `ApiSuccessResponse`, `ApiErrorResponse` from `@taskboard/shared`.
- **Dev environment**: `npm run dev` starts both Fastify server (port 3001) and Vite dev server (port 5173) with proxy for `/api` routes.

## Artifacts

| Artifact | Action | Description |
|----------|--------|-------------|
| `packages/client/src/components/project-form-modal.tsx` | Create | Modal form for creating and editing projects |
| `packages/client/src/components/project-card.tsx` | Create | Project card with navigation, edit, and delete actions |
| `packages/client/src/pages/dashboard-page.tsx` | Modify | Wire up CRUD interactions with modals and project cards |
| `packages/client/src/components/app-layout.tsx` | Modify | Add create-project modal state, wire sidebar button |
| `packages/client/src/components/__tests__/project-form-modal.test.tsx` | Create | Tests for ProjectFormModal component |
| `packages/client/src/components/__tests__/project-card.test.tsx` | Create | Tests for ProjectCard component |
| `packages/client/src/pages/__tests__/dashboard-page.test.tsx` | Modify | Add tests for create, edit, delete flows |
| `packages/client/src/components/__tests__/app-layout.test.tsx` | Modify | Add test for sidebar create button triggering modal |