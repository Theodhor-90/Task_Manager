Now I have a complete understanding of all the existing code. Let me produce the implementation plan.

# Task 3 Implementation Plan: Wire up `DashboardPage` with full CRUD interactions

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/client/src/pages/dashboard-page.tsx` | Modify | Add CRUD state management, wire ProjectFormModal, ProjectCard, and ConfirmDialog into the dashboard |
| 2 | `packages/client/src/pages/__tests__/dashboard-page.test.tsx` | Modify | Add tests covering create, edit, delete flows, cancellation, and error handling |

## 2. Dependencies

### Code Dependencies (all already implemented)
- `ProjectFormModal` from `../components/project-form-modal` — Task 1 (completed)
- `ProjectCard` from `../components/project-card` — Task 2 (completed)
- `ConfirmDialog` from `../components/ui/confirm-dialog` — Phase 1 (completed)
- `ErrorMessage` from `../components/ui/error-message` — Phase 1 (completed)
- `LoadingSpinner` from `../components/ui/loading-spinner` — Phase 1 (completed)
- `useProjects` from `../context/projects-context` — Phase 1 (completed), provides `addProject()`, `updateProject()`, `removeProject()`
- `Project` type from `@taskboard/shared`

### Existing Interfaces to Consume

```typescript
// From projects-context.tsx
removeProject(id: string): Promise<void>

// From project-form-modal.tsx
interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project;
}

// From project-card.tsx
interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

// From ui/confirm-dialog.tsx
interface ConfirmDialogProps {
  isOpen: boolean;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}
```

## 3. Implementation Details

### 3.1 `packages/client/src/pages/dashboard-page.tsx`

**Imports to add**:
```typescript
import { useState } from "react";
import type { Project } from "@taskboard/shared";
import { ProjectFormModal } from "../components/project-form-modal";
import { ProjectCard } from "../components/project-card";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
```

**State variables to add**:
```typescript
const [isCreateOpen, setIsCreateOpen] = useState(false);
const [editingProject, setEditingProject] = useState<Project | null>(null);
const [deletingProject, setDeletingProject] = useState<Project | null>(null);
const [deleteError, setDeleteError] = useState<string | null>(null);
```

**Destructuring update**: Add `removeProject` to the `useProjects()` destructuring:
```typescript
const { projects, isLoading, error, removeProject } = useProjects();
```

**"New Project" button**: Wire the existing button's `onClick` handler:
```typescript
<button
  onClick={() => setIsCreateOpen(true)}
  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
>
  New Project
</button>
```

**Replace inline project cards with `ProjectCard` component**: Replace the existing `<div>` card markup inside the `.map()` with:
```typescript
<ProjectCard
  key={project._id}
  project={project}
  onEdit={(p) => setEditingProject(p)}
  onDelete={(p) => setDeletingProject(p)}
/>
```

**Delete confirmation handler**:
```typescript
async function handleDeleteConfirm() {
  if (!deletingProject) return;
  const projectToDelete = deletingProject;
  setDeletingProject(null);
  setDeleteError(null);
  try {
    await removeProject(projectToDelete._id);
  } catch (err) {
    setDeleteError(err instanceof Error ? err.message : "Failed to delete project");
  }
}
```

Key design decisions for the delete handler:
- Close the dialog immediately before the API call (optimistic UX — `removeProject` already does optimistic removal from the list)
- Save a reference to `deletingProject` before clearing it, so the async call still has the ID
- On error, set `deleteError` which renders an `ErrorMessage` at the top of the page (below the heading row)
- The `removeProject` in context handles rollback (re-fetches projects on failure)

**Delete cancel handler**:
```typescript
function handleDeleteCancel() {
  setDeletingProject(null);
}
```

**Delete error display**: Render `deleteError` between the header row and the content area:
```typescript
{deleteError && (
  <div className="mb-4">
    <ErrorMessage message={deleteError} onDismiss={() => setDeleteError(null)} />
  </div>
)}
```

**Modal/Dialog rendering**: Add at the end of the root `<div>`, after the existing content:
```typescript
<ProjectFormModal
  isOpen={isCreateOpen}
  onClose={() => setIsCreateOpen(false)}
/>

<ProjectFormModal
  isOpen={editingProject !== null}
  onClose={() => setEditingProject(null)}
  project={editingProject ?? undefined}
/>

<ConfirmDialog
  isOpen={deletingProject !== null}
  message={`Are you sure you want to delete "${deletingProject?.name}"? All boards, tasks, comments, and labels in this project will be permanently deleted.`}
  confirmLabel="Delete"
  onConfirm={handleDeleteConfirm}
  onCancel={handleDeleteCancel}
