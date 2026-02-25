Now I have everything I need. Let me produce the complete revised plan.

# Task 5: `BoardView` Component with Column Drag-and-Drop — Implementation Plan

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/client/src/components/board-view.tsx` | Created | Board view component: fetches/renders board columns with task stubs, column drag-and-drop reorder, "Add Column" inline form |
| 2 | `packages/client/src/components/__tests__/board-view.test.tsx` | Created | Unit tests covering loading/error/null states, column rendering, task grouping, add column form, and drag-end reorder logic |

## 2. Dependencies

- **Task 3 (BoardContext)** — `packages/client/src/context/board-context.tsx` must be complete. This component consumes the `useBoard()` hook which returns:
  - `board: Board | null` — the board with its `columns` array
  - `tasks: Task[]` — flat array of all tasks for the board
  - `isLoading: boolean` — true while `loadBoard` is in progress
  - `error: string | null` — error message from load or reorder failure
  - `loadBoard: (projectId: string) => Promise<void>` — fetches board + tasks from API
  - `addColumn: (name: string) => Promise<Column>` — creates a column, appends to state
  - `renameColumn: (columnId: string, name: string) => Promise<Column>` — renames a column in state
  - `removeColumn: (columnId: string) => Promise<void>` — deletes a column from state
  - `reorderColumns: (columnIds: string[]) => Promise<void>` — optimistically reorders columns
- **Task 4 (Column component)** — `packages/client/src/components/column.tsx` must be complete. Its props interface:
  - `column: Column` — column data (`{ _id, name, position }`)
  - `taskCount: number` — number of tasks in the column
  - `onRename: (columnId: string, name: string) => Promise<void>` — rename callback
  - `onDelete: (columnId: string) => Promise<void>` — delete callback
  - `children: ReactNode` — task elements rendered inside the scrollable container
- **Task 1 (@dnd-kit packages)** — `@dnd-kit/core` and `@dnd-kit/sortable` are installed in `packages/client`
- **Existing UI components**:
  - `packages/client/src/components/ui/loading-spinner.tsx` — `LoadingSpinner` with optional `size` prop, renders an SVG spinner with `role="status"` and `aria-label="Loading"`
  - `packages/client/src/components/ui/error-message.tsx` — `ErrorMessage` with `message: string` and optional `onDismiss` prop, renders with `role="alert"`
- **Shared types** from `@taskboard/shared`: `Board`, `Column`, `Task`

## 3. Implementation Details

### 3.1 `packages/client/src/components/board-view.tsx`

**Purpose**: The main board view component that consumes `useBoard()` context, renders columns in a horizontal scrollable container with drag-and-drop reordering, groups tasks by column, and provides an "Add Column" inline form.

**Imports**:

```typescript
import { useState, useRef, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useBoard } from "../context/board-context";
import { Column } from "./column";
import { LoadingSpinner } from "./ui/loading-spinner";
import { ErrorMessage } from "./ui/error-message";
```

**Component state**:

```typescript
export function BoardView() {
  const {
    board,
    tasks,
    isLoading,
    error,
    addColumn,
    renameColumn,
    removeColumn,
    reorderColumns,
  } = useBoard();

  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const addColumnInputRef = useRef<HTMLInputElement>(null);
```

- `isAddingColumn` — controls whether the inline "Add Column" form is visible
- `newColumnName` — the text input value for the new column name
- `addColumnInputRef` — ref to auto-focus the input when the form appears

**Auto-focus the add column input when form opens**:

```typescript
  useEffect(() => {
    if (isAddingColumn && addColumnInputRef.current) {
      addColumnInputRef.current.focus();
    }
  }, [isAddingColumn]);
```

**Sensor configuration**:

```typescript
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor),
  );
