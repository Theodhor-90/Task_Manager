Now I have all the context needed. Let me produce the implementation plan.

# Task 3: `BoardContext` — Board State Management — Implementation Plan

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/client/src/context/board-context.tsx` | Created | Board state context provider (`BoardProvider`) and `useBoard` hook — single source of truth for board data |
| 2 | `packages/client/src/context/__tests__/board-context.test.tsx` | Created | Unit tests covering all state transitions, methods, loading/error states, and optimistic revert |

## 2. Dependencies

- **Task 2 complete** — `packages/client/src/api/boards.ts` exists and exports `fetchBoard`, `fetchBoardTasks`, `addColumn`, `renameColumn`, `deleteColumn`, `reorderColumns`
- **Existing files**:
  - `packages/client/src/api/boards.ts` — API client functions consumed by this context
  - `packages/client/src/context/projects-context.tsx` — reference pattern for context structure, state management, and test conventions
  - `@taskboard/shared` — provides `Board`, `Column`, `Task`, `ApiSuccessResponse` types

## 3. Implementation Details

### 3.1 `packages/client/src/context/board-context.tsx`

**Purpose**: Provide a dedicated React context for board state management. The context holds `board`, `tasks`, `isLoading`, and `error` state, plus mutation methods for column operations. It is the single source of truth for board data consumed by `BoardView`, `Column`, and later phases' components.

**Imports**:

```typescript
import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { Board, Column, Task } from "@taskboard/shared";
import {
  fetchBoard,
  fetchBoardTasks,
  addColumn as apiAddColumn,
  renameColumn as apiRenameColumn,
  deleteColumn as apiDeleteColumn,
  reorderColumns as apiReorderColumns,
} from "../api/boards";
```

**Notes on imports**:
- API functions are aliased with `api` prefix to avoid name collisions with the context methods
- Only `useState` and `useCallback` are needed — no `useEffect` because `loadBoard` is called imperatively (unlike `ProjectsContext` which auto-fetches on mount). The `BoardProvider` does not know the `projectId` on mount; it's called by the consuming component after reading route params.

**Context value interface**:

```typescript
interface BoardContextValue {
  board: Board | null;
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  loadBoard: (projectId: string) => Promise<void>;
  addColumn: (name: string) => Promise<Column>;
  renameColumn: (columnId: string, name: string) => Promise<Column>;
  removeColumn: (columnId: string) => Promise<void>;
  reorderColumns: (columnIds: string[]) => Promise<void>;
}
```

**Context creation**:

```typescript
const BoardContext = createContext<BoardContextValue | null>(null);
```

**`BoardProvider` component**:

```typescript
export function BoardProvider({ children }: { children: ReactNode }) {
  const [board, setBoard] = useState<Board | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ... methods (see below)

  return (
    <BoardContext.Provider
      value={{
        board,
        tasks,
        isLoading,
        error,
        loadBoard,
        addColumn,
        renameColumn,
        removeColumn,
        reorderColumns,
      }}
    >
      {children}
    </BoardContext.Provider>
  );
}
```

**Key state notes**:
- `isLoading` starts as `false` (not `true` like `ProjectsContext`) because no data fetch happens on mount — `loadBoard` must be called explicitly
- `tasks` is a flat array of all tasks for the board; grouping by column is done at render time in `BoardView` (Phase 1 Task 5)

**Method: `loadBoard`**:

```typescript
const loadBoard = useCallback(async (projectId: string): Promise<void> => {
  setIsLoading(true);
  setError(null);
  try {
    const boardResponse = await fetchBoard(projectId);
    const loadedBoard = boardResponse.data;
    setBoard(loadedBoard);

    const tasksResponse = await fetchBoardTasks(loadedBoard._id);
    setTasks(tasksResponse.data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load board";
    setError(message);
  } finally {
    setIsLoading(false);
  }
}, []);
```

- Fetches the board first, then uses the returned `board._id` to fetch tasks
- Sets `isLoading` to `true` before and `false` after (via `finally`)
- Clears any previous error before starting
- On failure, extracts the error message and stores it in state
- Both fetches happen sequentially because the task fetch depends on the board ID

**Method: `addColumn`**:

```typescript
const addColumn = useCallback(async (name: string): Promise<Column> => {
  if (!board) throw new Error("Board not loaded");
  const response = await apiAddColumn(board._id, name);
  const newColumn = response.data;
  setBoard((prev) =>
    prev ? { ...prev, columns: [...prev.columns, newColumn] } : prev,
  );
  return newColumn;
}, [board]);
```

- Guards against `board` being null
- Calls the API and waits for success before updating state (not optimistic — column creation is fast and there's no existing UI state to revert)
- Appends the new column to the end of `board.columns`
- Returns the new `Column` so the calling component can use it if needed

**Method: `renameColumn`**:

```typescript
const renameColumn = useCallback(
  async (columnId: string, name: string): Promise<Column> => {
    if (!board) throw new Error("Board not loaded");
    const response = await apiRenameColumn(board._id, columnId, name);
    const updated = response.data;
    setBoard((prev) =>
      prev
        ? {
            ...prev,
            columns: prev.columns.map((col) =>
              col._id === columnId ? { ...col, name: updated.name } : col,
            ),
          }
        : prev,
    );
    return updated;
  },
  [board],
);
```

- Waits for API success before updating state (rename is not optimistic)
- Maps over columns and replaces the name of the matching column
- Returns the updated `Column`

**Method: `removeColumn`**:

```typescript
const removeColumn = useCallback(async (columnId: string): Promise<void> => {
  if (!board) throw new Error("Board not loaded");
  await apiDeleteColumn(board._id, columnId);
  setBoard((prev) =>
    prev
      ? {
          ...prev,
          columns: prev.columns.filter((col) => col._id !== columnId),
        }
      : prev,
  );
}, [board]);
```

- Calls the API first — if it fails (e.g., column has tasks), the error propagates to the caller without modifying state
- Only removes the column from state after successful API response
- The caller (Column component's delete button) will catch the error and display it via `ErrorMessage` — this is why the error is re-thrown (let to propagate) rather than caught and stored in `error` state
- Does **not** set `error` state — the component-level error display handles this (per design decision #4 in the phase spec)

**Method: `reorderColumns`**:

```typescript
const reorderColumns = useCallback(
  async (columnIds: string[]): Promise<void> => {
    if (!board) throw new Error("Board not loaded");

    // Snapshot current columns for rollback
    const previousColumns = board.columns;

    // Optimistic update: reorder columns immediately
    const reordered = columnIds
      .map((id, index) => {
        const col = previousColumns.find((c) => c._id === id);
        return col ? { ...col, position: index } : null;
      })
      .filter((col): col is Column => col !== null);

    setBoard((prev) => (prev ? { ...prev, columns: reordered } : prev));

    try {
      await apiReorderColumns(board._id, columnIds);
    } catch (err) {
      // Revert to previous column order on failure
      setBoard((prev) =>
        prev ? { ...prev, columns: previousColumns } : prev,
      );
      setError(
        err instanceof Error ? err.message : "Failed to reorder columns",
      );
    }
  },
  [board],
);
```

- **Optimistic update**: reorders columns in state immediately before the API call, so the UI feels instant
- Creates a snapshot of the current columns before the update
- Builds the reordered array by mapping over `columnIds` (the new order), looking up each column, and assigning new `position` values
- On API failure, reverts to the snapshot and sets an `error` message
- This is the only method that uses optimistic update (per the task spec)

**`useBoard` hook**:

```typescript
export function useBoard(): BoardContextValue {
  const context = useContext(BoardContext);
  if (!context) {
    throw new Error("useBoard must be used within a BoardProvider");
  }
  return context;
}
```

- Follows the exact pattern from `useProjects` — throws if used outside a provider

### 3.2 `packages/client/src/context/__tests__/board-context.test.tsx`

**Purpose**: Unit tests for `BoardContext` covering all state transitions, method behaviors, and edge cases.

**Test structure** follows the pattern from `projects-context.test.tsx`:

**Mock setup**:

```typescript
import { render, screen, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BoardProvider, useBoard } from "../board-context";
import {
  fetchBoard,
  fetchBoardTasks,
  addColumn,
  renameColumn,
  deleteColumn,
  reorderColumns,
} from "../../api/boards";

vi.mock("../../api/boards", () => ({
  fetchBoard: vi.fn(),
  fetchBoardTasks: vi.fn(),
  addColumn: vi.fn(),
  renameColumn: vi.fn(),
  deleteColumn: vi.fn(),
  reorderColumns: vi.fn(),
}));

const mockFetchBoard = fetchBoard as ReturnType<typeof vi.fn>;
const mockFetchBoardTasks = fetchBoardTasks as ReturnType<typeof vi.fn>;
const mockAddColumn = addColumn as ReturnType<typeof vi.fn>;
const mockRenameColumn = renameColumn as ReturnType<typeof vi.fn>;
const mockDeleteColumn = deleteColumn as ReturnType<typeof vi.fn>;
const mockReorderColumns = reorderColumns as ReturnType<typeof vi.fn>;
```

**Mock data**:

```typescript
const mockBoard = {
  _id: "board1",
  project: "proj1",
  columns: [
    { _id: "col1", name: "To Do", position: 0 },
    { _id: "col2", name: "In Progress", position: 1 },
    { _id: "col3", name: "Done", position: 2 },
  ],
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};

const mockTasks = [
  {
    _id: "task1",
    title: "Test Task",
    status: "To Do",
    priority: "medium" as const,
    position: 0,
    labels: [],
    board: "board1",
    project: "proj1",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },
];
```

**Test consumer component** (follows the pattern from `projects-context.test.tsx`):

```typescript
let testHookValues: ReturnType<typeof useBoard>;

function TestConsumer() {
  const values = useBoard();
  testHookValues = values;
  return (
    <div>
      <span data-testid="loading">{String(values.isLoading)}</span>
      <span data-testid="error">{values.error ?? ""}</span>
      <span data-testid="board">{values.board ? values.board._id : "null"}</span>
      <span data-testid="task-count">{values.tasks.length}</span>
      <span data-testid="columns">
        {values.board?.columns.map((c) => c.name).join(",") ?? ""}
      </span>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <BoardProvider>
      <TestConsumer />
    </BoardProvider>,
  );
}
```

**Test cases**:

| # | Test | Description |
|---|------|-------------|
| 1 | `useBoard throws when used outside BoardProvider` | Render `TestConsumer` without provider; expect error |
| 2 | `initial state is correct` | Verify `board=null`, `tasks=[]`, `isLoading=false`, `error=null` |
| 3 | `loadBoard fetches board and tasks` | Mock APIs to resolve; call `loadBoard("proj1")`; verify `isLoading` transitions, `board` is set, `tasks` are populated |
| 4 | `loadBoard sets isLoading during fetch` | Call `loadBoard` with pending promises; verify `isLoading=true`; resolve; verify `isLoading=false` |
| 5 | `loadBoard sets error on fetch failure` | Mock `fetchBoard` to reject; call `loadBoard`; verify `error` is set and `isLoading=false` |
| 6 | `loadBoard sets error when fetchBoardTasks fails` | Mock `fetchBoard` to succeed but `fetchBoardTasks` to reject; verify `error` is set |
| 7 | `addColumn calls API and appends column` | Load board first; mock `addColumn` to resolve with new column; call `addColumn("QA")`; verify column appended |
| 8 | `addColumn throws when board not loaded` | Call `addColumn` without loading board; expect thrown error |
| 9 | `renameColumn calls API and updates column name` | Load board; mock `renameColumn` to resolve; call `renameColumn("col1", "Backlog")`; verify name changed in state |
| 10 | `renameColumn throws when board not loaded` | Call `renameColumn` without loading board; expect thrown error |
| 11 | `removeColumn calls API and removes column from state` | Load board; mock `deleteColumn` to resolve; call `removeColumn("col1")`; verify column removed |
| 12 | `removeColumn re-throws on API failure (does not modify state)` | Load board; mock `deleteColumn` to reject; call `removeColumn("col1")`; expect thrown error; verify columns unchanged |
| 13 | `removeColumn throws when board not loaded` | Call `removeColumn` without loading board; expect thrown error |
| 14 | `reorderColumns applies optimistic update` | Load board; call `reorderColumns(["col3","col1","col2"])`; verify columns are reordered in state immediately |
| 15 | `reorderColumns reverts on API failure` | Load board; mock `reorderColumns` to reject; call `reorderColumns`; verify columns revert to original order and `error` is set |
| 16 | `reorderColumns throws when board not loaded` | Call `reorderColumns` without loading board; expect thrown error |

**Key test patterns**:
- Each test that calls a mutation method first calls `loadBoard` (via `act`) to populate `board` state
- Use `act(async () => { await testHookValues.loadBoard("proj1"); })` for state-changing async calls
- Use `waitFor` for assertions that depend on state updates
- Use `expect(...).rejects.toThrow()` or try/catch within `act` for error cases
- Verify mock call arguments with `toHaveBeenCalledWith`

## 4. Contracts

### `BoardContextValue` interface

| Property | Type | Description |
|----------|------|-------------|
| `board` | `Board \| null` | The current board with its columns, or `null` if not loaded |
| `tasks` | `Task[]` | Flat array of all tasks for the board |
| `isLoading` | `boolean` | `true` while `loadBoard` is in progress |
| `error` | `string \| null` | Error message from `loadBoard` or `reorderColumns` failure |
| `loadBoard` | `(projectId: string) => Promise<void>` | Fetches board and tasks from API |
| `addColumn` | `(name: string) => Promise<Column>` | Creates a column, appends to state, returns it |
| `renameColumn` | `(columnId: string, name: string) => Promise<Column>` | Renames a column, updates state, returns it |
| `removeColumn` | `(columnId: string) => Promise<void>` | Deletes a column, removes from state; re-throws on API error |
| `reorderColumns` | `(columnIds: string[]) => Promise<void>` | Optimistically reorders columns; reverts on failure |

### Consuming component examples

```typescript
// In BoardView (Task 5):
const { board, tasks, isLoading, error, loadBoard } = useBoard();
useEffect(() => { loadBoard(projectId); }, [projectId, loadBoard]);

// In Column (Task 4):
const { renameColumn, removeColumn } = useBoard();
await renameColumn(column._id, newName);

// In BoardView for column reorder (Task 5):
const { reorderColumns } = useBoard();
// on drag end:
const newOrder = arrayMove(board.columns, oldIndex, newIndex).map(c => c._id);
await reorderColumns(newOrder);
```

## 5. Test Plan

### 5.1 Test file

`packages/client/src/context/__tests__/board-context.test.tsx`

### 5.2 Test setup

- Mock `../../api/boards` entirely via `vi.mock`
- Create typed mock references for each API function
- Define `mockBoard` and `mockTasks` constants matching the shared types
- Create a `TestConsumer` component that renders state values as data-testid spans and captures `testHookValues`
- Create `renderWithProvider()` helper

### 5.3 Test specifications

**`describe("BoardContext")`**:

**Test 1: `useBoard throws when used outside BoardProvider`**
- Suppress `console.error` during this test
- Render `TestConsumer` alone (no provider)
- Expect `render()` to throw with "useBoard must be used within a BoardProvider"

**Test 2: `initial state has no board, empty tasks, not loading, no error`**
- Call `renderWithProvider()`
- Assert `screen.getByTestId("board")` has text "null"
- Assert `screen.getByTestId("task-count")` has text "0"
- Assert `screen.getByTestId("loading")` has text "false"
- Assert `screen.getByTestId("error")` has text ""

**Test 3: `loadBoard fetches board and tasks, sets state`**
- Set `mockFetchBoard.mockResolvedValue({ data: mockBoard })`
- Set `mockFetchBoardTasks.mockResolvedValue({ data: mockTasks })`
- Call `renderWithProvider()`
- `await act(async () => { await testHookValues.loadBoard("proj1"); })`
- Assert `mockFetchBoard` called with `"proj1"`
- Assert `mockFetchBoardTasks` called with `"board1"`
- Assert `screen.getByTestId("board")` has text "board1"
- Assert `screen.getByTestId("task-count")` has text "1"
- Assert `screen.getByTestId("loading")` has text "false"

**Test 4: `loadBoard sets error on fetchBoard failure`**
- Set `mockFetchBoard.mockRejectedValue(new Error("Network error"))`
- Call `loadBoard`
- Assert `screen.getByTestId("error")` has text "Network error"
- Assert `screen.getByTestId("loading")` has text "false"
- Assert `screen.getByTestId("board")` has text "null"

**Test 5: `loadBoard sets error when fetchBoardTasks fails`**
- Set `mockFetchBoard.mockResolvedValue({ data: mockBoard })`
- Set `mockFetchBoardTasks.mockRejectedValue(new Error("Tasks fetch failed"))`
- Call `loadBoard`
- Assert `screen.getByTestId("error")` has text "Tasks fetch failed"

**Test 6: `addColumn calls API and appends column to state`**
- Load board first
- Set `mockAddColumn.mockResolvedValue({ data: { _id: "col4", name: "QA", position: 3 } })`
- `const result = await act(async () => testHookValues.addColumn("QA"));`
- Assert `mockAddColumn` called with `"board1", "QA"`
- Assert result has `_id: "col4"`
- Assert `screen.getByTestId("columns")` contains "QA"

**Test 7: `addColumn throws when board not loaded`**
- Call `renderWithProvider()` without loading board
- Expect `testHookValues.addColumn("QA")` to reject with "Board not loaded"

**Test 8: `renameColumn calls API and updates column name in state`**
- Load board
- Set `mockRenameColumn.mockResolvedValue({ data: { _id: "col1", name: "Backlog", position: 0 } })`
- Call `renameColumn("col1", "Backlog")`
- Assert `mockRenameColumn` called with `"board1", "col1", "Backlog"`
- Assert columns text includes "Backlog" and no longer starts with "To Do"

**Test 9: `removeColumn calls API and removes column from state`**
- Load board
- Set `mockDeleteColumn.mockResolvedValue({ data: { message: "Column deleted" } })`
- Call `removeColumn("col1")`
- Assert `mockDeleteColumn` called with `"board1", "col1"`
- Assert columns text does not include "To Do"

**Test 10: `removeColumn re-throws on API failure and does not modify state`**
- Load board
- Set `mockDeleteColumn.mockRejectedValue(new Error("Cannot delete column that contains tasks"))`
- Call `removeColumn("col1")` and expect it to throw
- Assert columns text still includes "To Do" (state unchanged)

**Test 11: `reorderColumns optimistically reorders columns`**
- Load board
- Set `mockReorderColumns.mockResolvedValue({ data: mockBoard })` (doesn't matter for optimistic)
- Call `reorderColumns(["col3", "col1", "col2"])`
- Assert `screen.getByTestId("columns")` has text "Done,To Do,In Progress"

**Test 12: `reorderColumns reverts on API failure and sets error`**
- Load board
- Set `mockReorderColumns.mockRejectedValue(new Error("Reorder failed"))`
- Call `reorderColumns(["col3", "col1", "col2"])`
- Wait for error to appear
- Assert `screen.getByTestId("columns")` has text "To Do,In Progress,Done" (reverted)
- Assert `screen.getByTestId("error")` has text "Reorder failed"

## 6. Implementation Order

1. **Create `packages/client/src/context/board-context.tsx`**:
   - Define `BoardContextValue` interface
   - Create `BoardContext` with `createContext`
   - Implement `BoardProvider` with all state and methods
   - Export `useBoard` hook
2. **Create `packages/client/src/context/__tests__/board-context.test.tsx`**:
   - Set up mocks, mock data, test consumer, and render helper
   - Implement all 12 test cases
3. **Verify TypeScript compilation**: `npx tsc --noEmit` from `packages/client`
4. **Run tests**: `npm run test --workspace=@taskboard/client`
5. **Verify existing tests still pass**: ensure no regressions

## 7. Verification Commands

```bash
# 1. Verify the context file exists
ls packages/client/src/context/board-context.tsx

# 2. Verify the test file exists
ls packages/client/src/context/__tests__/board-context.test.tsx

# 3. Verify exports
grep -E "^export function (BoardProvider|useBoard)" packages/client/src/context/board-context.tsx

# 4. Verify context value interface contains all required properties
grep -E "(loadBoard|addColumn|renameColumn|removeColumn|reorderColumns)" packages/client/src/context/board-context.tsx

# 5. TypeScript compilation
cd packages/client && npx tsc --noEmit && cd ../..

# 6. Run board context tests specifically
cd packages/client && npx vitest run src/context/__tests__/board-context.test.tsx && cd ../..

# 7. Run all client tests to check for regressions
npm run test --workspace=@taskboard/client
```