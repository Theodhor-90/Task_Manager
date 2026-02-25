# Task 6: Wire `BoardPage` to Render `BoardView` — Implementation Plan

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/client/src/pages/board-page.tsx` | Modified | Replace placeholder with `BoardProvider` + `BoardView`, call `loadBoard` on mount |
| 2 | `packages/client/src/pages/__tests__/board-page.test.tsx` | Modified | Update tests to verify new structure: BoardProvider wrapping, BoardView rendering, loadBoard invocation |

## 2. Dependencies

- **Task 3 complete** — `packages/client/src/context/board-context.tsx` exports `BoardProvider` and `useBoard`
- **Task 5 complete** — `packages/client/src/components/board-view.tsx` exports `BoardView`
- **Existing files**:
  - `packages/client/src/pages/board-page.tsx` — current placeholder implementation using `useProjects` and `useParams`
  - `packages/client/src/pages/__tests__/board-page.test.tsx` — current tests for the placeholder
  - `packages/client/src/context/projects-context.tsx` — provides `useProjects` for project name lookup
  - `packages/client/src/components/ui/loading-spinner.tsx` — `LoadingSpinner` with `role="status"` and `aria-label="Loading"`

## 3. Implementation Details

### 3.1 `packages/client/src/pages/board-page.tsx`

**Purpose**: Wire the board page route to render the full board experience. The page wraps its subtree in `BoardProvider`, reads the project ID from route params, calls `loadBoard` on mount, shows the project name heading, and renders `BoardView`.

**Architecture**: The component is split into two parts:
1. `BoardPage` (exported) — handles project lookup from `useProjects`, renders `BoardProvider` wrapping a child component
2. `BoardContent` (internal) — lives inside `BoardProvider`, calls `useBoard().loadBoard` on mount, renders `BoardView`

This split is necessary because `useBoard()` can only be called inside `BoardProvider`, and `loadBoard` needs the `projectId` from route params.

**Imports**:

```typescript
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useProjects } from "../context/projects-context";
import { BoardProvider, useBoard } from "../context/board-context";
import { BoardView } from "../components/board-view";
import { LoadingSpinner } from "../components/ui/loading-spinner";
```

**`BoardContent` component** (not exported):

```typescript
function BoardContent({ projectId }: { projectId: string }) {
  const { loadBoard } = useBoard();

  useEffect(() => {
    loadBoard(projectId);
  }, [projectId, loadBoard]);

  return <BoardView />;
}
```

- Receives `projectId` as a prop from `BoardPage`
- Calls `loadBoard(projectId)` in a `useEffect` on mount and when `projectId` changes
- Renders `BoardView` which reads all board state from context

**`BoardPage` component** (exported):

```typescript
export function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const { projects, isLoading } = useProjects();

  if (isLoading) {
    return (
      <div className="py-12">
        <LoadingSpinner />
      </div>
    );
  }

  const project = projects.find((p) => p._id === id);

  if (!project) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-gray-500">Project not found</p>
      </div>
    );
  }

  return (
    <BoardProvider>
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">{project.name}</h2>
        <BoardContent projectId={project._id} />
      </div>
    </BoardProvider>
  );
}
```

**Key design decisions**:

1. **Project name heading is kept** — The task spec says "Keep the project name heading (or move it into the board header area)". The heading remains at the top, outside `BoardView`, because it comes from `useProjects` context (not board context) and provides page-level context.

2. **Loading/not-found guards retained** — The existing `isLoading` and project-not-found checks from `useProjects` are kept as-is. These handle the case where the projects list hasn't loaded yet or the URL contains an invalid project ID. Board-level loading (fetching columns/tasks) is handled inside `BoardView` via `BoardContext.isLoading`.

3. **`BoardProvider` scoped to the page** — `BoardProvider` wraps only the board content (heading + `BoardContent`), not the entire page. This ensures the board context mounts/unmounts with navigation, and doesn't exist when the user is on the dashboard.

4. **`BoardContent` split** — A separate internal component is needed because `useBoard()` must be called inside `BoardProvider`. If `loadBoard` were called in `BoardPage` directly, it would be outside the provider. This is the same pattern recommended in the sibling task plans.

**What changes from the current file**:
- **Added imports**: `useEffect`, `BoardProvider`, `useBoard`, `BoardView`
- **Removed**: The placeholder `<div>` with "Board coming in Milestone 4" text
- **Added**: `BoardContent` internal component
- **Modified**: The return statement wraps content in `BoardProvider` and renders `BoardContent` instead of the placeholder
- **Kept**: `useParams`, `useProjects`, `LoadingSpinner`, project lookup logic, project name heading, project-not-found guard

### 3.2 `packages/client/src/pages/__tests__/board-page.test.tsx`

**Purpose**: Update the existing test file to verify the new board page structure while preserving tests for loading, not-found, and project name rendering.

**Changes to mock setup**:

Add mocks for `board-context` and `board-view`:

```typescript
const mockLoadBoard = vi.fn();
const mockUseBoard = vi.fn();