```

- `PointerSensor` with `distance: 8` activation constraint — requires 8px of movement before a drag starts, preventing accidental drags when clicking buttons inside the column header
- `KeyboardSensor` — enables keyboard-based drag-and-drop for accessibility

**`handleDragEnd` handler**:

```typescript
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !board) return;

    const oldIndex = board.columns.findIndex((col) => col._id === active.id);
    const newIndex = board.columns.findIndex((col) => col._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(board.columns, oldIndex, newIndex);
    const newColumnIds = newOrder.map((col) => col._id);
    reorderColumns(newColumnIds);
  }
```

- Returns early if `over` is null (dropped outside), `active.id === over.id` (no movement), or `board` is null
- Uses `arrayMove` from `@dnd-kit/sortable` to compute the new column order
- Extracts the column IDs from the reordered array and calls `reorderColumns` (which applies an optimistic update)
- Does not `await` the result — `reorderColumns` handles optimistic revert internally

**`handleAddColumn` handler**:

```typescript
  async function handleAddColumn() {
    const trimmed = newColumnName.trim();
    if (!trimmed) return;
    try {
      await addColumn(trimmed);
      setNewColumnName("");
      setIsAddingColumn(false);
    } catch {
      // Error is handled by the context or ignored here;
      // the form stays open so the user can retry
    }
  }
```

- Trims the input; returns early if empty
- On success, clears the input and closes the form
- On failure, keeps the form open so the user can retry

**`handleAddColumnKeyDown` handler**:

```typescript
  function handleAddColumnKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddColumn();
    } else if (e.key === "Escape") {
      setNewColumnName("");
      setIsAddingColumn(false);
    }
  }
```

- Enter submits the form
- Escape cancels: clears input and closes form

**Task grouping helper** (inline, not a separate function):

Tasks are grouped per column inside the render loop. For each column:

```typescript
const columnTasks = tasks
  .filter((t) => t.status === column.name)
  .sort((a, b) => a.position - b.position);
```

- Filters tasks where `task.status` matches `column.name`
- Sorts by `position` ascending so tasks render in the correct order within each column

**Early returns for loading/error/null states**:

```typescript
  if (isLoading) {
    return (
      <div className="py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <ErrorMessage message={error} />
      </div>
    );
  }

  if (!board) {
    return null;
  }
```

- `isLoading` → render `LoadingSpinner` (centered, same wrapper as `BoardPage` currently uses)
- `error` → render `ErrorMessage` with the error message string
- `!board` (null after initial mount, before `loadBoard` is called) → render nothing

**Main JSX structure**:

```tsx
  const columnIds = board.columns.map((col) => col._id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
        <div className="flex gap-4 overflow-x-auto p-4">
          {board.columns.map((column) => {
            const columnTasks = tasks
              .filter((t) => t.status === column.name)
              .sort((a, b) => a.position - b.position);

            return (
              <Column
                key={column._id}
                column={column}
                taskCount={columnTasks.length}
                onRename={async (columnId, name) => {
                  await renameColumn(columnId, name);
                }}
                onDelete={async (columnId) => {
                  await removeColumn(columnId);
                }}
              >
                {columnTasks.map((task) => (
                  <div
                    key={task._id}
                    className="mb-2 rounded bg-white p-2 text-sm shadow-sm"
                  >
                    {task.title}
                  </div>
                ))}
              </Column>
            );
          })}

          {/* Add Column UI */}
          {isAddingColumn ? (
            <div className="flex w-72 flex-shrink-0 flex-col gap-2 rounded-lg bg-gray-100 p-3">
              <input
                ref={addColumnInputRef}
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={handleAddColumnKeyDown}
                placeholder="Column name"
                className="rounded border border-gray-300 px-2 py-1 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                aria-label="New column name"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddColumn}
                  className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setNewColumnName("");
                    setIsAddingColumn(false);
                  }}
                  className="rounded px-3 py-1 text-sm text-gray-600 hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingColumn(true)}
              className="flex h-10 w-72 flex-shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-600"
            >
              + Add Column
            </button>
          )}
        </div>
      </SortableContext>
    </DndContext>
  );
}
```

**Tailwind styling notes**:
- `flex gap-4 overflow-x-auto p-4` — horizontal flex container with gaps, horizontal scrolling for many columns, padding
- The "Add Column" button and form use `w-72 flex-shrink-0` to match the column width
- The add form has the same `bg-gray-100 rounded-lg` background as columns for visual consistency
- Task stubs use `bg-white rounded shadow-sm` to look like cards (placeholder for Phase 2's `TaskCard`)
- The dashed border on the "Add Column" button signals an interactive area

### 3.2 `packages/client/src/components/__tests__/board-view.test.tsx`

**Purpose**: Unit tests for the `BoardView` component covering all rendering states, task grouping, the add column form, and drag-end reorder logic.

**Mock setup**:

```typescript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BoardView } from "../board-view";

