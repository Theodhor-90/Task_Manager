Now I have a complete understanding of the codebase. Let me analyze what Task 5 requires:

1. The sidebar already uses `NavLink` with `isActive` styling for `/projects/:id/board` routes
2. The sidebar already receives projects from `ProjectsContext` via `AppLayout`
3. The sidebar's `onCreateProject` is already wired in Task 4

The task is primarily a **verification** task — verify that everything works correctly and add any missing test coverage. Let me check if there are any gaps in the sidebar tests.

Looking at the existing sidebar tests, they cover:
- Branding
- "New Project" button rendering and click callback
- Loading spinner
- Empty state
- Project names as links
- Correct board route links
- Active project highlighting
- Inactive project not highlighted

What's **missing** from the test coverage based on the task spec:
1. Tests verifying that project list reflects context changes (re-render with updated projects shows new names)
2. Tests verifying sidebar shows updated project name after edit (re-render with modified project data)
3. Tests verifying project disappears when removed from list

The sidebar component itself is purely presentational — it receives `projects` as a prop and renders them. So the "synchronization" behavior is already guaranteed by React's props mechanism + `ProjectsContext`. No code changes to `sidebar.tsx` are needed.

The test additions should verify this behavior to satisfy the task spec's verification criteria.

# Task 5 Implementation Plan: Update `Sidebar` to support project navigation from dashboard

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/client/src/components/sidebar.tsx` | Verify (no changes) | Confirm NavLink active styling, project list rendering, and props-driven synchronization all work correctly |
| 2 | `packages/client/src/components/__tests__/sidebar.test.tsx` | Modify | Add tests verifying sidebar reflects project CRUD operations (add, edit, delete) via re-renders with updated props |

## 2. Dependencies

### Code Dependencies (all already implemented)
- `Sidebar` component from `./sidebar` — Phase 1 (completed), renders project list with `NavLink` active styling
- `ProjectsContext` from `../context/projects-context` — Phase 1 (completed), provides reactive project list shared between `AppLayout` (sidebar) and `DashboardPage`
- `AppLayout` from `./app-layout` — Phase 1 + Task 4 (completed), passes `projects` from context to `Sidebar` as props

### Architectural Verification

The sidebar is a **pure presentational component** — it receives `projects`, `isLoading`, and `onCreateProject` as props. It does not call `useProjects()` directly. The `AppLayout` component calls `useProjects()` and passes the `projects` array and `isLoading` boolean down to `Sidebar`. This means:

1. **Automatic synchronization** is guaranteed by React's props mechanism: when `ProjectsContext` state changes (via `addProject`, `updateProject`, or `removeProject`), the `AppLayout` re-renders with the new `projects` array, which flows down to `Sidebar` as updated props.

2. **Active highlighting** is handled by React Router's `NavLink` component with its `isActive` callback. The `className` function receives `{ isActive }` and applies `bg-blue-50 font-medium text-blue-700` for active links and `text-gray-700 hover:bg-gray-100` for inactive ones. The `to` prop is `/projects/${project._id}/board`, which matches the board route pattern.

3. **No code changes** to `sidebar.tsx` are required — the existing implementation already satisfies all Task 5 requirements.

## 3. Implementation Details

### 3.1 `packages/client/src/components/sidebar.tsx` — Verification Only

**No code modifications needed.** The component already:

- Uses `NavLink` from `react-router-dom` with `isActive` styling that correctly highlights the active project when on `/projects/:id/board` routes (lines 36-44)
- Receives `projects: Project[]` as a prop and renders each project name as a link (lines 34-49)
- Shows loading spinner when `isLoading` is true (lines 26-29)
- Shows empty state when projects array is empty (lines 30-31)
- Calls `onCreateProject` when the "New Project" button is clicked (lines 18-23)

**Synchronization guarantee**: Since `Sidebar` is a pure function of its props, and `AppLayout` re-renders whenever `ProjectsContext` state changes (because `useProjects()` returns new state references on mutation), the sidebar will always show the current project list without any additional synchronization code.

### 3.2 `packages/client/src/components/__tests__/sidebar.test.tsx` — New Tests

**Imports**: No new imports needed — the existing test file already imports `render`, `screen`, `fireEvent`, `MemoryRouter`, `vi`, `Sidebar`, and `Project` type.

**New tests to add** (4 test cases):

These tests verify that the sidebar correctly reflects project CRUD operations by re-rendering with updated props, proving the props-driven synchronization works.

#### Test 1: `reflects new project when projects prop is updated`

**Purpose**: Verify that when a new project is added to the context (which updates the props), the sidebar shows the new project.

**Implementation**:
```typescript
it("reflects new project when projects prop is updated", () => {
  const { rerender } = renderSidebar({ projects: mockProjects });
  expect(screen.getByText("Project Alpha")).toBeInTheDocument();
  expect(screen.getByText("Project Beta")).toBeInTheDocument();

  const updatedProjects: Project[] = [
    {
      _id: "proj3",
      name: "Project Gamma",
      owner: "user1",
      createdAt: "2025-01-03T00:00:00Z",
      updatedAt: "2025-01-03T00:00:00Z",
    },
    ...mockProjects,
  ];

  rerender(
    <MemoryRouter>
      <Sidebar projects={updatedProjects} isLoading={false} onCreateProject={vi.fn()} />
    </MemoryRouter>
  );

  expect(screen.getByText("Project Gamma")).toBeInTheDocument();
  expect(screen.getByText("Project Alpha")).toBeInTheDocument();
  expect(screen.getByText("Project Beta")).toBeInTheDocument();
});
```

**Note**: The `renderSidebar` helper returns a `RenderResult` from `@testing-library/react`, which includes a `rerender` function. However, the current helper wraps the component in `<MemoryRouter>`, and `rerender` replaces the entire tree, so we must wrap in `<MemoryRouter>` again. Since the existing `renderSidebar` helper doesn't expose `rerender` in a way that allows passing different props, these tests should call `render` directly with `<MemoryRouter>` wrapping, then use `rerender` from the return value.

#### Test 2: `reflects updated project name when projects prop changes`

**Purpose**: Verify that when a project is edited (name changes in context), the sidebar shows the updated name.

**Implementation**:
```typescript
it("reflects updated project name when projects prop changes", () => {
  const { rerender } = render(
    <MemoryRouter>
      <Sidebar projects={mockProjects} isLoading={false} onCreateProject={vi.fn()} />
    </MemoryRouter>
  );
  expect(screen.getByText("Project Alpha")).toBeInTheDocument();

  const updatedProjects: Project[] = [
    {
      ...mockProjects[0],
      name: "Project Alpha Renamed",
    },
    mockProjects[1],
  ];

  rerender(
    <MemoryRouter>
      <Sidebar projects={updatedProjects} isLoading={false} onCreateProject={vi.fn()} />
    </MemoryRouter>
  );

  expect(screen.queryByText("Project Alpha")).not.toBeInTheDocument();
  expect(screen.getByText("Project Alpha Renamed")).toBeInTheDocument();
  expect(screen.getByText("Project Beta")).toBeInTheDocument();
});
```

#### Test 3: `reflects removed project when projects prop changes`

**Purpose**: Verify that when a project is deleted (removed from context), the sidebar no longer shows it.

**Implementation**:
```typescript
it("reflects removed project when projects prop changes", () => {
  const { rerender } = render(
    <MemoryRouter>
      <Sidebar projects={mockProjects} isLoading={false} onCreateProject={vi.fn()} />
    </MemoryRouter>
  );
  expect(screen.getByText("Project Alpha")).toBeInTheDocument();
  expect(screen.getByText("Project Beta")).toBeInTheDocument();

  const updatedProjects: Project[] = [mockProjects[1]];

  rerender(
    <MemoryRouter>
      <Sidebar projects={updatedProjects} isLoading={false} onCreateProject={vi.fn()} />
    </MemoryRouter>
  );

  expect(screen.queryByText("Project Alpha")).not.toBeInTheDocument();
  expect(screen.getByText("Project Beta")).toBeInTheDocument();
});
```

#### Test 4: `shows empty state when last project is removed`

**Purpose**: Verify that when all projects are deleted, the sidebar shows the empty state message.

**Implementation**:
```typescript
it("shows empty state when last project is removed", () => {
  const { rerender } = render(
    <MemoryRouter>
      <Sidebar projects={mockProjects} isLoading={false} onCreateProject={vi.fn()} />
    </MemoryRouter>
  );
  expect(screen.getByText("Project Alpha")).toBeInTheDocument();

  rerender(
    <MemoryRouter>
      <Sidebar projects={[]} isLoading={false} onCreateProject={vi.fn()} />
    </MemoryRouter>
  );

  expect(screen.queryByText("Project Alpha")).not.toBeInTheDocument();
  expect(screen.getByText("No projects yet")).toBeInTheDocument();
});
```

## 4. Contracts

### Sidebar Props (unchanged)

```typescript
interface SidebarProps {
  projects: Project[];     // Reactive list from ProjectsContext via AppLayout
  isLoading: boolean;      // Loading state from ProjectsContext
  onCreateProject: () => void;  // Opens create modal (wired in Task 4)
}
```

### Data Flow for Synchronization

```
ProjectsContext.addProject()    ──┐
ProjectsContext.updateProject() ──┼──> setProjects(newList) ──> AppLayout re-renders
ProjectsContext.removeProject() ──┘                               ──> Sidebar receives new `projects` prop
                                                                       ──> React re-renders with updated list