vi.mock("../../context/board-context", () => ({
  BoardProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="board-provider">{children}</div>
  ),
  useBoard: (...args: unknown[]) => mockUseBoard(...args),
}));

vi.mock("../../components/board-view", () => ({
  BoardView: () => <div data-testid="board-view">BoardView</div>,
}));
```

- `BoardProvider` is mocked as a simple `div` wrapper with a test ID — this avoids needing to provide real context values for every test
- `useBoard` is mocked to return `{ loadBoard: mockLoadBoard }` — this lets us verify `loadBoard` is called with the correct project ID
- `BoardView` is mocked as a simple `div` — we're testing page-level wiring, not `BoardView` internals (those are tested in `board-view.test.tsx`)

**Updated `beforeEach`**:

```typescript
beforeEach(() => {
  mockUseProjects.mockReturnValue(defaultProjectsState());
  mockLoadBoard.mockReset();
  mockUseBoard.mockReturnValue({ loadBoard: mockLoadBoard });
});
```

**Tests to keep (unchanged or minimally updated)**:

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1 | `renders the project name as a heading` | Keep as-is | Still renders `<h2>` with project name |
| 2 | `shows loading spinner when projects are loading` | Keep as-is | Still shows spinner when `isLoading=true` |
| 3 | `does not show project name when loading` | Keep as-is | Still hides content during loading |
| 4 | `shows "Project not found" for invalid project ID` | Keep as-is | Still shows not-found message |
| 5 | `shows "Project not found" when projects list is empty` | Keep as-is | Still shows not-found message |
| 6 | `renders correct project name for different project IDs` | Keep as-is | Still renders correct heading |
| 7 | `does not render PRIORITIES debug content` | Keep as-is | Still no debug content |

**Tests to remove**:

| # | Test | Reason |
|---|------|--------|
| 1 | `renders the placeholder message` | Placeholder is replaced; "Board coming in Milestone 4" no longer exists |

**Tests to add**:

| # | Test | Description |
|---|------|-------------|
| 1 | `wraps content in BoardProvider` | Verify the `board-provider` test ID is present when a valid project is found |
| 2 | `renders BoardView` | Verify the `board-view` test ID is present when a valid project is found |
| 3 | `calls loadBoard with the project ID on mount` | Verify `mockLoadBoard` was called with `"proj1"` |
| 4 | `does not render BoardProvider when project not found` | Verify `board-provider` test ID is absent for invalid project ID |
| 5 | `does not render BoardProvider when loading` | Verify `board-provider` test ID is absent when `isLoading=true` |

**Detailed new test implementations**:

**Test: `wraps content in BoardProvider`**

```typescript
it("wraps content in BoardProvider", () => {
  renderBoardPage("proj1");
  expect(screen.getByTestId("board-provider")).toBeInTheDocument();
});
```

**Test: `renders BoardView`**

```typescript
it("renders BoardView", () => {
  renderBoardPage("proj1");
  expect(screen.getByTestId("board-view")).toBeInTheDocument();
});
```

**Test: `calls loadBoard with the project ID on mount`**

```typescript
it("calls loadBoard with the project ID on mount", () => {
  renderBoardPage("proj1");
  expect(mockLoadBoard).toHaveBeenCalledWith("proj1");
});
```

**Test: `does not render BoardProvider when project not found`**

```typescript
it("does not render BoardProvider when project not found", () => {
  renderBoardPage("nonexistent");
  expect(screen.queryByTestId("board-provider")).not.toBeInTheDocument();
});
```

**Test: `does not render BoardProvider when loading`**

```typescript
it("does not render BoardProvider when loading", () => {
  mockUseProjects.mockReturnValue({
    ...defaultProjectsState(),
    projects: [],
    isLoading: true,
  });
  renderBoardPage("proj1");
  expect(screen.queryByTestId("board-provider")).not.toBeInTheDocument();
});
```

## 4. Contracts

### `BoardPage` rendering contract

| Condition | What renders |
|-----------|-------------|
| `isLoading=true` (from `useProjects`) | `LoadingSpinner` only — no `BoardProvider`, no heading |
| `project` not found in `projects` array | "Project not found" text — no `BoardProvider` |
| `project` found | `BoardProvider` wrapping: project name `<h2>` + `BoardContent` (which renders `BoardView`) |

### `BoardContent` behavior contract

| Event | Action |
|-------|--------|
| Mount / `projectId` changes | Calls `loadBoard(projectId)` via `useEffect` |
| Render | Returns `<BoardView />` which reads all state from `useBoard()` |

### How `BoardView` integrates (from Task 5)

`BoardView` is a prop-less component. Inside `BoardContent`, it reads all data from `useBoard()`:
- `board` — the board with columns
- `tasks` — flat task array
- `isLoading` — board loading state (separate from project loading)
- `error` — board-level error
- `addColumn`, `renameColumn`, `removeColumn`, `reorderColumns` — mutation methods

### Two-stage loading

There are two loading states the user may experience:
1. **Projects loading** (`useProjects().isLoading`) — handled by `BoardPage` with `LoadingSpinner`
2. **Board loading** (`useBoard().isLoading`) — handled by `BoardView` with its own `LoadingSpinner`

In normal flow, projects are already loaded when navigating to a board (they load on app mount via `ProjectsProvider`), so stage 1 is usually instant. Stage 2 fires when `loadBoard` is called.

## 5. Test Plan

### 5.1 Test file

`packages/client/src/pages/__tests__/board-page.test.tsx` (modified)

### 5.2 Test setup

- **Existing mocks kept**: `vi.mock("../../context/projects-context")` with `mockUseProjects`
- **New mocks added**:
  - `vi.mock("../../context/board-context")` — mocks `BoardProvider` as a `div` wrapper, `useBoard` returns `{ loadBoard: mockLoadBoard }`
  - `vi.mock("../../components/board-view")` — mocks `BoardView` as a `div` with test ID
- **Existing mock data kept**: `mockProjects`, `defaultProjectsState()`
- **New mock references**: `mockLoadBoard`, `mockUseBoard`
- **Existing render helper kept**: `renderBoardPage(projectId)` with `MemoryRouter` + `Routes`
- **Updated `beforeEach`**: resets `mockLoadBoard` and sets `mockUseBoard` return value

### 5.3 Test specifications

**`describe("BoardPage")`**:

| # | Test Name | Status | What It Verifies |
|---|-----------|--------|-----------------|
| 1 | `renders the project name as a heading` | Kept | `<h2>` shows project name |
| 2 | ~~`renders the placeholder message`~~ | **Removed** | Placeholder no longer exists |
| 3 | `shows loading spinner when projects are loading` | Kept | `role="status"` present when `isLoading=true` |
| 4 | `does not show project name when loading` | Kept | Project name hidden during loading |
| 5 | `shows "Project not found" for invalid project ID` | Kept | Not-found message for bad ID |
| 6 | `shows "Project not found" when projects list is empty` | Kept | Not-found message for empty list |
| 7 | `renders correct project name for different project IDs` | Kept | Correct heading for `proj2` |
| 8 | `does not render PRIORITIES debug content` | Kept | No debug content |
| 9 | `wraps content in BoardProvider` | **New** | `board-provider` test ID present |
| 10 | `renders BoardView` | **New** | `board-view` test ID present |
| 11 | `calls loadBoard with the project ID on mount` | **New** | `mockLoadBoard` called with `"proj1"` |
| 12 | `does not render BoardProvider when project not found` | **New** | `board-provider` absent for bad ID |
| 13 | `does not render BoardProvider when loading` | **New** | `board-provider` absent when `isLoading=true` |

## 6. Implementation Order

1. **Modify `packages/client/src/pages/board-page.tsx`**:
   - Add `useEffect` import
   - Add `BoardProvider` and `useBoard` imports from `../context/board-context`
   - Add `BoardView` import from `../components/board-view`
   - Create `BoardContent` internal component
   - Update `BoardPage` to wrap content in `BoardProvider` and render `BoardContent`
   - Remove the placeholder `<div>`
2. **Modify `packages/client/src/pages/__tests__/board-page.test.tsx`**:
   - Add mocks for `board-context` and `board-view`
   - Add `mockLoadBoard` and `mockUseBoard` references
   - Update `beforeEach` to reset new mocks
   - Remove the "renders the placeholder message" test
   - Add 5 new tests for BoardProvider wrapping, BoardView rendering, loadBoard invocation, and negative cases
3. **Verify TypeScript compilation** — `npx tsc --noEmit` from `packages/client`
4. **Run board-page tests** — `npx vitest run src/pages/__tests__/board-page.test.tsx` from `packages/client`
5. **Run all client tests** — `npm run test --workspace=@taskboard/client` to confirm no regressions

## 7. Verification Commands

```bash
# 1. Verify BoardProvider is imported in board-page.tsx
grep "BoardProvider" packages/client/src/pages/board-page.tsx

# 2. Verify BoardView is imported in board-page.tsx
grep "BoardView" packages/client/src/pages/board-page.tsx

# 3. Verify useBoard is imported in board-page.tsx
grep "useBoard" packages/client/src/pages/board-page.tsx

# 4. Verify loadBoard is called in a useEffect
grep "loadBoard" packages/client/src/pages/board-page.tsx

# 5. Verify the placeholder text is gone
grep -c "Board coming in Milestone 4" packages/client/src/pages/board-page.tsx
# Expected: 0

# 6. Verify project name heading is still present
grep "project.name" packages/client/src/pages/board-page.tsx

# 7. Verify project-not-found guard is still present
grep "Project not found" packages/client/src/pages/board-page.tsx

# 8. TypeScript compilation
cd packages/client && npx tsc --noEmit && cd ../..

# 9. Run board-page tests only
cd packages/client && npx vitest run src/pages/__tests__/board-page.test.tsx && cd ../..

# 10. Run all client tests to check for regressions
npm run test --workspace=@taskboard/client
```