const mockUseBoard = vi.fn();

vi.mock("../../context/board-context", () => ({
  useBoard: (...args: unknown[]) => mockUseBoard(...args),
}));
```

Mock `@dnd-kit/core`:

```typescript
let capturedOnDragEnd: ((event: unknown) => void) | undefined;

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children, onDragEnd }: { children: React.ReactNode; onDragEnd?: (event: unknown) => void }) => {
    capturedOnDragEnd = onDragEnd;
    return <div data-testid="dnd-context">{children}</div>;
  },
  closestCenter: vi.fn(),
  PointerSensor: vi.fn(),
  KeyboardSensor: vi.fn(),
  useSensor: vi.fn((sensor) => sensor),
  useSensors: vi.fn((...sensors) => sensors),
}));
```

- `DndContext` is mocked as a simple `div` wrapper that captures the `onDragEnd` callback
- `capturedOnDragEnd` is stored so tests can simulate drag-end events by calling it directly

Mock `@dnd-kit/sortable`:

```typescript
vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sortable-context">{children}</div>
  ),
  horizontalListSortingStrategy: "horizontal",
  arrayMove: vi.fn((array: unknown[], from: number, to: number) => {
    const result = [...(array as unknown[])];
    const [removed] = result.splice(from, 1);
    result.splice(to, 0, removed);
    return result;
  }),
}));
```

- `SortableContext` is mocked as a simple `div` wrapper with a test ID
- `arrayMove` is mocked with a real implementation so the reorder logic produces correct results

Mock the `Column` component to simplify assertions:

```typescript
vi.mock("../column", () => ({
  Column: ({
    column,
    taskCount,
    children,
  }: {
    column: { _id: string; name: string };
    taskCount: number;
    children: React.ReactNode;
  }) => (
    <div data-testid={`column-${column._id}`}>
      <span data-testid={`column-name-${column._id}`}>{column.name}</span>
      <span data-testid={`column-count-${column._id}`}>{taskCount}</span>
      <div data-testid={`column-tasks-${column._id}`}>{children}</div>
    </div>
  ),
}));
```

- Each mocked `Column` renders test IDs for the column name, task count, and task children
- This avoids needing to mock `useSortable` and `@dnd-kit/utilities` (the real `Column` component requires them)

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
    title: "Write tests",
    status: "To Do",
    priority: "high" as const,
    position: 1,
    labels: [],
    board: "board1",
    project: "proj1",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },
  {
    _id: "task2",
    title: "Setup project",
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
    _id: "task3",
    title: "Deploy app",
    status: "In Progress",
    priority: "low" as const,
    position: 0,
    labels: [],
    board: "board1",
    project: "proj1",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },
];
```

- `mockTasks` has two tasks in "To Do" (positions 1 and 0) and one in "In Progress" (position 0)
- "Done" column has zero tasks — used to verify task count of 0
- Tasks are intentionally out of order by position to test sorting

**Default context state and render helper**:

