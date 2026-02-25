Now I have all the context needed. Let me produce the implementation plan.

# Task 2 Implementation Plan — Extend Board Context with Task Mutations

## 1. Deliverables

| File | Action | Purpose |
|------|--------|---------|
| `packages/client/src/context/board-context.tsx` | **Modify** | Add `createTask`, `moveTask`, and `setTasks` to the board context |
| `packages/client/src/context/__tests__/board-context.test.tsx` | **Modify** | Add unit tests for the new context methods |

---

## 2. Dependencies

- **t01 complete** — `packages/client/src/api/tasks.ts` exists and exports `createTask` and `moveTask` functions (verified: file exists with all four functions)
- **Shared types** — `Task`, `Priority`, `ApiSuccessResponse` exported from `@taskboard/shared`
- **Existing board context** — `BoardProvider` and `useBoard` already manage `board`, `tasks`, `isLoading`, `error`, `loadBoard`, and column management methods

No npm packages to install.

---

## 3. Implementation Details

### File: `packages/client/src/context/board-context.tsx`

**Purpose**: Extend the existing `BoardContext` with three new capabilities: creating tasks, moving tasks with optimistic rollback, and exposing the tasks state setter for drag handlers.

#### 3.1 New Imports

Add imports for the API functions from the task module created in t01:

```typescript
import {
  createTask as apiCreateTask,
  moveTask as apiMoveTask,
} from "../api/tasks";
```

These follow the aliasing convention already used for column operations (e.g., `addColumn as apiAddColumn`).

Add `Dispatch` and `SetStateAction` to the React import:

```typescript
import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
```

#### 3.2 Extend `BoardContextValue` Interface

Add three new methods to the existing interface:

```typescript
interface BoardContextValue {
  // ... existing fields ...
  createTask: (columnName: string, title: string) => Promise<Task>;
  moveTask: (taskId: string, status: string, position: number) => Promise<void>;
  setTasks: Dispatch<SetStateAction<Task[]>>;
}
```

- `createTask` — creates a task in a specific column and appends it to local state
- `moveTask` — optimistically moves a task (changes status/position) with rollback on failure
- `setTasks` — exposes the raw `useState` setter so `BoardView` can perform intermediate optimistic reordering during `onDragOver` events

#### 3.3 Implement `createTask`

```typescript
const createTask = useCallback(
  async (columnName: string, title: string): Promise<Task> => {
    if (!board) throw new Error("Board not loaded");
    const response = await apiCreateTask(board._id, {
      title,
      status: columnName,
    });
    const newTask = response.data;
    setTasks((prev) => [...prev, newTask]);
    return newTask;
  },
  [board],
);
```

