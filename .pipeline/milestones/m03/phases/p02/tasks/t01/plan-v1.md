Now I have a comprehensive understanding of the entire codebase. Let me produce the implementation plan.

# Task 1 Implementation Plan: `ProjectFormModal` Component

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/client/src/components/project-form-modal.tsx` | Create | Reusable modal form for creating and editing projects |
| 2 | `packages/client/src/components/__tests__/project-form-modal.test.tsx` | Create | Unit tests for the ProjectFormModal component |

## 2. Dependencies

### Code Dependencies
- `Modal` component from `../components/ui/modal` — renders the overlay, handles ESC/backdrop close
- `ErrorMessage` component from `../components/ui/error-message` — displays API errors inside the modal
- `useProjects` hook from `../context/projects-context` — provides `addProject()` and `updateProject()` methods
- `Project` type from `@taskboard/shared` — typing for the optional `project` prop
- `CreateProjectInput`, `UpdateProjectInput` from `../api/projects` — input shapes used by context methods (already consumed internally by context, but useful for type reference)

### Existing Interfaces to Consume

```typescript
// From projects-context.tsx
addProject(input: CreateProjectInput): Promise<Project>
updateProject(id: string, input: UpdateProjectInput): Promise<Project>

// From api/projects.ts
interface CreateProjectInput { name: string; description?: string }
interface UpdateProjectInput { name?: string; description?: string }

// From @taskboard/shared
interface Project { _id: string; name: string; description?: string; owner: string; createdAt: string; updatedAt: string }

// From ui/modal.tsx
interface ModalProps { isOpen: boolean; onClose: () => void; title?: string; children: ReactNode }

// From ui/error-message.tsx
interface ErrorMessageProps { message: string; onDismiss?: () => void }
```

## 3. Implementation Details

### 3.1 `packages/client/src/components/project-form-modal.tsx`

**Named export**: `ProjectFormModal`

**Props interface**:
```typescript
interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project;  // present → edit mode; absent → create mode
}
```

**State variables**:
```typescript
const [name, setName] = useState("");
const [description, setDescription] = useState("");
const [error, setError] = useState<string | null>(null);
const [isSubmitting, setIsSubmitting] = useState(false);
```

**Derived values**:
```typescript
const isEditMode = Boolean(project);
```

**Form reset effect**:
A `useEffect` that runs when `isOpen` or `project` changes:
- When `isOpen` becomes `true` and `project` is provided: set `name` to `project.name`, `description` to `project.description ?? ""`
- When `isOpen` becomes `true` and no `project`: set `name` to `""`, `description` to `""`
- Always clear `error` to `null` when the modal opens
- Guard: if `!isOpen`, return early (no state reset needed when closing)

```typescript
useEffect(() => {
  if (!isOpen) return;
  setName(project?.name ?? "");
  setDescription(project?.description ?? "");
  setError(null);
}, [isOpen, project]);
```

**Submit handler** (`handleSubmit`):
```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();

  const trimmedName = name.trim();
  if (!trimmedName) {
    setError("Project name is required");
    return;
  }

  setIsSubmitting(true);
  setError(null);

  try {
    if (isEditMode) {
      await updateProject(project!._id, { name: trimmedName, description });
    } else {
      await addProject({ name: trimmedName, description });
    }
    onClose();
  } catch (err) {
    setError(err instanceof Error ? err.message : "An unexpected error occurred");
  } finally {
    setIsSubmitting(false);
  }
}
```

**JSX structure**:
```
<Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? "Edit Project" : "New Project"}>
  <form onSubmit={handleSubmit}>
    <!-- Name label + text input (required) -->
    <div className="mb-4">
      <label htmlFor="project-name" className="block text-sm font-medium text-gray-700">
        Name <span className="text-red-500">*</span>
      </label>
      <input
        id="project-name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        placeholder="Project name"
        required
      />
    </div>

    <!-- Description label + textarea (optional) -->
    <div className="mb-4">
      <label htmlFor="project-description" className="block text-sm font-medium text-gray-700">
        Description
      </label>
      <textarea
        id="project-description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        placeholder="Optional description"
      />
    </div>

    <!-- Error message (conditional) -->
    {error && <div className="mb-4"><ErrorMessage message={error} onDismiss={() => setError(null)} /></div>}

    <!-- Button row -->
    <div className="flex justify-end gap-3">
      <button type="button" onClick={onClose}
        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
        Cancel
      </button>
      <button type="submit" disabled={isSubmitting}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
        {isSubmitting ? (isEditMode ? "Saving..." : "Creating...") : (isEditMode ? "Save" : "Create")}
      </button>
    </div>
  </form>