```typescript
function defaultBoardState() {
  return {
    board: mockBoard,
    tasks: mockTasks,
    isLoading: false,
    error: null,
    loadBoard: vi.fn(),
    addColumn: vi.fn().mockResolvedValue({ _id: "col4", name: "QA", position: 3 }),
    renameColumn: vi.fn().mockResolvedValue({ _id: "col1", name: "Backlog", position: 0 }),
    removeColumn: vi.fn().mockResolvedValue(undefined),
    reorderColumns: vi.fn().mockResolvedValue(undefined),
  };
}

function renderBoardView(overrides?: Partial<ReturnType<typeof defaultBoardState>>) {
  const state = { ...defaultBoardState(), ...overrides };
  mockUseBoard.mockReturnValue(state);
  render(<BoardView />);
  return state;
}
```

**Test cases**:

**`describe("BoardView")`**:

**Test 1: `shows LoadingSpinner when loading`**

```typescript
it("shows LoadingSpinner when loading", () => {
  renderBoardView({ isLoading: true, board: null, tasks: [] });
  expect(screen.getByRole("status")).toBeInTheDocument();
  expect(screen.getByLabelText("Loading")).toBeInTheDocument();
});
```

- Verifies that `LoadingSpinner` renders (it has `role="status"` and `aria-label="Loading"`)

**Test 2: `shows ErrorMessage when error exists`**

```typescript
it("shows ErrorMessage when error exists", () => {
  renderBoardView({ error: "Failed to load board", board: null, tasks: [] });
  expect(screen.getByRole("alert")).toBeInTheDocument();
  expect(screen.getByText("Failed to load board")).toBeInTheDocument();
});
```

- Verifies that `ErrorMessage` renders (it has `role="alert"`)

**Test 3: `renders nothing when board is null and not loading`**

```typescript
it("renders nothing when board is null and not loading", () => {
  const { container } = render(<BoardView />);
  mockUseBoard.mockReturnValue({ ...defaultBoardState(), board: null, tasks: [] });
  const { container: c } = render(<BoardView />);
  expect(c.firstChild).toBeNull();
});
```

- When `board` is null and `isLoading` is false and `error` is null, the component returns `null`

**Test 4: `renders all columns with correct names`**

```typescript
it("renders all columns with correct names", () => {
  renderBoardView();
  expect(screen.getByTestId("column-name-col1")).toHaveTextContent("To Do");
  expect(screen.getByTestId("column-name-col2")).toHaveTextContent("In Progress");
  expect(screen.getByTestId("column-name-col3")).toHaveTextContent("Done");
});
```

**Test 5: `passes correct task count to each column`**

```typescript
it("passes correct task count to each column", () => {
  renderBoardView();
  expect(screen.getByTestId("column-count-col1")).toHaveTextContent("2");
  expect(screen.getByTestId("column-count-col2")).toHaveTextContent("1");
  expect(screen.getByTestId("column-count-col3")).toHaveTextContent("0");
});
```

- "To Do" has 2 tasks, "In Progress" has 1, "Done" has 0

**Test 6: `groups tasks by status and sorts by position`**

```typescript
it("groups tasks by status and sorts by position", () => {
  renderBoardView();
  const todoTasks = screen.getByTestId("column-tasks-col1");
  const taskTexts = todoTasks.textContent;
  // "Setup project" (position 0) should come before "Write tests" (position 1)
  expect(taskTexts).toBe("Setup projectWrite tests");
});
```

- Verifies tasks inside "To Do" column appear in position order: "Setup project" (pos 0) before "Write tests" (pos 1)

**Test 7: `renders task stubs with title text`**

```typescript
it("renders task stubs with title text", () => {
  renderBoardView();
  expect(screen.getByText("Setup project")).toBeInTheDocument();
  expect(screen.getByText("Write tests")).toBeInTheDocument();
  expect(screen.getByText("Deploy app")).toBeInTheDocument();
});
```

**Test 8: `renders DndContext and SortableContext`**

```typescript
it("renders DndContext and SortableContext", () => {
  renderBoardView();
  expect(screen.getByTestId("dnd-context")).toBeInTheDocument();
  expect(screen.getByTestId("sortable-context")).toBeInTheDocument();
});
```