```

This is standard React unidirectional data flow — no additional synchronization mechanism is needed.

### Active State Contract

The `NavLink` `to` prop is `\`/projects/${project._id}/board\``. React Router's `NavLink` internally compares this to the current URL pathname. When the user navigates to `/projects/proj1/board`, the link with `to="/projects/proj1/board"` receives `isActive: true`, and the styling function applies `bg-blue-50 font-medium text-blue-700`.

## 5. Test Plan

### Test file: `packages/client/src/components/__tests__/sidebar.test.tsx`

**Existing tests** (10 tests — all remain unchanged):

| # | Test Name | Status |
|---|-----------|--------|
| 1 | renders TaskBoard branding | Keep |
| 2 | renders "New Project" button | Keep |
| 3 | calls onCreateProject when button is clicked | Keep |
| 4 | shows loading spinner when isLoading is true | Keep |
| 5 | does not show project list when loading | Keep |
| 6 | shows empty state message when no projects | Keep |
| 7 | renders project names as links | Keep |
| 8 | links point to correct board routes | Keep |
| 9 | highlights active project link | Keep |
| 10 | does not highlight inactive project link | Keep |

**New tests** (4 tests):

| # | Test Name | Description |
|---|-----------|-------------|
| 11 | `reflects new project when projects prop is updated` | Re-render with a new project added to the list; assert the new project name appears alongside existing ones |
| 12 | `reflects updated project name when projects prop changes` | Re-render with one project's name changed; assert old name is gone and new name appears |
| 13 | `reflects removed project when projects prop changes` | Re-render with one project removed from the list; assert the removed project is gone and remaining project stays |
| 14 | `shows empty state when last project is removed` | Re-render with empty projects array; assert "No projects yet" appears and project names are gone |