</Modal>
```

**Key design decisions**:
- The form uses native `<form onSubmit>` for Enter-key submission support
- Cancel button uses `type="button"` to prevent form submission
- Submit button `disabled` attribute prevents double-submission
- `disabled:opacity-50` matches common Tailwind disabled patterns
- Button styling matches ConfirmDialog's button pattern (cancel = gray border, submit = blue solid)
- Error is dismissible via `onDismiss` so the user can clear it before retrying
- Form field Tailwind classes match standard input styling patterns in the codebase

## 4. Contracts

### Props Input

**Create mode** (no project prop):
```typescript
<ProjectFormModal isOpen={true} onClose={handleClose} />
```

**Edit mode** (project prop provided):
```typescript
<ProjectFormModal isOpen={true} onClose={handleClose} project={{
  _id: "abc123",
  name: "My Project",
  description: "Existing description",
  owner: "user1",
  createdAt: "2025-01-15T00:00:00Z",
  updatedAt: "2025-01-15T00:00:00Z",
}} />
```

### Context calls made

**Create**: `addProject({ name: "Trimmed Name", description: "Some desc" })`  
**Edit**: `updateProject("abc123", { name: "Updated Name", description: "Updated desc" })`

### Outputs/Side effects
- On success: calls `onClose()` — parent is responsible for hiding the modal
- On error: renders `ErrorMessage` inside modal, modal stays open, form data preserved
- Does not directly modify any external state — all mutations go through `ProjectsContext`

## 5. Test Plan

### Test file: `packages/client/src/components/__tests__/project-form-modal.test.tsx`

**Test setup**:
- Mock `../../context/projects-context` module using `vi.mock()`
- Pattern: `const mockUseProjects = vi.fn()` at module level, then `vi.mock(...)` returning `{ useProjects: (...args) => mockUseProjects(...args) }`
- Create `mockAddProject` and `mockUpdateProject` as `vi.fn()` instances
- Default mock return: `{ projects: [], isLoading: false, error: null, addProject: mockAddProject, updateProject: mockUpdateProject, removeProject: vi.fn() }`
- `beforeEach`: clear all mocks, reset default return values
- Helper: `renderModal(props?: Partial<ProjectFormModalProps>)` with sensible defaults (`isOpen: true, onClose: vi.fn()`)

**Tests** (14 test cases):

| # | Test Name | Description |
|---|-----------|-------------|
| 1 | `renders nothing when isOpen is false` | Render with `isOpen: false`, assert modal title not in document |
| 2 | `renders "New Project" title in create mode` | Render without `project` prop, assert heading contains "New Project" |
| 3 | `renders "Edit Project" title in edit mode` | Render with `project` prop, assert heading contains "Edit Project" |
| 4 | `renders empty name and description in create mode` | Assert both inputs have empty string values |
| 5 | `pre-fills name and description in edit mode` | Pass `project` with name/description, assert input values match |
| 6 | `pre-fills empty description when project has no description` | Pass `project` without `description`, assert textarea value is `""` |
| 7 | `shows validation error when submitting empty name` | Clear name input, submit form, assert "Project name is required" error appears, `addProject` NOT called |
| 8 | `shows validation error when name is only whitespace` | Type spaces in name, submit, assert error appears |
| 9 | `calls addProject and closes modal on successful create` | Type a name, submit, `await waitFor` → assert `mockAddProject` called with `{ name, description }` and `onClose` called |
| 10 | `calls updateProject and closes modal on successful edit` | Render in edit mode, change name, submit, assert `mockUpdateProject` called with `(id, { name, description })` and `onClose` called |
| 11 | `shows error message when addProject rejects` | `mockAddProject.mockRejectedValue(new Error("Server error"))`, submit, assert "Server error" is displayed, `onClose` NOT called |
| 12 | `shows error message when updateProject rejects` | Same pattern for edit mode |
| 13 | `disables submit button during submission` | `mockAddProject` returns a pending promise (use a deferred pattern), submit, assert button is disabled and shows "Creating..." |
| 14 | `resets form when modal reopens` | Render in create mode, type into name, close (via rerender with `isOpen: false`), reopen (rerender `isOpen: true`), assert name is empty |

**Mock pattern for pending promises** (test 13):
```typescript
let resolvePromise: (value: Project) => void;
mockAddProject.mockReturnValue(new Promise((resolve) => { resolvePromise = resolve; }));
```
After asserting disabled state, resolve the promise and assert final state in `waitFor`.

**Async interaction pattern**:
```typescript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// For form submit:
fireEvent.change(nameInput, { target: { value: "New Name" } });
fireEvent.submit(form);  // or fireEvent.click(submitButton)
await waitFor(() => {
  expect(mockAddProject).toHaveBeenCalledWith({ name: "New Name", description: "" });
});
```

## 6. Implementation Order

1. **Create `project-form-modal.tsx`** — implement the component with all the state management, form logic, reset effect, and JSX
2. **Create `project-form-modal.test.tsx`** — implement all 14 tests
3. **Run tests** — verify all pass
4. **Run type check** — verify no TypeScript errors

## 7. Verification Commands

```bash
# Run only the new test file
cd /Users/theodhor/Desktop/Portfolio/Task_Manager && npx -w packages/client vitest run src/components/__tests__/project-form-modal.test.tsx

# Run all client tests to check for regressions
cd /Users/theodhor/Desktop/Portfolio/Task_Manager && npm run test -w packages/client

# Type check the client package
cd /Users/theodhor/Desktop/Portfolio/Task_Manager && npx -w packages/client tsc --noEmit
```