**Test 9: `shows Add Column button when not adding`**

```typescript
it("shows Add Column button when not adding", () => {
  renderBoardView();
  expect(screen.getByText("+ Add Column")).toBeInTheDocument();
});
```

**Test 10: `clicking Add Column button shows inline form`**

```typescript
it("clicking Add Column button shows inline form", () => {
  renderBoardView();
  fireEvent.click(screen.getByText("+ Add Column"));
  expect(screen.getByLabelText("New column name")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
});
```

**Test 11: `Enter submits new column name and calls addColumn`**

```typescript
it("Enter submits new column name and calls addColumn", async () => {
  const state = renderBoardView();
  fireEvent.click(screen.getByText("+ Add Column"));
  const input = screen.getByLabelText("New column name");
  fireEvent.change(input, { target: { value: "QA" } });
  fireEvent.keyDown(input, { key: "Enter" });
  await waitFor(() => {
    expect(state.addColumn).toHaveBeenCalledWith("QA");
  });
});
```

**Test 12: `clicking Add button submits new column name`**

```typescript
it("clicking Add button submits new column name", async () => {
  const state = renderBoardView();
  fireEvent.click(screen.getByText("+ Add Column"));
  const input = screen.getByLabelText("New column name");
  fireEvent.change(input, { target: { value: "QA" } });
  fireEvent.click(screen.getByRole("button", { name: "Add" }));
  await waitFor(() => {
    expect(state.addColumn).toHaveBeenCalledWith("QA");
  });
});
```

**Test 13: `Escape cancels add column form`**

```typescript
it("Escape cancels add column form", () => {
  renderBoardView();
  fireEvent.click(screen.getByText("+ Add Column"));
  expect(screen.getByLabelText("New column name")).toBeInTheDocument();
  fireEvent.keyDown(screen.getByLabelText("New column name"), { key: "Escape" });
  expect(screen.queryByLabelText("New column name")).not.toBeInTheDocument();
  expect(screen.getByText("+ Add Column")).toBeInTheDocument();
});
```

**Test 14: `Cancel button closes add column form`**

```typescript
it("Cancel button closes add column form", () => {
  renderBoardView();
  fireEvent.click(screen.getByText("+ Add Column"));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByLabelText("New column name")).not.toBeInTheDocument();
  expect(screen.getByText("+ Add Column")).toBeInTheDocument();
});
```

**Test 15: `empty input does not call addColumn`**

```typescript
it("empty input does not call addColumn", async () => {
  const state = renderBoardView();
  fireEvent.click(screen.getByText("+ Add Column"));
  const input = screen.getByLabelText("New column name");
  fireEvent.change(input, { target: { value: "   " } });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(state.addColumn).not.toHaveBeenCalled();
});
```

**Test 16: `add column form closes on successful submission`**

```typescript
it("add column form closes on successful submission", async () => {
  renderBoardView();
  fireEvent.click(screen.getByText("+ Add Column"));
  const input = screen.getByLabelText("New column name");
  fireEvent.change(input, { target: { value: "QA" } });
  fireEvent.keyDown(input, { key: "Enter" });
  await waitFor(() => {
    expect(screen.queryByLabelText("New column name")).not.toBeInTheDocument();
  });
  expect(screen.getByText("+ Add Column")).toBeInTheDocument();
});
```

**Test 17: `add column form stays open on failure`**

```typescript
it("add column form stays open on failure", async () => {
  renderBoardView({
    addColumn: vi.fn().mockRejectedValue(new Error("Server error")),
  });
  fireEvent.click(screen.getByText("+ Add Column"));
  const input = screen.getByLabelText("New column name");
  fireEvent.change(input, { target: { value: "QA" } });
  fireEvent.keyDown(input, { key: "Enter" });
  await waitFor(() => {
    expect(screen.getByLabelText("New column name")).toBeInTheDocument();
  });
});
```

**Test 18: `handleDragEnd calls reorderColumns with new column order`**