**Behavior**:
- Guards on `board` being loaded (same pattern as `addColumn`, `removeColumn`, etc.)
- Calls the API with the board's `_id` and `{ title, status: columnName }`
- On success, appends the returned `Task` to the `tasks` state array
- Returns the created task to the caller (so `AddTaskForm` can use it if needed)
- On API failure, the error propagates naturally (no optimistic update to roll back since the task doesn't exist yet in local state)

**Dependency array**: `[board]` — needs `board._id` for the API call. `setTasks` is stable (from `useState`) and does not need to be listed.

#### 3.4 Implement `moveTask`

```typescript
const moveTask = useCallback(
  async (taskId: string, status: string, position: number): Promise<void> => {
    if (!board) throw new Error("Board not loaded");

    // Snapshot for rollback
    const previousTasks = tasks;

    // Optimistic update
    setTasks((prev) => {
      const taskIndex = prev.findIndex((t) => t._id === taskId);
      if (taskIndex === -1) return prev;

      const task = prev[taskIndex];
      const updated = prev.filter((t) => t._id !== taskId);

      // Reindex source column (remove gap)
      const sourceColumnTasks = updated
        .filter((t) => t.status === task.status)
        .sort((a, b) => a.position - b.position)
        .map((t, i) => ({ ...t, position: i }));

      // Get destination column tasks (excluding the moved task, after source reindex)
      const destColumnTasks =
        status === task.status
          ? sourceColumnTasks
          : updated
              .filter((t) => t.status === status)
              .sort((a, b) => a.position - b.position);

      // Clamp position
      const clampedPosition = Math.min(position, destColumnTasks.length);

      // Shift destination tasks at >= clampedPosition
      const shiftedDestTasks = destColumnTasks.map((t) =>
        t.position >= clampedPosition
          ? { ...t, position: t.position + 1 }
          : t,
      );

      // Build moved task with new status and position
      const movedTask = {
        ...task,
        status,
        position: clampedPosition,
      };

      // Reconstruct: all tasks not in source or dest columns + reindexed source + shifted dest + moved task
      const otherTasks = updated.filter(
        (t) => t.status !== task.status && t.status !== status,
      );

      if (status === task.status) {
        // Same column move: source and dest are the same
        return [...otherTasks, ...shiftedDestTasks, movedTask];
      }

      return [...otherTasks, ...sourceColumnTasks, ...shiftedDestTasks, movedTask];
    });

    try {
      await apiMoveTask(taskId, { status, position });
    } catch (err) {
      // Revert to snapshot
      setTasks(previousTasks);
      setError(
        err instanceof Error ? err.message : "Failed to move task",
      );
    }
  },
  [board, tasks],
);
```

**Behavior**:
- Guards on `board` being loaded
- Snapshots the entire `tasks` array before modification (same pattern as `reorderColumns` snapshots `previousColumns`)
- Applies an optimistic update immediately:
  1. Removes the task from its current position
  2. Reindexes the source column tasks to fill the gap (positions become 0, 1, 2, ...)
  3. For cross-column: shifts destination column tasks at `>= position` up by 1 to make room
  4. For same-column: treats the reindexed source as the destination
  5. Inserts the task with `status` and clamped `position`
- Calls `apiMoveTask(taskId, { status, position })`
- On failure: restores the snapshot and sets `error` (exactly matching `reorderColumns` rollback pattern)
- Does **not** re-throw on failure (the error is captured in state, same as `reorderColumns`)

**Dependency array**: `[board, tasks]` — needs `board` for the guard and `tasks` for the snapshot. The `tasks` reference in the dependency array ensures the snapshot captures the latest state at the time `moveTask` is called.

**Note on `tasks` in dependency array**: The `tasks` reference is needed in the dependency array because we read `tasks` directly (not via the setter callback) for the snapshot: `const previousTasks = tasks`. This is intentional — the snapshot must capture the exact tasks array at invocation time, not the value from inside a setter callback.

#### 3.5 Expose `setTasks` in the Context Value

The `setTasks` function from `useState` is already available in the `BoardProvider`. It just needs to be passed through the context `value`:

```typescript
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
    createTask,
    moveTask,
    setTasks,
  }}
>
  {children}
</BoardContext.Provider>
```

---

## 4. Contracts

### `createTask(columnName, title)` → `Task`

**Input**: 
- `columnName: string` — column name (e.g., `"To Do"`) mapped to the task's `status`
- `title: string` — the task title

**Behavior**:
- Calls `POST /api/boards/:boardId/tasks` with `{ title, status: columnName }`
- Appends the API response task to the `tasks` state
- Returns the created `Task` object

**Error behavior**: Throws on API failure. No local state change on failure (task was never added optimistically).

### `moveTask(taskId, status, position)` → `void`

**Input**:
- `taskId: string` — ID of the task to move
- `status: string` — destination column name
- `position: number` — target position index within the destination column

**Behavior**:
- Snapshots `tasks`, applies optimistic update, calls `PUT /api/tasks/:taskId/move`
- On success: local state already reflects the move
- On failure: reverts to snapshot, sets `error` state

### `setTasks` — `Dispatch<SetStateAction<Task[]>>`

**Purpose**: Allows `BoardView` drag handlers to perform intermediate reordering during `onDragOver` for smooth animations. Direct exposure of React's `useState` setter — accepts either a new array or an updater function.

---

## 5. Test Plan

### File: `packages/client/src/context/__tests__/board-context.test.tsx`

**Setup changes**:
- Add mock for `../../api/tasks` module alongside the existing `../../api/boards` mock
- Add typed mock references for `createTask` and `moveTask` from the tasks API module

#### Additional Mock Setup

```typescript
vi.mock("../../api/tasks", () => ({
  createTask: vi.fn(),
  moveTask: vi.fn(),
}));

import {
  createTask as apiCreateTask,
  moveTask as apiMoveTask,
} from "../../api/tasks";

const mockApiCreateTask = apiCreateTask as ReturnType<typeof vi.fn>;
const mockApiMoveTask = apiMoveTask as ReturnType<typeof vi.fn>;
```

#### Update `TestConsumer` Component

Add display elements for new state to enable assertions:

```typescript
<span data-testid="task-titles">
  {values.tasks.map((t) => t.title).join(",")}
</span>
<span data-testid="task-statuses">
  {values.tasks.map((t) => `${t._id}:${t.status}:${t.position}`).join(",")}
</span>
```

#### Test Specifications

**Test 1: `createTask calls API and appends task to state`**

- Setup: Load board with mockBoard and mockTasks (1 existing task in "To Do")
- Mock `apiCreateTask` to resolve with a new task `{ _id: "task2", title: "New Task", status: "In Progress", position: 0, ... }`
- Act: call `testHookValues.createTask("In Progress", "New Task")`
- Assert:
  - `mockApiCreateTask` was called with `("board1", { title: "New Task", status: "In Progress" })`
  - Return value matches the new task
  - `task-count` shows `2`
  - The new task is present in the rendered task list

**Test 2: `createTask returns the created task`**

- Setup: Load board, mock API success
- Act: `const result = await testHookValues.createTask("To Do", "Another Task")`
- Assert: `result._id` matches the mock response, `result.title === "Another Task"`

**Test 3: `createTask throws when board not loaded`**

- Setup: Render without loading board
- Act + Assert: `await expect(act(...)).rejects.toThrow("Board not loaded")`

**Test 4: `createTask does not modify state on API failure`**

- Setup: Load board, mock `apiCreateTask` to reject
- Act: catch the rejection
- Assert: `task-count` still shows original count (`1`)

**Test 5: `moveTask optimistically updates task status and position`**

- Setup: Load board with multiple tasks across columns:
  ```typescript
  const multiTasks = [
    { _id: "task1", title: "Task 1", status: "To Do", position: 0, ... },
    { _id: "task2", title: "Task 2", status: "To Do", position: 1, ... },
    { _id: "task3", title: "Task 3", status: "In Progress", position: 0, ... },
  ];
  ```
- Mock `apiMoveTask` to resolve with the moved task
- Act: `await testHookValues.moveTask("task1", "In Progress", 1)`
- Assert:
  - `mockApiMoveTask` called with `("task1", { status: "In Progress", position: 1 })`
  - task1's status is now "In Progress"
  - task2 (remaining in "To Do") has position 0
  - task3 (existing in "In Progress") still at position 0
  - task1 now at position 1 in "In Progress"

**Test 6: `moveTask reverts on API failure and sets error`**

- Setup: Load board with multiple tasks
- Mock `apiMoveTask` to reject with `new Error("Move failed")`
- Act: `await testHookValues.moveTask("task1", "In Progress", 0)`
- Assert:
  - After awaiting, task statuses/positions match the original state (rollback)
  - `error` testid shows "Move failed"

**Test 7: `moveTask throws when board not loaded`**

- Setup: Render without loading board
- Act + Assert: `await expect(act(...)).rejects.toThrow("Board not loaded")`

**Test 8: `moveTask handles same-column reorder`**

- Setup: Load board with two tasks in "To Do" at positions 0 and 1
- Mock `apiMoveTask` to resolve
- Act: `await testHookValues.moveTask("task1", "To Do", 1)`
- Assert: task1 is at position 1, task2 is at position 0 in "To Do"

**Test 9: `setTasks is exposed and can update tasks`**

- Setup: Load board with initial tasks
- Act: `act(() => testHookValues.setTasks([]))`
- Assert: `task-count` shows `0`

---

## 6. Implementation Order

### Step 1: Modify `board-context.tsx`

1. Add imports for `apiCreateTask` and `apiMoveTask` from `../api/tasks`
2. Add `Dispatch` and `SetStateAction` to the `react` type imports
3. Extend the `BoardContextValue` interface with `createTask`, `moveTask`, and `setTasks`
4. Implement the `createTask` callback inside `BoardProvider`
5. Implement the `moveTask` callback inside `BoardProvider`
6. Add `createTask`, `moveTask`, and `setTasks` to the context provider `value` object

### Step 2: Modify `board-context.test.tsx`

1. Add `vi.mock("../../api/tasks", ...)` for the task API module
2. Add import and typed mock references for `createTask` and `moveTask` from `../../api/tasks`
3. Add display elements to `TestConsumer` for task statuses/positions
4. Add a richer `mockTasks` array variant (`multiTasks`) for move tests
5. Implement all 9 test cases described in the test plan

### Step 3: Verify

Run TypeScript compilation and tests to confirm everything works.

---

## 7. Verification Commands

```bash
# 1. TypeScript compilation — must succeed with no errors
npx tsc --noEmit -p packages/client/tsconfig.json

# 2. Run board context tests specifically
npx vitest run packages/client/src/context/__tests__/board-context.test.tsx

# 3. Run full client test suite to check for regressions
npm run test -w packages/client

# 4. Verify the new methods are on the interface (quick grep)
grep -n "createTask\|moveTask\|setTasks" packages/client/src/context/board-context.tsx
```

---

## Complete Modified File: `packages/client/src/context/board-context.tsx`

```typescript
import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { Board, Column, Task } from "@taskboard/shared";
import {
  fetchBoard,
  fetchBoardTasks,
  addColumn as apiAddColumn,
  renameColumn as apiRenameColumn,
  deleteColumn as apiDeleteColumn,
  reorderColumns as apiReorderColumns,
} from "../api/boards";
import {
  createTask as apiCreateTask,
  moveTask as apiMoveTask,
} from "../api/tasks";

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
  createTask: (columnName: string, title: string) => Promise<Task>;
  moveTask: (taskId: string, status: string, position: number) => Promise<void>;
  setTasks: Dispatch<SetStateAction<Task[]>>;
}

const BoardContext = createContext<BoardContextValue | null>(null);

export function BoardProvider({ children }: { children: ReactNode }) {
  const [board, setBoard] = useState<Board | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const addColumn = useCallback(async (name: string): Promise<Column> => {
    if (!board) throw new Error("Board not loaded");
    const response = await apiAddColumn(board._id, name);
    const newColumn = response.data;
    setBoard((prev) =>
      prev ? { ...prev, columns: [...prev.columns, newColumn] } : prev,
    );
    return newColumn;
  }, [board]);

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

  const createTask = useCallback(
    async (columnName: string, title: string): Promise<Task> => {
      if (!board) throw new Error("Board not loaded");
      const response = await apiCreateTask(board._id, {
        title,
        status: columnName,
      });
      const newTask = response.data;
      setTasks((prev) => [...prev, newTask]);
      return newTask;
    },
    [board],
  );

  const moveTask = useCallback(
    async (taskId: string, status: string, position: number): Promise<void> => {
      if (!board) throw new Error("Board not loaded");

      // Snapshot for rollback
      const previousTasks = tasks;

      // Optimistic update
      setTasks((prev) => {
        const taskIndex = prev.findIndex((t) => t._id === taskId);
        if (taskIndex === -1) return prev;

        const task = prev[taskIndex];
        const remaining = prev.filter((t) => t._id !== taskId);

        // Reindex source column (fill gap left by removed task)
        const sourceColumnTasks = remaining
          .filter((t) => t.status === task.status)
          .sort((a, b) => a.position - b.position)
          .map((t, i) => ({ ...t, position: i }));

        // Get destination column tasks
        const destColumnTasks =
          status === task.status
            ? sourceColumnTasks
            : remaining
                .filter((t) => t.status === status)
                .sort((a, b) => a.position - b.position);

        // Clamp position to valid range
        const clampedPosition = Math.min(position, destColumnTasks.length);

        // Shift destination tasks at >= clampedPosition
        const shiftedDestTasks = destColumnTasks.map((t) =>
          t.position >= clampedPosition
            ? { ...t, position: t.position + 1 }
            : t,
        );

        // Build moved task
        const movedTask = { ...task, status, position: clampedPosition };

        // Reconstruct full task list
        const otherTasks = remaining.filter(
          (t) => t.status !== task.status && t.status !== status,
        );

        if (status === task.status) {
          return [...otherTasks, ...shiftedDestTasks, movedTask];
        }
        return [...otherTasks, ...sourceColumnTasks, ...shiftedDestTasks, movedTask];
      });

      try {
        await apiMoveTask(taskId, { status, position });
      } catch (err) {
        // Revert to snapshot
        setTasks(previousTasks);
        setError(
          err instanceof Error ? err.message : "Failed to move task",
        );
      }
    },
    [board, tasks],
  );

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
        createTask,
        moveTask,
        setTasks,
      }}
    >
      {children}
    </BoardContext.Provider>
  );
}

export function useBoard(): BoardContextValue {
  const context = useContext(BoardContext);
  if (!context) {
    throw new Error("useBoard must be used within a BoardProvider");
  }
  return context;
}
```

---

## Complete Modified File: `packages/client/src/context/__tests__/board-context.test.tsx`

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
import {
  createTask as apiCreateTask,
  moveTask as apiMoveTask,
} from "../../api/tasks";

vi.mock("../../api/boards", () => ({
  fetchBoard: vi.fn(),
  fetchBoardTasks: vi.fn(),
  addColumn: vi.fn(),
  renameColumn: vi.fn(),
  deleteColumn: vi.fn(),
  reorderColumns: vi.fn(),
}));

vi.mock("../../api/tasks", () => ({
  createTask: vi.fn(),
  moveTask: vi.fn(),
}));

const mockFetchBoard = fetchBoard as ReturnType<typeof vi.fn>;
const mockFetchBoardTasks = fetchBoardTasks as ReturnType<typeof vi.fn>;
const mockAddColumn = addColumn as ReturnType<typeof vi.fn>;
const mockRenameColumn = renameColumn as ReturnType<typeof vi.fn>;
const mockDeleteColumn = deleteColumn as ReturnType<typeof vi.fn>;
const mockReorderColumns = reorderColumns as ReturnType<typeof vi.fn>;
const mockApiCreateTask = apiCreateTask as ReturnType<typeof vi.fn>;
const mockApiMoveTask = apiMoveTask as ReturnType<typeof vi.fn>;

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

const multiTasks = [
  {
    _id: "task1",
    title: "Task 1",
    status: "To Do",
    priority: "medium" as const,
    position: 0,
    labels: [],
    board: "board1",
    project: "proj1",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },
  {
    _id: "task2",
    title: "Task 2",
    status: "To Do",
    priority: "high" as const,
    position: 1,
    labels: [],
    board: "board1",
    project: "proj1",
    createdAt: "2025-01-02T00:00:00.000Z",
    updatedAt: "2025-01-02T00:00:00.000Z",
  },
  {
    _id: "task3",
    title: "Task 3",
    status: "In Progress",
    priority: "low" as const,
    position: 0,
    labels: [],
    board: "board1",
    project: "proj1",
    createdAt: "2025-01-03T00:00:00.000Z",
    updatedAt: "2025-01-03T00:00:00.000Z",
  },
];

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
      <span data-testid="task-statuses">
        {values.tasks
          .sort((a, b) => a._id.localeCompare(b._id))
          .map((t) => `${t._id}:${t.status}:${t.position}`)
          .join(",")}
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

describe("BoardContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ... ALL EXISTING TESTS REMAIN UNCHANGED ...

  it("useBoard throws when used outside BoardProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      "useBoard must be used within a BoardProvider",
    );
    spy.mockRestore();
  });

  it("initial state has no board, empty tasks, not loading, no error", () => {
    renderWithProvider();
    expect(screen.getByTestId("board")).toHaveTextContent("null");
    expect(screen.getByTestId("task-count")).toHaveTextContent("0");
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    expect(screen.getByTestId("error")).toHaveTextContent("");
  });

  it("loadBoard fetches board and tasks, sets state", async () => {
    mockFetchBoard.mockResolvedValue({ data: mockBoard });
    mockFetchBoardTasks.mockResolvedValue({ data: mockTasks });
    renderWithProvider();
    await act(async () => {
      await testHookValues.loadBoard("proj1");
    });
    expect(mockFetchBoard).toHaveBeenCalledWith("proj1");
    expect(mockFetchBoardTasks).toHaveBeenCalledWith("board1");
    expect(screen.getByTestId("board")).toHaveTextContent("board1");
    expect(screen.getByTestId("task-count")).toHaveTextContent("1");
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });

  it("loadBoard sets error on fetchBoard failure", async () => {
    mockFetchBoard.mockRejectedValue(new Error("Network error"));
    renderWithProvider();
    await act(async () => {
      await testHookValues.loadBoard("proj1");
    });
    expect(screen.getByTestId("error")).toHaveTextContent("Network error");
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    expect(screen.getByTestId("board")).toHaveTextContent("null");
  });

  it("loadBoard sets error when fetchBoardTasks fails", async () => {
    mockFetchBoard.mockResolvedValue({ data: mockBoard });
    mockFetchBoardTasks.mockRejectedValue(new Error("Tasks fetch failed"));
    renderWithProvider();
    await act(async () => {
      await testHookValues.loadBoard("proj1");
    });
    expect(screen.getByTestId("error")).toHaveTextContent("Tasks fetch failed");
  });

  it("addColumn calls API and appends column to state", async () => {
    mockFetchBoard.mockResolvedValue({ data: mockBoard });
    mockFetchBoardTasks.mockResolvedValue({ data: mockTasks });
    mockAddColumn.mockResolvedValue({ data: { _id: "col4", name: "QA", position: 3 } });
    renderWithProvider();
    await act(async () => {
      await testHookValues.loadBoard("proj1");
    });
    let result;
    await act(async () => {
      result = await testHookValues.addColumn("QA");
    });
    expect(mockAddColumn).toHaveBeenCalledWith("board1", "QA");
    expect(result).toEqual({ _id: "col4", name: "QA", position: 3 });
    expect(screen.getByTestId("columns")).toHaveTextContent("To Do,In Progress,Done,QA");
  });

  it("addColumn throws when board not loaded", async () => {
    renderWithProvider();
    await expect(
      act(async () => {
        await testHookValues.addColumn("QA");
      }),
    ).rejects.toThrow("Board not loaded");
  });

  it("renameColumn calls API and updates column name in state", async () => {
    mockFetchBoard.mockResolvedValue({ data: mockBoard });
    mockFetchBoardTasks.mockResolvedValue({ data: mockTasks });
    mockRenameColumn.mockResolvedValue({ data: { _id: "col1", name: "Backlog", position: 0 } });
    renderWithProvider();
    await act(async () => {
      await testHookValues.loadBoard("proj1");
    });
    await act(async () => {
      await testHookValues.renameColumn("col1", "Backlog");
    });
    expect(mockRenameColumn).toHaveBeenCalledWith("board1", "col1", "Backlog");
    expect(screen.getByTestId("columns")).toHaveTextContent("Backlog,In Progress,Done");
  });

  it("renameColumn throws when board not loaded", async () => {
    renderWithProvider();
    await expect(
      act(async () => {
        await testHookValues.renameColumn("col1", "Backlog");
      }),
    ).rejects.toThrow("Board not loaded");
  });

  it("removeColumn calls API and removes column from state", async () => {
    mockFetchBoard.mockResolvedValue({ data: mockBoard });
    mockFetchBoardTasks.mockResolvedValue({ data: mockTasks });
    mockDeleteColumn.mockResolvedValue({ data: { message: "Column deleted" } });
    renderWithProvider();
    await act(async () => {
      await testHookValues.loadBoard("proj1");
    });
    await act(async () => {
      await testHookValues.removeColumn("col1");
    });
    expect(mockDeleteColumn).toHaveBeenCalledWith("board1", "col1");
    expect(screen.getByTestId("columns")).toHaveTextContent("In Progress,Done");
  });

  it("removeColumn re-throws on API failure and does not modify state", async () => {
    mockFetchBoard.mockResolvedValue({ data: mockBoard });
    mockFetchBoardTasks.mockResolvedValue({ data: mockTasks });
    mockDeleteColumn.mockRejectedValue(new Error("Cannot delete column that contains tasks"));
    renderWithProvider();
    await act(async () => {
      await testHookValues.loadBoard("proj1");
    });
    await expect(
      act(async () => {
        await testHookValues.removeColumn("col1");
      }),
    ).rejects.toThrow("Cannot delete column that contains tasks");
    expect(screen.getByTestId("columns")).toHaveTextContent("To Do,In Progress,Done");
  });

  it("removeColumn throws when board not loaded", async () => {
    renderWithProvider();
    await expect(
      act(async () => {
        await testHookValues.removeColumn("col1");
      }),
    ).rejects.toThrow("Board not loaded");
  });

  it("reorderColumns optimistically reorders columns", async () => {
    mockFetchBoard.mockResolvedValue({ data: mockBoard });
    mockFetchBoardTasks.mockResolvedValue({ data: mockTasks });
    mockReorderColumns.mockResolvedValue({ data: mockBoard });
    renderWithProvider();
    await act(async () => {
      await testHookValues.loadBoard("proj1");
    });
    await act(async () => {
      await testHookValues.reorderColumns(["col3", "col1", "col2"]);
    });
    expect(screen.getByTestId("columns")).toHaveTextContent("Done,To Do,In Progress");
  });

  it("reorderColumns reverts on API failure and sets error", async () => {
    mockFetchBoard.mockResolvedValue({ data: mockBoard });
    mockFetchBoardTasks.mockResolvedValue({ data: mockTasks });
    mockReorderColumns.mockRejectedValue(new Error("Reorder failed"));
    renderWithProvider();
    await act(async () => {
      await testHookValues.loadBoard("proj1");
    });
    await act(async () => {
      await testHookValues.reorderColumns(["col3", "col1", "col2"]);
    });
    await waitFor(() => {
      expect(screen.getByTestId("columns")).toHaveTextContent("To Do,In Progress,Done");
    });
    expect(screen.getByTestId("error")).toHaveTextContent("Reorder failed");
  });

  it("reorderColumns throws when board not loaded", async () => {
    renderWithProvider();
    await expect(
      act(async () => {
        await testHookValues.reorderColumns(["col3", "col1", "col2"]);
      }),
    ).rejects.toThrow("Board not loaded");
  });

  // ===== NEW TESTS: createTask =====

  it("createTask calls API and appends task to state", async () => {
    mockFetchBoard.mockResolvedValue({ data: mockBoard });
    mockFetchBoardTasks.mockResolvedValue({ data: mockTasks });
    const newTask = {
      _id: "task2",
      title: "New Task",
      status: "In Progress",
      priority: "medium" as const,
      position: 0,
      labels: [],
      board: "board1",
      project: "proj1",
      createdAt: "2025-01-02T00:00:00.000Z",
      updatedAt: "2025-01-02T00:00:00.000Z",
    };
    mockApiCreateTask.mockResolvedValue({ data: newTask });

    renderWithProvider();

    await act(async () => {
      await testHookValues.loadBoard("proj1");
    });

    let result;
    await act(async () => {
      result = await testHookValues.createTask("In Progress", "New Task");
    });

    expect(mockApiCreateTask).toHaveBeenCalledWith("board1", {
      title: "New Task",
      status: "In Progress",
    });
    expect(result).toEqual(newTask);
    expect(screen.getByTestId("task-count")).toHaveTextContent("2");
  });

  it("createTask throws when board not loaded", async () => {
    renderWithProvider();

    await expect(
      act(async () => {
        await testHookValues.createTask("To Do", "New Task");
      }),
    ).rejects.toThrow("Board not loaded");
  });

  it("createTask does not modify state on API failure", async () => {
    mockFetchBoard.mockResolvedValue({ data: mockBoard });
    mockFetchBoardTasks.mockResolvedValue({ data: mockTasks });
    mockApiCreateTask.mockRejectedValue(new Error("Create failed"));

    renderWithProvider();

    await act(async () => {
      await testHookValues.loadBoard("proj1");
    });

    await expect(
      act(async () => {
        await testHookValues.createTask("To Do", "New Task");
      }),
    ).rejects.toThrow("Create failed");

    expect(screen.getByTestId("task-count")).toHaveTextContent("1");
  });

  // ===== NEW TESTS: moveTask =====

  it("moveTask optimistically updates task status and position (cross-column)", async () => {
    mockFetchBoard.mockResolvedValue({ data: mockBoard });
    mockFetchBoardTasks.mockResolvedValue({ data: multiTasks });
    const movedTask = { ...multiTasks[0], status: "In Progress", position: 1 };
    mockApiMoveTask.mockResolvedValue({ data: movedTask });

    renderWithProvider();

    await act(async () => {
      await testHookValues.loadBoard("proj1");
    });

    await act(async () => {
      await testHookValues.moveTask("task1", "In Progress", 1);
    });

    expect(mockApiMoveTask).toHaveBeenCalledWith("task1", {
      status: "In Progress",
      position: 1,
    });

    // task1 moved to In Progress at position 1
    // task2 reindexed in To Do to position 0
    // task3 stays in In Progress at position 0
    const statuses = screen.getByTestId("task-statuses").textContent;
    expect(statuses).toContain("task1:In Progress:1");
    expect(statuses).toContain("task2:To Do:0");
    expect(statuses).toContain("task3:In Progress:0");
  });

  it("moveTask reverts on API failure and sets error", async () => {
    mockFetchBoard.mockResolvedValue({ data: mockBoard });
    mockFetchBoardTasks.mockResolvedValue({ data: multiTasks });
    mockApiMoveTask.mockRejectedValue(new Error("Move failed"));

    renderWithProvider();

    await act(async () => {
      await testHookValues.loadBoard("proj1");
    });

    await act(async () => {
      await testHookValues.moveTask("task1", "In Progress", 0);
    });

    await waitFor(() => {
      const statuses = screen.getByTestId("task-statuses").textContent;
      expect(statuses).toContain("task1:To Do:0");
      expect(statuses).toContain("task2:To Do:1");
      expect(statuses).toContain("task3:In Progress:0");
    });
    expect(screen.getByTestId("error")).toHaveTextContent("Move failed");
  });

  it("moveTask throws when board not loaded", async () => {
    renderWithProvider();

    await expect(
      act(async () => {
        await testHookValues.moveTask("task1", "In Progress", 0);
      }),
    ).rejects.toThrow("Board not loaded");
  });

  it("moveTask handles same-column reorder", async () => {
    mockFetchBoard.mockResolvedValue({ data: mockBoard });
    mockFetchBoardTasks.mockResolvedValue({ data: multiTasks });
    const movedTask = { ...multiTasks[0], status: "To Do", position: 1 };
    mockApiMoveTask.mockResolvedValue({ data: movedTask });

    renderWithProvider();

    await act(async () => {
      await testHookValues.loadBoard("proj1");
    });

    await act(async () => {
      await testHookValues.moveTask("task1", "To Do", 1);
    });

    expect(mockApiMoveTask).toHaveBeenCalledWith("task1", {
      status: "To Do",
      position: 1,
    });

    const statuses = screen.getByTestId("task-statuses").textContent;
    // task1 moved to position 1, task2 shifted to accommodate
    expect(statuses).toContain("task1:To Do:1");
  });

  // ===== NEW TEST: setTasks =====

  it("setTasks is exposed and can update tasks directly", async () => {
    mockFetchBoard.mockResolvedValue({ data: mockBoard });
    mockFetchBoardTasks.mockResolvedValue({ data: mockTasks });

    renderWithProvider();

    await act(async () => {
      await testHookValues.loadBoard("proj1");
    });

    expect(screen.getByTestId("task-count")).toHaveTextContent("1");

    act(() => {
      testHookValues.setTasks([]);
    });

    expect(screen.getByTestId("task-count")).toHaveTextContent("0");
  });
});
```