**Test implementation notes**:

- Tests 11-14 use `render` directly (not the `renderSidebar` helper) to access the `rerender` function from the render result, since `rerender` replaces the entire React tree and requires re-wrapping in `<MemoryRouter>`
- Each new test renders the sidebar with `mockProjects`, verifies initial state, then calls `rerender` with modified props and verifies the updated state
- These tests prove that the sidebar correctly reflects context-driven mutations purely through React's props mechanism

## 6. Implementation Order

1. **Verify `sidebar.tsx`** — Read and confirm that no code changes are needed (NavLink active styling, props-driven rendering, all working correctly)
2. **Modify `sidebar.test.tsx`** — Add the 4 new test cases verifying CRUD synchronization through prop changes
3. **Run tests** — Verify all 14 sidebar tests pass (10 existing + 4 new)
4. **Run all client tests** — Verify no regressions across the entire test suite

## 7. Verification Commands

```bash
# Run only the sidebar test file
cd /Users/theodhor/Desktop/Portfolio/Task_Manager && npx -w packages/client vitest run src/components/__tests__/sidebar.test.tsx

# Run all client tests to check for regressions
cd /Users/theodhor/Desktop/Portfolio/Task_Manager && npm run test -w packages/client

# Type check the client package
cd /Users/theodhor/Desktop/Portfolio/Task_Manager && npx -w packages/client tsc --noEmit
```