```typescript
it("handleDragEnd calls reorderColumns with new column order", () => {
  const state = renderBoardView();
  // Simulate dragging col1 (index 0) over col3 (index 2)
  capturedOnDragEnd!({
    active: { id: "col1" },
    over: { id: "col3" },
  });
  expect(state.reorderColumns).toHaveBeenCalledWith(["col2", "col3", "col1"]);
});
```

- Uses the captured `onDragEnd` callback to simulate a drag event
- Dragging col1 to col3's position should produce the order [col2, col3, col1]

**Test 19: `handleDragEnd does not call reorderColumns when dropped on same position`**

```typescript
it("handleDragEnd does not call reorderColumns when dropped on same position", () => {
  const state = renderBoardView();
  capturedOnDragEnd!({
    active: { id: "col1" },
    over: { id: "col1" },
  });
  expect(state.reorderColumns).not.toHaveBeenCalled();
});
```

**Test 20: `handleDragEnd does not call reorderColumns when over is null`**

```typescript
it("handleDragEnd does not call reorderColumns when over is null", () => {
  const state = renderBoardView();
  capturedOnDragEnd!({
    active: { id: "col1" },
    over: null,
  });
  expect(state.reorderColumns).not.toHaveBeenCalled();
});
```

## 4. Contracts

### How `BoardPage` (Task 6) will consume this component

```tsx
// In board-page.tsx (Task 6):
import { useParams } from "react-router-dom";
import { useEffect } from "react";
import { BoardProvider, useBoard } from "../context/board-context";
import { BoardView } from "../components/board-view";

function BoardContent() {
  const { id } = useParams<{ id: string }>();
  const { loadBoard } = useBoard();

  useEffect(() => {
    if (id) loadBoard(id);
  }, [id, loadBoard]);

  return <BoardView />;
}

export function BoardPage() {
  return (
    <BoardProvider>
      <BoardContent />
    </BoardProvider>
  );
}
```

- `BoardPage` wraps the content in `BoardProvider`
- A child component (`BoardContent`) reads the route param and calls `loadBoard`
- `BoardView` reads all state from `useBoard()` and handles rendering

### Interface with `BoardContext`

`BoardView` is a prop-less component. It reads all data and methods from `useBoard()`:

| Context value consumed | Used for |
|----------------------|----------|
| `board` | Reading `board.columns` to render columns; null check for early return |
| `tasks` | Grouping by `task.status === column.name` to render task stubs per column |
| `isLoading` | Showing `LoadingSpinner` |
| `error` | Showing `ErrorMessage` |
| `addColumn` | Called from the "Add Column" form |
| `renameColumn` | Passed to `Column` as `onRename` callback |
| `removeColumn` | Passed to `Column` as `onDelete` callback |
| `reorderColumns` | Called from `handleDragEnd` with new column ID order |

### Interface with `Column` component

For each column in `board.columns`, `BoardView` renders:

```tsx
<Column
  key={column._id}
  column={column}
  taskCount={columnTasks.length}
  onRename={async (columnId, name) => { await renameColumn(columnId, name); }}
  onDelete={async (columnId) => { await removeColumn(columnId); }}
>
  {columnTasks.map((task) => (
    <div key={task._id} className="mb-2 rounded bg-white p-2 text-sm shadow-sm">
      {task.title}
    </div>
  ))}
</Column>
```

## 5. Test Plan

### 5.1 Test file

`packages/client/src/components/__tests__/board-view.test.tsx`

### 5.2 Test setup

- Mock `../../context/board-context` to control the return value of `useBoard()` via `mockUseBoard`
- Mock `@dnd-kit/core` to render `DndContext` as a plain `div` and capture `onDragEnd` callback
- Mock `@dnd-kit/sortable` to render `SortableContext` as a plain `div` and provide a real `arrayMove` implementation
- Mock `../column` to render a simplified `Column` with test IDs for name, task count, and children
- Define `mockBoard` (3 columns) and `mockTasks` (3 tasks across 2 columns, intentionally unsorted by position)
- Create `defaultBoardState()` helper returning the full context value shape
- Create `renderBoardView()` helper that sets `mockUseBoard` return value and renders `<BoardView />`

