Now I have all the context I need. Let me produce the implementation plan.

# Task 4 Implementation Plan: Wire sidebar "New Project" button via `AppLayout`

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/client/src/components/app-layout.tsx` | Modify | Add `isCreateModalOpen` state, wire `handleCreateProject` to open the modal, render `ProjectFormModal` in create mode |
| 2 | `packages/client/src/components/__tests__/app-layout.test.tsx` | Modify | Add tests verifying the sidebar "New Project" button opens the `ProjectFormModal` and that the modal can be closed |

## 2. Dependencies

### Code Dependencies (all already implemented)
- `ProjectFormModal` from `../components/project-form-modal` — Task 1 (completed)
- `Sidebar` from `./sidebar` — Phase 1 (completed), receives `onCreateProject` callback
- `useProjects` from `../context/projects-context` — Phase 1 (completed), `ProjectFormModal` uses it internally

### Existing Interfaces to Consume

```typescript
// From project-form-modal.tsx
interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project;  // absent = create mode
}

// From sidebar.tsx
interface SidebarProps {
  projects: Project[];
  isLoading: boolean;
  onCreateProject: () => void;
}
```

### Dual "New Project" Button Consideration

When on the dashboard page, two separate create modal instances will exist:
1. **AppLayout's `ProjectFormModal`** — triggered by the sidebar "New Project" button, available on all authenticated routes
2. **DashboardPage's `ProjectFormModal`** — triggered by the dashboard header "New Project" button, only on the dashboard route

These are independent instances with independent state (`isCreateModalOpen` in AppLayout vs `isCreateOpen` in DashboardPage). Since `Modal` returns `null` when `isOpen` is `false`, only the triggered instance renders at any given time. No coordination or deduplication is needed — each button opens its own modal, and only one can be open at a time because user interaction is sequential.

## 3. Implementation Details

### 3.1 `packages/client/src/components/app-layout.tsx`

**Imports to add**:
```typescript
import { useState } from "react";
import { ProjectFormModal } from "./project-form-modal";
```

**State variable to add**:
```typescript
const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
```

**Replace `handleCreateProject`**: Change the existing no-op:
```typescript
// Before:
const handleCreateProject = () => {
  // Phase 2 will add create project modal
};