/>
```

**Why two separate `ProjectFormModal` instances**: The create modal and the edit modal are separate instances to avoid the `project` prop changing between `undefined` and a `Project` object on the same instance, which could cause the `useEffect` reset logic to mismatch. When `isCreateOpen` is true, the create instance renders (no `project` prop). When `editingProject` is set, the edit instance renders (with `project` prop). Only one can be visible at a time.

**Complete modified component structure**:
```tsx
import { useState } from "react";
import type { Project } from "@taskboard/shared";
import { useProjects } from "../context/projects-context";
import { LoadingSpinner } from "../components/ui/loading-spinner";
import { ErrorMessage } from "../components/ui/error-message";
import { ProjectFormModal } from "../components/project-form-modal";
import { ProjectCard } from "../components/project-card";
import { ConfirmDialog } from "../components/ui/confirm-dialog";

export function DashboardPage() {
  const { projects, isLoading, error, removeProject } = useProjects();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDeleteConfirm() {
    if (!deletingProject) return;
    const projectToDelete = deletingProject;
    setDeletingProject(null);
    setDeleteError(null);
    try {
      await removeProject(projectToDelete._id);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete project");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Projects</h2>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Project
        </button>
      </div>

      {deleteError && (
        <div className="mb-4">
          <ErrorMessage message={deleteError} onDismiss={() => setDeleteError(null)} />
        </div>
      )}

      {isLoading ? (
        <div className="py-12">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <ErrorMessage message={error} />
      ) : projects.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-500">
            No projects yet. Create your first project to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project._id}
              project={project}
              onEdit={(p) => setEditingProject(p)}
              onDelete={(p) => setDeletingProject(p)}
            />
          ))}
        </div>
      )}

      <ProjectFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      <ProjectFormModal
        isOpen={editingProject !== null}
        onClose={() => setEditingProject(null)}
        project={editingProject ?? undefined}
      />

      <ConfirmDialog
        isOpen={deletingProject !== null}
        message={`Are you sure you want to delete "${deletingProject?.name}"? All boards, tasks, comments, and labels in this project will be permanently deleted.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingProject(null)}
      />
    </div>
  );
}
```

## 4. Contracts

### State Management

| State Variable | Type | Trigger to Open | Trigger to Close |
|---------------|------|-----------------|------------------|
| `isCreateOpen` | `boolean` | Click "New Project" button → `true` | `ProjectFormModal.onClose` → `false` |
| `editingProject` | `Project \| null` | `ProjectCard.onEdit(project)` → project | `ProjectFormModal.onClose` → `null` |
| `deletingProject` | `Project \| null` | `ProjectCard.onDelete(project)` → project | `ConfirmDialog.onConfirm` or `onCancel` → `null` |
| `deleteError` | `string \| null` | `removeProject` rejection → error message | `ErrorMessage.onDismiss` → `null` |

### Context calls made

- **Delete**: `removeProject(projectToDelete._id)` — called after closing the dialog (optimistic pattern)

### Outputs/Side effects

- `ProjectFormModal` handles create/edit API calls internally (via `useProjects().addProject()` / `updateProject()`)
- `ConfirmDialog` confirmation triggers `removeProject()` which optimistically removes from state, then calls API
- On delete error: `removeProject` in context re-fetches the full project list to revert, and the error is displayed via `deleteError` state
- All mutations flow through `ProjectsContext`, keeping sidebar and dashboard in sync automatically

## 5. Test Plan

### Test file: `packages/client/src/pages/__tests__/dashboard-page.test.tsx`

**Changes to test setup**:
- Add `MemoryRouter` wrapper since `ProjectCard` uses `<Link>` from react-router-dom
- Add imports: `fireEvent`, `waitFor` from `@testing-library/react`; `MemoryRouter` from `react-router-dom`
- Update the render helper to wrap in `<MemoryRouter>`
- Keep existing `mockUseProjects` pattern and `defaultProjectsState()` helper
- Add `mockRemoveProject` as a named `vi.fn()` used in `defaultProjectsState()`

**Updated render helper**:
```typescript
function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  );
}
```

**Update all existing tests**: Replace bare `render(<DashboardPage />)` with `renderDashboard()` to ensure `<Link>` inside `ProjectCard` has a router context.

**New tests to add** (12 test cases):

| # | Test Name | Description |
|---|-----------|-------------|
| 1 | `opens create modal when "New Project" button is clicked` | Click the "New Project" button, assert that the "New Project" modal title (rendered by `ProjectFormModal` via `Modal`) appears in the document |
| 2 | `closes create modal when onClose is triggered` | Open create modal, then click the Cancel button inside the modal, assert the modal title is no longer in the document |
| 3 | `opens edit modal when edit button is clicked on a project card` | Find the edit button (via `aria-label="Edit project"`) on a project card, click it, assert "Edit Project" modal title appears with the project's name pre-filled in the name input |
| 4 | `closes edit modal when onClose is triggered` | Open edit modal, click Cancel, assert modal title is gone |
| 5 | `opens confirm dialog when delete button is clicked on a project card` | Find the delete button (`aria-label="Delete project"`) on a project card, click it, assert the ConfirmDialog message containing the project name and cascade warning appears |
| 6 | `calls removeProject on delete confirmation` | Open delete dialog for "Project Alpha", click the "Delete" confirm button, assert `mockRemoveProject` was called with `"proj1"` |
| 7 | `closes confirm dialog when cancel is clicked` | Open delete dialog, click "Cancel" button, assert the dialog message is no longer visible, assert `mockRemoveProject` was NOT called |
| 8 | `shows delete error when removeProject fails` | Set `mockRemoveProject.mockRejectedValue(new Error("Delete failed"))`, open delete dialog, confirm, `await waitFor` → assert "Delete failed" error message appears in the page |
| 9 | `dismisses delete error when dismiss button clicked` | After a delete error is shown, click the dismiss button (`aria-label="Dismiss"`), assert the error message is removed |
| 10 | `renders ProjectCard components instead of inline cards` | Render with projects, assert `<a>` elements (from `<Link>`) with `href="/projects/proj1/board"` and `href="/projects/proj2/board"` exist, confirming `ProjectCard` is used |
| 11 | `renders edit and delete buttons on project cards` | Assert that both `aria-label="Edit project"` and `aria-label="Delete project"` buttons appear (one pair per project) |
| 12 | `confirm dialog message contains project name and cascade warning` | Open delete dialog, assert text includes both "Project Alpha" and "permanently deleted" |

**Test implementation notes**:

For **tests 1–5** (modal/dialog opening/closing): The `Modal` component uses `createPortal(…, document.body)`, so the rendered modal content is accessible via `screen.getByText()` / `screen.queryByText()` on `document.body` without special selectors.

For **test 3** (edit modal pre-fill): After clicking the edit button, assert `screen.getByDisplayValue("Project Alpha")` to verify the name input is pre-filled.

For **test 6** (delete confirmation): The handler closes the dialog before calling `removeProject`. The test should:
```typescript
mockRemoveProject.mockResolvedValue(undefined);
// ... open dialog, click Delete button ...
await waitFor(() => {
  expect(mockRemoveProject).toHaveBeenCalledWith("proj1");
});
```

For **test 8** (delete error):
```typescript
mockRemoveProject.mockRejectedValue(new Error("Delete failed"));
// ... open dialog, click Delete button ...
await waitFor(() => {
  expect(screen.getByText("Delete failed")).toBeInTheDocument();
});
```

For **test 10** (ProjectCard rendering): Since `ProjectCard` wraps in `<Link>`, the `<a>` elements with proper `href` attributes prove `ProjectCard` is being rendered:
```typescript
const links = screen.getAllByRole("link");
expect(links[0]).toHaveAttribute("href", "/projects/proj1/board");
expect(links[1]).toHaveAttribute("href", "/projects/proj2/board");
```

**Handling multiple edit/delete buttons**: When two projects are rendered, there will be two edit and two delete buttons. To target a specific one (e.g., for "Project Alpha"), use `getAllByLabelText("Edit project")[0]` or `getAllByLabelText("Delete project")[0]` (the first project in the list is "Project Alpha" per `mockProjects`).

**Existing tests requiring update**: All 10 existing tests use `render(<DashboardPage />)`. These must be updated to `renderDashboard()` because `ProjectCard` uses `<Link>` which requires a Router context. The test assertions remain the same — the same text and elements are still rendered, just via `ProjectCard` instead of inline divs.

Specific existing tests that need adaptation:
- **"does not render description paragraph when absent"** (test 8): Currently finds `.closest("div")` and checks for `p.text-gray-500`. With `ProjectCard`, the closest container is an `<a>` (from `<Link>`), not a `<div>`. Update to use `.closest("a")` instead of `.closest("div")`.
- **All other existing tests**: Only need the render wrapper change to `renderDashboard()`.

## 6. Implementation Order

1. **Modify `dashboard-page.tsx`** — Add imports, state variables, delete handler, wire "New Project" button, replace inline card markup with `ProjectCard`, add `ProjectFormModal` (create + edit instances), add `ConfirmDialog`, add delete error display
2. **Modify `dashboard-page.test.tsx`** — Add `MemoryRouter` wrapper, update existing tests to use `renderDashboard()`, fix the "no description" test to use `.closest("a")`, add all 12 new test cases
3. **Run tests** — Verify all existing and new tests pass
4. **Run type check** — Verify no TypeScript errors

## 7. Verification Commands

```bash
# Run only the dashboard test file
cd /Users/theodhor/Desktop/Portfolio/Task_Manager && npx -w packages/client vitest run src/pages/__tests__/dashboard-page.test.tsx

# Run all client tests to check for regressions
cd /Users/theodhor/Desktop/Portfolio/Task_Manager && npm run test -w packages/client

# Type check the client package
cd /Users/theodhor/Desktop/Portfolio/Task_Manager && npx -w packages/client tsc --noEmit
```