### 5.3 Test specifications

| # | Test Name | What It Verifies |
|---|-----------|-----------------|
| 1 | `shows LoadingSpinner when loading` | `isLoading=true` renders spinner with `role="status"` |
| 2 | `shows ErrorMessage when error exists` | `error` string renders alert with `role="alert"` |
| 3 | `renders nothing when board is null and not loading` | `board=null` + `isLoading=false` + `error=null` → returns `null` |
| 4 | `renders all columns with correct names` | All 3 column names appear via mocked `Column` |
| 5 | `passes correct task count to each column` | "To Do" = 2, "In Progress" = 1, "Done" = 0 |
| 6 | `groups tasks by status and sorts by position` | "To Do" tasks appear in position order (0, 1) |
| 7 | `renders task stubs with title text` | All 3 task titles are visible in the DOM |
| 8 | `renders DndContext and SortableContext` | Both wrappers render their test IDs |
| 9 | `shows Add Column button when not adding` | "+ Add Column" button is visible |
| 10 | `clicking Add Column button shows inline form` | Form with input, Add, and Cancel buttons appears |
| 11 | `Enter submits new column name and calls addColumn` | `addColumn("QA")` called |
| 12 | `clicking Add button submits new column name` | `addColumn("QA")` called via button click |
| 13 | `Escape cancels add column form` | Form disappears, button returns |
| 14 | `Cancel button closes add column form` | Form disappears, button returns |
| 15 | `empty input does not call addColumn` | Whitespace-only input → no API call |
| 16 | `add column form closes on successful submission` | Form disappears after resolved `addColumn` |
| 17 | `add column form stays open on failure` | Form remains after rejected `addColumn` |
| 18 | `handleDragEnd calls reorderColumns with new column order` | Simulated drag produces correct ID array |
| 19 | `handleDragEnd does not call reorderColumns when dropped on same position` | `active.id === over.id` → no call |
| 20 | `handleDragEnd does not call reorderColumns when over is null` | `over === null` → no call |

## 6. Implementation Order

1. **Create `packages/client/src/components/board-view.tsx`** — implement the full component as specified in Section 3.1
2. **Create `packages/client/src/components/__tests__/board-view.test.tsx`** — implement all 20 test cases as specified in Section 3.2
3. **Verify TypeScript compilation** — `npx tsc --noEmit` from `packages/client`
4. **Run board-view tests** — `npx vitest run src/components/__tests__/board-view.test.tsx` from `packages/client`
5. **Run all client tests** — `npm run test --workspace=@taskboard/client` to confirm no regressions

## 7. Verification Commands

```bash
# 1. Verify the component file exists
ls packages/client/src/components/board-view.tsx

# 2. Verify the test file exists
ls packages/client/src/components/__tests__/board-view.test.tsx

# 3. Verify the component exports BoardView
grep "^export function BoardView" packages/client/src/components/board-view.tsx

# 4. Verify DndContext and SortableContext are used
grep "DndContext" packages/client/src/components/board-view.tsx
grep "SortableContext" packages/client/src/components/board-view.tsx

# 5. Verify useBoard is imported
grep "useBoard" packages/client/src/components/board-view.tsx

# 6. Verify Column is imported
grep "Column" packages/client/src/components/board-view.tsx

# 7. Verify LoadingSpinner and ErrorMessage are imported
grep "LoadingSpinner" packages/client/src/components/board-view.tsx
grep "ErrorMessage" packages/client/src/components/board-view.tsx

# 8. TypeScript compilation
cd packages/client && npx tsc --noEmit && cd ../..

# 9. Run board-view tests only
cd packages/client && npx vitest run src/components/__tests__/board-view.test.tsx && cd ../..

# 10. Run all client tests to check for regressions
npm run test --workspace=@taskboard/client
```