// After:
const handleCreateProject = () => {
  setIsCreateModalOpen(true);
};
```

**Render `ProjectFormModal`**: Add after the closing `</div>` of the `flex h-screen` root container, but still inside the fragment or a wrapping element. Since `Modal` uses `createPortal` to render into `document.body`, its placement in the JSX tree doesn't affect visual rendering — it just needs to be within the component's return.

The cleanest approach is to wrap the return in a fragment:

```tsx
export function AppLayout() {
  const location = useLocation();
  const { projects, isLoading } = useProjects();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleCreateProject = () => {
    setIsCreateModalOpen(true);
  };

  return (
    <>
      <div className="flex h-screen flex-col">
        <Header title={getPageTitle(location.pathname)} />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            projects={projects}
            isLoading={isLoading}
            onCreateProject={handleCreateProject}
          />
          <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
            <Outlet />
          </main>
        </div>
      </div>

      <ProjectFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </>
  );
}
```

**Key design decisions**:
- Uses a React fragment `<>...</>` to wrap the layout div and the modal, since a component can only return a single root element
- `ProjectFormModal` is rendered in create mode (no `project` prop)
- `onClose` simply sets `isCreateModalOpen` to `false` — `ProjectFormModal` handles clearing form state internally via its `useEffect` reset logic
- No need to pass `project` prop since this is always create mode
- The modal renders via `createPortal` to `document.body`, so its position in the JSX tree is irrelevant to layout
- The sidebar "New Project" button works on all authenticated routes (dashboard, board page, etc.) because `AppLayout` wraps all protected routes

## 4. Contracts

### State Management

| State Variable | Type | Trigger to Open | Trigger to Close |
|---------------|------|-----------------|------------------|
| `isCreateModalOpen` | `boolean` | Sidebar "New Project" button click → `true` | `ProjectFormModal.onClose` → `false` |

### Data Flow

1. User clicks sidebar "New Project" button → `Sidebar` calls `onCreateProject` prop
2. `handleCreateProject` sets `isCreateModalOpen` to `true`
3. `ProjectFormModal` renders (create mode, no `project` prop)
4. User fills in name/description and submits → `ProjectFormModal` internally calls `useProjects().addProject()`
5. On success: `ProjectFormModal` calls `onClose` → `isCreateModalOpen` set to `false` → modal disappears
6. `ProjectsContext` state is updated → sidebar project list and dashboard grid (if visible) automatically reflect the new project

### Side Effects
- No direct API calls from `AppLayout` — all mutations flow through `ProjectFormModal` → `ProjectsContext`
- Sidebar project list updates automatically via shared context
- If the user is on the dashboard, the dashboard grid also updates automatically via the same context

## 5. Test Plan

### Test file: `packages/client/src/components/__tests__/app-layout.test.tsx`

**Changes to test setup**:
- Add `fireEvent` to the `@testing-library/react` import
- The existing mock for `projects-context` already provides `addProject`, `updateProject`, and `removeProject` — `ProjectFormModal` will use `addProject` internally, which is already mocked

**New tests to add** (3 test cases):

| # | Test Name | Description |
|---|-----------|-------------|
| 1 | `opens create project modal when sidebar "New Project" button is clicked` | Click the sidebar "New Project" button (already rendered, found via `getByRole("button", { name: "New Project" })`), assert that a heading with text "New Project" appears in the document (rendered by `ProjectFormModal` via `Modal` with `title="New Project"`) |
| 2 | `closes create project modal when Cancel is clicked` | Open the modal by clicking "New Project" button, then click the "Cancel" button inside the modal, assert the "New Project" heading is no longer in the document |
| 3 | `sidebar create button works on board route` | Render with `initialEntries={["/projects/abc/board"]}`, click the "New Project" button, assert the "New Project" modal heading appears — proving the button works on non-dashboard routes |

**Test implementation details**:

For **test 1**:
```typescript
it('opens create project modal when sidebar "New Project" button is clicked', () => {
  renderAppLayout();
  const newProjectButton = screen.getByRole("button", { name: "New Project" });
  fireEvent.click(newProjectButton);
  expect(screen.getByRole("heading", { name: "New Project" })).toBeInTheDocument();
});
```

Note: The "New Project" button text matches as a `button` role since the sidebar renders `<button>New Project</button>`. After clicking, the `ProjectFormModal` renders a `Modal` with `title="New Project"`, which produces an `<h2>` heading. We use `getByRole("heading", { name: "New Project" })` to specifically target the modal title heading and distinguish it from the button text.

For **test 2**:
```typescript
it("closes create project modal when Cancel is clicked", () => {
  renderAppLayout();
  fireEvent.click(screen.getByRole("button", { name: "New Project" }));
  expect(screen.getByRole("heading", { name: "New Project" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("heading", { name: "New Project" })).not.toBeInTheDocument();
});
```

For **test 3**:
```typescript
it("sidebar create button works on board route", () => {
  renderAppLayout(["/projects/abc/board"]);
  const newProjectButton = screen.getByRole("button", { name: "New Project" });
  fireEvent.click(newProjectButton);
  expect(screen.getByRole("heading", { name: "New Project" })).toBeInTheDocument();
});
```

**Existing tests requiring update**: None. All existing tests remain valid because:
- The `AppLayout` still renders the same layout structure (just wrapped in a fragment)
- The `ProjectFormModal` is not rendered when `isCreateModalOpen` is `false` (its default), so it doesn't interfere with existing assertions
- No existing test clicks the "New Project" button, so the new behavior doesn't affect them

## 6. Implementation Order

1. **Modify `app-layout.tsx`** — Add `useState` import, `ProjectFormModal` import, `isCreateModalOpen` state, replace `handleCreateProject` no-op with state setter, wrap return in fragment, add `ProjectFormModal` rendering
2. **Modify `app-layout.test.tsx`** — Add `fireEvent` import, add the 3 new test cases
3. **Run tests** — Verify all existing and new tests pass
4. **Run type check** — Verify no TypeScript errors

## 7. Verification Commands

```bash
# Run only the AppLayout test file
cd /Users/theodhor/Desktop/Portfolio/Task_Manager && npx -w packages/client vitest run src/components/__tests__/app-layout.test.tsx

# Run all client tests to check for regressions
cd /Users/theodhor/Desktop/Portfolio/Task_Manager && npm run test -w packages/client

# Type check the client package
cd /Users/theodhor/Desktop/Portfolio/Task_Manager && npx -w packages/client tsc --noEmit
```