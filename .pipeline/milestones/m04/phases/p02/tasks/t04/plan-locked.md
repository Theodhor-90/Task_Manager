Now I have everything. The `useSortable` accepts a `data` property (inherited from `UseDraggableArguments`) which is `Data` type (i.e., `Record<string, any>`). The data gets accessed via `active.data.current` (it's a `MutableRefObject`).

Now I have all the context needed to produce the implementation plan. Let me write it.

# Task 4 Implementation Plan — Integrate Task Drag-and-Drop into BoardView

## 1. Deliverables

| File | Action | Purpose |
|------|--------|---------|
| `packages/client/src/components/board-view.tsx` | **Modify** | Unified DndContext for columns + tasks, render TaskCard in sortable wrappers, DragOverlay, AddTaskForm slot |
| `packages/client/src/components/column.tsx` | **Modify** | Accept and render a `footer` prop for AddTaskForm placement below the task list |
| `packages/client/src/components/__tests__/board-view.test.tsx` | **Modify** | Update tests for unified drag context, task card rendering, drag type discrimination, AddTaskForm rendering |

---

## 2. Dependencies

- **t02 complete** — `BoardContextValue` exposes `createTask`, `moveTask`, and `setTasks` (verified in `board-context.tsx`)
- **t03 complete** — `TaskCard` component exists at `packages/client/src/components/task-card.tsx` (verified)
- **t05 (AddTaskForm)** — not yet implemented. The plan will render `AddTaskForm` if it exists; since t05 is a separate task in this phase, `BoardView` will import and render it. If t04 is implemented before t05, a stub comment or conditional import can be used. The plan assumes t05 may or may not exist at implementation time and handles both cases.
- **@dnd-kit packages** — `@dnd-kit/core@^6.3.1`, `@dnd-kit/sortable@^10.0.0`, `@dnd-kit/utilities` already installed
- **No npm packages to install**

---

## 3. Implementation Details

### File: `packages/client/src/components/board-view.tsx`

**Purpose**: Refactor the existing `BoardView` to support a unified `DndContext` handling both column reorder and task drag-and-drop. Replace placeholder task `<div>` elements with `TaskCard` components wrapped in `useSortable` containers. Add `DragOverlay` for visual feedback during drags.

#### 3.1 New Imports

Add the following imports to the existing ones:

```typescript
import type { DragStartEvent, DragOverEvent, DragEndEvent } from "@dnd-kit/core";
import { DragOverlay } from "@dnd-kit/core";
import { verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Task } from "@taskboard/shared";
import { TaskCard } from "./task-card";
import { AddTaskForm } from "./add-task-form";
```

Update the `@dnd-kit/core` import to include `DragOverlay`, and the `@dnd-kit/sortable` import to include `verticalListSortingStrategy`.

Remove the `DragEndEvent` type-only import (line 10) and merge it into the main import or keep as type import alongside the new ones.

#### 3.2 New Context Destructuring

Add `moveTask`, `setTasks`, and `createTask` to the destructured values from `useBoard()`:

```typescript
const {
  board,
  tasks,
  isLoading,
  error,
  addColumn,
  renameColumn,
  removeColumn,
  reorderColumns,
  moveTask,
  setTasks,
} = useBoard();
```

#### 3.3 New State: Active Drag Tracking

Add state to track the currently active drag item:

```typescript
const [activeTask, setActiveTask] = useState<Task | null>(null);
const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
const tasksSnapshot = useRef<Task[]>([]);
```

- `activeTask` — tracks the currently dragged task (for `DragOverlay` rendering)
- `activeColumnId` — tracks the currently dragged column ID (to preserve column overlay if needed, but primarily to discriminate drag type)
- `tasksSnapshot` — ref that stores a snapshot of tasks at drag start, used for rollback on failed API calls and for `onDragOver` intermediate reordering

Import `useRef` from React (already imported: `useState`, `useRef`, `useEffect` are on line 1).

#### 3.4 `SortableTaskItem` Wrapper Component

Define a small wrapper component inside `board-view.tsx` (not exported) that wraps a `TaskCard` in a `useSortable`:

```typescript
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableTaskItem({ task }: { task: Task }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task._id,
    data: { type: "task", task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} />
    </div>
  );
}
```

**Notes**:
- `data: { type: "task", task }` — attaches type discrimination and the task object to the draggable. Accessed via `active.data.current.type` and `active.data.current.task` in drag handlers.
- `isDragging` — reduces opacity of the original card while the `DragOverlay` shows the floating copy.
- The entire card is the drag handle (no separate activator) — tasks are dragged by clicking anywhere on them.

#### 3.5 Update Column `useSortable` Data

The `Column` component already uses `useSortable({ id: column._id })`. It needs `data: { type: "column" }` added. This requires modifying `column.tsx` (see section 3.10).

#### 3.6 `onDragStart` Handler

```typescript
function handleDragStart(event: DragStartEvent) {
  const { active } = event;
  const type = active.data.current?.type;

  if (type === "task") {
    setActiveTask(active.data.current?.task as Task);
    setActiveColumnId(null);
    tasksSnapshot.current = tasks;
  } else if (type === "column") {
    setActiveColumnId(active.id as string);
    setActiveTask(null);
  }
}
```

**Behavior**:
- Inspects `active.data.current.type` to determine if a task or column is being dragged
- For tasks: stores the task in state (for `DragOverlay`), snapshots the full `tasks` array in a ref
- For columns: stores the column ID in state, clears activeTask

#### 3.7 `onDragOver` Handler

```typescript
function handleDragOver(event: DragOverEvent) {
  const { active, over } = event;
  if (!over) return;

  const activeType = active.data.current?.type;
  if (activeType !== "task") return;

  const activeTaskId = active.id as string;
  const overId = over.id as string;

  // Determine the destination column
  const overType = over.data.current?.type;
  let overColumnName: string | undefined;

  if (overType === "task") {
    // Hovering over another task — find that task's column
    const overTask = over.data.current?.task as Task | undefined;
    overColumnName = overTask?.status;
  } else if (overType === "column") {
    // Hovering over a column (e.g., empty column droppable area)
    const col = board?.columns.find((c) => c._id === overId);
    overColumnName = col?.name;
  } else {
    // Might be hovering over the SortableContext container ID (column name-based)
    // Check if overId matches a column name we use as SortableContext id
    const col = board?.columns.find((c) => c._id === overId);
    overColumnName = col?.name;
  }

  if (!overColumnName) return;

  // Find the active task's current column in state
  const activeTaskInState = tasks.find((t) => t._id === activeTaskId);
  if (!activeTaskInState) return;

  // If already in the same column, skip (within-column reordering is handled by onDragEnd)
  if (activeTaskInState.status === overColumnName) return;

  // Move task to the new column optimistically (append to end)
  setTasks((prev) => {
    const taskIndex = prev.findIndex((t) => t._id === activeTaskId);
    if (taskIndex === -1) return prev;

    const task = prev[taskIndex];
    if (task.status === overColumnName) return prev;

    // Remove from current column and add to destination column
    const remaining = prev.filter((t) => t._id !== activeTaskId);

    // Reindex source column
    const sourceReindexed = remaining
      .filter((t) => t.status === task.status)
      .sort((a, b) => a.position - b.position)
      .map((t, i) => ({ ...t, position: i }));

    // Count destination column tasks for position
    const destTasks = remaining.filter((t) => t.status === overColumnName);
    const newPosition = destTasks.length;

    const movedTask = { ...task, status: overColumnName!, position: newPosition };

    // Reconstruct: others + reindexed source + dest (unchanged) + moved task
    const otherTasks = remaining.filter(
      (t) => t.status !== task.status && t.status !== overColumnName,
    );

    return [...otherTasks, ...sourceReindexed, ...destTasks, movedTask];
  });
}
```

**Behavior**:
- Only activates for task drags (ignores column drags)
- Detects the destination column by checking what the task is hovering over
- If the task's status has already changed to the target column (previous `onDragOver` call), skips
- Moves the task in local state to the target column, appending it to the end
- This provides visual feedback as the card appears in the new column during drag
- Final position is computed at `onDragEnd`

**Important**: `onDragOver` fires repeatedly, so the logic is idempotent — it only mutates state when the task's column actually changes.

#### 3.8 `onDragEnd` Handler (Refactored)

Replace the existing `handleDragEnd`:

```typescript
function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;

  // Clear active state
  setActiveTask(null);
  setActiveColumnId(null);

  if (!over || !board) return;

  const activeType = active.data.current?.type;

  if (activeType === "column") {
    // Column reorder — existing logic
    if (active.id === over.id) return;

    const oldIndex = board.columns.findIndex((col) => col._id === active.id);
    const newIndex = board.columns.findIndex((col) => col._id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(board.columns, oldIndex, newIndex);
    const newColumnIds = newOrder.map((col) => col._id);
    reorderColumns(newColumnIds);
  } else if (activeType === "task") {
    const activeTaskId = active.id as string;

    // Determine final status and position
    const currentTask = tasks.find((t) => t._id === activeTaskId);
    if (!currentTask) {
      // Task not found in state — restore snapshot
      setTasks(tasksSnapshot.current);
      return;
    }

    const finalStatus = currentTask.status;

    // Compute the final position based on where it was dropped
    let finalPosition: number;

    if (over.data.current?.type === "task" && over.id !== active.id) {
      // Dropped on another task — determine position from the over task
      const overTask = tasks.find((t) => t._id === over.id);
      if (overTask && overTask.status === finalStatus) {
        finalPosition = overTask.position;
      } else {
        // Dropped on a task in a different column (edge case after onDragOver moved it)
        // Use the current position from state
        finalPosition = currentTask.position;
      }
    } else {
      // Dropped on column or same position — use current position
      finalPosition = currentTask.position;
    }

    // Check if anything actually changed from the snapshot
    const snapshotTask = tasksSnapshot.current.find((t) => t._id === activeTaskId);
    if (
      snapshotTask &&
      snapshotTask.status === finalStatus &&
      snapshotTask.position === finalPosition
    ) {
      // No change — restore snapshot (onDragOver may have mutated state)
      setTasks(tasksSnapshot.current);
      return;
    }

    // Restore snapshot first, then let moveTask handle the optimistic update properly
    setTasks(tasksSnapshot.current);
    moveTask(activeTaskId, finalStatus, finalPosition);
  }
}
```

**Behavior**:
- Clears the active drag state first (to remove the DragOverlay)
- For column drags: identical to the existing `handleDragEnd` logic using `arrayMove` and `reorderColumns`
- For task drags:
  1. Reads the current task from local state (which may have been moved across columns by `onDragOver`)
  2. Determines the final status (from the task's current state, set by `onDragOver`)
  3. Computes the final position from the `over` element
  4. Checks if anything changed compared to the snapshot — if not, restores snapshot and returns
  5. Restores the snapshot, then calls `moveTask(taskId, status, position)` from context which handles its own optimistic update and rollback

**Why restore snapshot before calling moveTask**: The `moveTask` context method already implements its own snapshot + optimistic update + API call + rollback pattern. If we leave the `onDragOver` mutations in place and call `moveTask`, we'd have a double-update issue. By restoring the snapshot first, `moveTask` starts from a clean state and handles everything consistently.

#### 3.9 Updated JSX Structure

```tsx
return (
  <DndContext
    sensors={sensors}
    collisionDetection={closestCenter}
    onDragStart={handleDragStart}
    onDragOver={handleDragOver}
    onDragEnd={handleDragEnd}
  >
    <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
      <div className="flex gap-4 overflow-x-auto p-4">
        {board.columns.map((column) => {
          const columnTasks = tasks
            .filter((t) => t.status === column.name)
            .sort((a, b) => a.position - b.position);

          const taskIds = columnTasks.map((t) => t._id);

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
              footer={<AddTaskForm columnName={column.name} />}
            >
              <SortableContext
                items={taskIds}
                strategy={verticalListSortingStrategy}
              >
                {columnTasks.map((task) => (
                  <SortableTaskItem key={task._id} task={task} />
                ))}
              </SortableContext>
            </Column>
          );
        })}

        {/* Add Column UI — unchanged */}
        {/* ... existing add column code ... */}
      </div>
    </SortableContext>

    <DragOverlay>
      {activeTask ? (
        <TaskCard task={activeTask} />
      ) : null}
    </DragOverlay>
  </DndContext>
);
```

**Key changes from current JSX**:
1. `DndContext` now has `onDragStart` and `onDragOver` handlers in addition to `onDragEnd`
2. Each column's children now contain a nested `SortableContext` with `verticalListSortingStrategy` wrapping `SortableTaskItem` components
3. Placeholder `<div>` task elements replaced with `<SortableTaskItem>` components
4. `DragOverlay` added after the `SortableContext` to render a floating `TaskCard` during task drags
5. `AddTaskForm` passed as a `footer` prop to `Column`

#### 3.10 Column Component Modification

**File: `packages/client/src/components/column.tsx`**

Two changes needed:

**Change 1**: Add `data: { type: "column" }` to the `useSortable` call:

```typescript
const {
  attributes,
  listeners,
  setNodeRef,
  setActivatorNodeRef,
  transform,
  transition,
  isDragging,
} = useSortable({ id: column._id, data: { type: "column" } });
```

**Change 2**: Add an optional `footer` prop for the `AddTaskForm`:

```typescript
interface ColumnProps {
  column: ColumnType;
  taskCount: number;
  onRename: (columnId: string, name: string) => Promise<void>;
  onDelete: (columnId: string) => Promise<void>;
  children: ReactNode;
  footer?: ReactNode;
}

export function Column({ column, taskCount, onRename, onDelete, children, footer }: ColumnProps) {
```

And render the footer after the scrollable task area but before the confirm dialog:

```tsx
{/* Task list — scrollable */}
<div className="flex-1 overflow-y-auto px-3 pb-3">
  {children}
</div>

{/* Footer (e.g., AddTaskForm) */}
{footer && (
  <div className="px-3 pb-3">
    {footer}
  </div>
)}

{/* Confirm dialog for delete */}
```

---

## 4. Contracts

### `SortableTaskItem` Props

```typescript
interface SortableTaskItemProps {
  task: Task;  // Full Task object
}
```

Renders a `TaskCard` wrapped in a `useSortable` container. Sets `data: { type: "task", task }` on the sortable.

### Drag Event Data Protocol

All drag handlers rely on `active.data.current` and `over.data.current` having a `type` field:

| Item Type | `data` Shape | Set By |
|-----------|-------------|--------|
| Column | `{ type: "column" }` | `useSortable` in `Column` |
| Task | `{ type: "task", task: Task }` | `useSortable` in `SortableTaskItem` |

### `onDragEnd` Task Move

When a task drag completes:
- **Input**: `activeTaskId: string`, `finalStatus: string`, `finalPosition: number`
- **Action**: Restores snapshot, then calls `moveTask(activeTaskId, finalStatus, finalPosition)` from board context
- **API call**: `PUT /api/tasks/:taskId/move` with `{ status, position }`

### Column `footer` Prop

```typescript
footer?: ReactNode  // Optional content rendered below the task list, above the confirm dialog
```

---

## 5. Test Plan

### File: `packages/client/src/components/__tests__/board-view.test.tsx`

**Existing mock setup changes needed**:

#### 5.1 Update `@dnd-kit/core` Mock

The mock needs to capture `onDragStart`, `onDragOver`, and `onDragEnd`, plus render `DragOverlay`:

```typescript
let capturedOnDragStart: ((event: unknown) => void) | undefined;
let capturedOnDragOver: ((event: unknown) => void) | undefined;
let capturedOnDragEnd: ((event: unknown) => void) | undefined;

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({
    children,
    onDragStart,
    onDragOver,
    onDragEnd,
  }: {
    children: React.ReactNode;
    onDragStart?: (event: unknown) => void;
    onDragOver?: (event: unknown) => void;
    onDragEnd?: (event: unknown) => void;
  }) => {
    capturedOnDragStart = onDragStart;
    capturedOnDragOver = onDragOver;
    capturedOnDragEnd = onDragEnd;
    return <div data-testid="dnd-context">{children}</div>;
  },
  DragOverlay: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="drag-overlay">{children}</div>
  ),
  closestCenter: vi.fn(),
  PointerSensor: vi.fn(),
  KeyboardSensor: vi.fn(),
  useSensor: vi.fn((sensor) => sensor),
  useSensors: vi.fn((...sensors) => sensors),
}));
```

#### 5.2 Update `@dnd-kit/sortable` Mock

Add support for the nested `SortableContext` instances and the `useSortable` mock that `SortableTaskItem` uses:

```typescript
vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sortable-context">{children}</div>
  ),
  horizontalListSortingStrategy: "horizontal",
  verticalListSortingStrategy: "vertical",
  arrayMove: vi.fn((array: unknown[], from: number, to: number) => {
    const result = [...(array as unknown[])];
    const [removed] = result.splice(from, 1);
    result.splice(to, 0, removed);
    return result;
  }),
  useSortable: vi.fn((args: { id: string; data?: unknown }) => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    setActivatorNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  })),
}));
```

#### 5.3 Add TaskCard Mock

```typescript
vi.mock("../task-card", () => ({
  TaskCard: ({ task }: { task: { _id: string; title: string } }) => (
    <div data-testid={`task-card-${task._id}`}>{task.title}</div>
  ),
}));
```

#### 5.4 Add AddTaskForm Mock

```typescript
vi.mock("../add-task-form", () => ({
  AddTaskForm: ({ columnName }: { columnName: string }) => (
    <div data-testid={`add-task-form-${columnName}`}>+ Add task</div>
  ),
}));
```

#### 5.5 Update Column Mock

The Column mock needs to render the `footer` prop:

```typescript
vi.mock("../column", () => ({
  Column: ({
    column,
    taskCount,
    children,
    footer,
  }: {
    column: { _id: string; name: string };
    taskCount: number;
    children: React.ReactNode;
    footer?: React.ReactNode;
  }) => (
    <div data-testid={`column-${column._id}`}>
      <span data-testid={`column-name-${column._id}`}>{column.name}</span>
      <span data-testid={`column-count-${column._id}`}>{taskCount}</span>
      <div data-testid={`column-tasks-${column._id}`}>{children}</div>
      {footer && <div data-testid={`column-footer-${column._id}`}>{footer}</div>}
    </div>
  ),
}));
```

#### 5.6 Update `defaultBoardState`

Add `moveTask`, `setTasks`, and `createTask` to the mock state:

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
    createTask: vi.fn().mockResolvedValue(undefined),
    moveTask: vi.fn().mockResolvedValue(undefined),
    setTasks: vi.fn(),
  };
}
```

#### 5.7 Test Specifications

**Existing tests that remain unchanged** (they should still pass with the updated mocks):
- "shows LoadingSpinner when loading"
- "shows ErrorMessage when error exists"
- "renders nothing when board is null and not loading"
- "renders all columns with correct names"
- "passes correct task count to each column"
- "shows Add Column button when not adding"
- "clicking Add Column button shows inline form"
- "Enter submits new column name and calls addColumn"
- "clicking Add button submits new column name"
- "Escape cancels add column form"
- "Cancel button closes add column form"
- "empty input does not call addColumn"
- "add column form closes on successful submission"
- "add column form stays open on failure"
- "handleDragEnd calls reorderColumns with new column order" (needs update for type discrimination)
- "handleDragEnd does not call reorderColumns when dropped on same position"
- "handleDragEnd does not call reorderColumns when over is null"

**Tests that need modification**:

**Modified Test 1: `groups tasks by status and sorts by position`**
- Update: Now checks that TaskCard components render in order (via `task-card-task2` before `task-card-task1` in the "To Do" column), not plain text divs
- Assert: The column tasks container for col1 has task-card elements in position order

**Modified Test 2: `renders task stubs with title text`** → rename to `renders TaskCard components with task titles`
- Assert: `screen.getByTestId("task-card-task1")` contains "Write tests"
- Assert: `screen.getByTestId("task-card-task2")` contains "Setup project"
- Assert: `screen.getByTestId("task-card-task3")` contains "Deploy app"

**Modified Tests 3–5: Column drag-end tests**
- Must now include `data: { current: { type: "column" } }` on the `active` object in the simulated event, since `handleDragEnd` checks `active.data.current.type`

**New Test 1: `renders TaskCard components inside columns`**
- Setup: render with default board state
- Assert: `screen.getByTestId("task-card-task1")` is in the document
- Assert: `screen.getByTestId("task-card-task2")` is in the document
- Assert: `screen.getByTestId("task-card-task3")` is in the document

**New Test 2: `renders AddTaskForm in each column footer`**
- Setup: render with default board state
- Assert: `screen.getByTestId("add-task-form-To Do")` is in the document
- Assert: `screen.getByTestId("add-task-form-In Progress")` is in the document
- Assert: `screen.getByTestId("add-task-form-Done")` is in the document

**New Test 3: `renders DragOverlay container`**
- Setup: render with default board state
- Assert: `screen.getByTestId("drag-overlay")` is in the document

**New Test 4: `handleDragEnd calls moveTask for task drag`**
- Setup: render with default board state; mockTasks includes task1 in "To Do" at position 0
- Act: Call `capturedOnDragEnd` with:
  ```typescript
  {
    active: { id: "task1", data: { current: { type: "task", task: mockTasks[0] } } },
    over: { id: "task3", data: { current: { type: "task", task: mockTasks[2] } } },
  }
  ```
- But first call `capturedOnDragStart` with active task1 to set up the snapshot
- Then call `capturedOnDragOver` to move task1 to "In Progress" column
- Then call `capturedOnDragEnd`
- Assert: `state.moveTask` was called with appropriate arguments

**New Test 5: `handleDragEnd does not call moveTask when task has not moved`**
- Setup: render with default board state
- Act: Call `capturedOnDragStart` then `capturedOnDragEnd` with same active/over (task dropped on itself)
- Assert: `state.moveTask` was not called

**New Test 6: `handleDragEnd dispatches to column reorder for column type drag`**
- Setup: render with default board state
- Act: Call `capturedOnDragEnd` with `active.data.current.type = "column"`
- Assert: `state.reorderColumns` was called (not `moveTask`)

**New Test 7: `handleDragEnd ignores event when over is null`**
- Setup: render with default board state
- Act: Call `capturedOnDragEnd` with `over: null`
- Assert: neither `reorderColumns` nor `moveTask` called

**New Test 8: `task SortableContext uses verticalListSortingStrategy`**
- This is implicitly tested by the sortable-context rendering. Can verify that multiple `sortable-context` test IDs exist (one for columns, plus one per column for tasks).

---

## 6. Implementation Order

### Step 1: Modify `packages/client/src/components/column.tsx`

1. Add `footer?: ReactNode` to the `ColumnProps` interface
2. Include `footer` in the destructured props
3. Add `data: { type: "column" }` to the `useSortable` call
4. Render `{footer && <div className="px-3 pb-3">{footer}</div>}` after the task list div and before the `ConfirmDialog`

### Step 2: Modify `packages/client/src/components/board-view.tsx`

1. Add new imports: `DragOverlay` from `@dnd-kit/core`, `verticalListSortingStrategy` and `useSortable` from `@dnd-kit/sortable`, `CSS` from `@dnd-kit/utilities`, `TaskCard` from `./task-card`, `AddTaskForm` from `./add-task-form`, `Task` type from `@taskboard/shared`
2. Update the `DragEndEvent` type import to also include `DragStartEvent` and `DragOverEvent`
3. Add `moveTask` and `setTasks` to the `useBoard()` destructuring
4. Add state: `activeTask`, `activeColumnId`, `tasksSnapshot` ref
5. Define the `SortableTaskItem` component (module-local)
6. Implement `handleDragStart`
7. Implement `handleDragOver`
8. Refactor `handleDragEnd` to discriminate between column and task drags
9. Update the JSX:
   - Add `onDragStart` and `onDragOver` to `DndContext`
   - Wrap task list in per-column `SortableContext` with `verticalListSortingStrategy`
   - Replace placeholder `<div>` task elements with `<SortableTaskItem>`
   - Pass `footer={<AddTaskForm columnName={column.name} />}` to each `Column`
   - Add `<DragOverlay>` after the `</SortableContext>` closure

### Step 3: Modify `packages/client/src/components/__tests__/board-view.test.tsx`

1. Update `@dnd-kit/core` mock to capture `onDragStart` and `onDragOver`, and include `DragOverlay`
2. Update `@dnd-kit/sortable` mock to include `verticalListSortingStrategy` and `useSortable`
3. Add `TaskCard` and `AddTaskForm` mocks
4. Update `Column` mock to render `footer` prop
5. Update `defaultBoardState` to include `createTask`, `moveTask`, `setTasks`
6. Update existing drag-end tests to include `data: { current: { type: "column" } }` on active objects
7. Update task rendering tests to use `task-card-*` testids instead of plain text matching
8. Add new tests: TaskCard rendering, AddTaskForm rendering, DragOverlay, task drag-end, type discrimination

### Step 4: Verify

Run TypeScript compilation and tests to confirm everything works.

---

## 7. Verification Commands

```bash
# 1. TypeScript compilation — must succeed with no errors
npx tsc --noEmit -p packages/client/tsconfig.json

# 2. Run board-view tests specifically
npx vitest run packages/client/src/components/__tests__/board-view.test.tsx

# 3. Run column tests to verify no regressions from footer prop addition
npx vitest run packages/client/src/components/__tests__/column.test.tsx

# 4. Run full client test suite to verify no regressions
npm run test -w packages/client

# 5. Verify key imports/exports (quick grep)
grep -n "DragOverlay\|onDragStart\|onDragOver\|SortableTaskItem\|AddTaskForm\|TaskCard" packages/client/src/components/board-view.tsx

# 6. Verify column.tsx data type annotation
grep -n "type.*column" packages/client/src/components/column.tsx
```

---

## Complete Modified File: `packages/client/src/components/column.tsx`

```typescript
import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Column as ColumnType, Task } from "@taskboard/shared";
import { ConfirmDialog } from "./ui/confirm-dialog";
import { ErrorMessage } from "./ui/error-message";

interface ColumnProps {
  column: ColumnType;
  taskCount: number;
  onRename: (columnId: string, name: string) => Promise<void>;
  onDelete: (columnId: string) => Promise<void>;
  children: ReactNode;
  footer?: ReactNode;
}

export function Column({ column, taskCount, onRename, onDelete, children, footer }: ColumnProps) {
  // --- dnd-kit sortable ---
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column._id, data: { type: "column" } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // --- inline rename state ---
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- delete state ---
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Focus the input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // --- handlers ---
  function handleDoubleClick() {
    setEditName(column.name);
    setIsEditing(true);
  }

  async function handleRenameSubmit() {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === column.name) {
      setIsEditing(false);
      return;
    }
    try {
      await onRename(column._id, trimmed);
    } catch {
      // Rename failed — revert to original
      setEditName(column.name);
    }
    setIsEditing(false);
  }

  function handleRenameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === "Escape") {
      setEditName(column.name);
      setIsEditing(false);
    }
  }

  async function handleDelete() {
    setShowConfirm(false);
    setDeleteError(null);
    try {
      await onDelete(column._id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete column";
      setDeleteError(message);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex w-72 flex-shrink-0 flex-col rounded-lg bg-gray-100 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Drag handle */}
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-gray-400 hover:text-gray-600"
          aria-label="Drag to reorder column"
        >
          {/* Grip icon SVG — 6-dot grip pattern */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Column name: editable or static */}
        {isEditing ? (
          <input
            ref={inputRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={handleRenameKeyDown}
            onBlur={handleRenameSubmit}
            className="min-w-0 flex-1 rounded border border-blue-300 px-1 py-0.5 text-sm font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Column name"
          />
        ) : (
          <h3
            onDoubleClick={handleDoubleClick}
            className="flex-1 cursor-pointer truncate text-sm font-semibold text-gray-900"
            title="Double-click to rename"
          >
            {column.name}
          </h3>
        )}

        {/* Task count badge */}
        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
          {taskCount}
        </span>

        {/* Delete button */}
        <button
          onClick={() => setShowConfirm(true)}
          className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-600"
          aria-label="Delete column"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 01.78.72l.5 6a.75.75 0 01-1.5.12l-.5-6a.75.75 0 01.72-.78zm2.06.72a.75.75 0 011.5-.12l.5 6a.75.75 0 11-1.5.12l-.5-6z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Delete error */}
      {deleteError && (
        <div className="px-3 pb-2">
          <ErrorMessage message={deleteError} onDismiss={() => setDeleteError(null)} />
        </div>
      )}

      {/* Task list — scrollable */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {children}
      </div>

      {/* Footer (e.g., AddTaskForm) */}
      {footer && (
        <div className="px-3 pb-3">
          {footer}
        </div>
      )}

      {/* Confirm dialog for delete */}
      <ConfirmDialog
        isOpen={showConfirm}
        message={`Are you sure you want to delete the "${column.name}" column?`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
```

---

## Complete Modified File: `packages/client/src/components/board-view.tsx`

```typescript
import { useState, useRef, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragStartEvent, DragOverEvent, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@taskboard/shared";
import { useBoard } from "../context/board-context";
import { Column } from "./column";
import { TaskCard } from "./task-card";
import { AddTaskForm } from "./add-task-form";
import { LoadingSpinner } from "./ui/loading-spinner";
import { ErrorMessage } from "./ui/error-message";

function SortableTaskItem({ task }: { task: Task }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task._id,
    data: { type: "task", task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} />
    </div>
  );
}

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
    moveTask,
    setTasks,
  } = useBoard();

  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const addColumnInputRef = useRef<HTMLInputElement>(null);

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const tasksSnapshot = useRef<Task[]>([]);

  useEffect(() => {
    if (isAddingColumn && addColumnInputRef.current) {
      addColumnInputRef.current.focus();
    }
  }, [isAddingColumn]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor),
  );

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const type = active.data.current?.type;

    if (type === "task") {
      setActiveTask(active.data.current?.task as Task);
      setActiveColumnId(null);
      tasksSnapshot.current = tasks;
    } else if (type === "column") {
      setActiveColumnId(active.id as string);
      setActiveTask(null);
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || !board) return;

    const activeType = active.data.current?.type;
    if (activeType !== "task") return;

    const activeTaskId = active.id as string;
    const overId = over.id as string;

    // Determine the destination column
    const overType = over.data.current?.type;
    let overColumnName: string | undefined;

    if (overType === "task") {
      const overTask = over.data.current?.task as Task | undefined;
      overColumnName = overTask?.status;
    } else {
      const col = board.columns.find((c) => c._id === overId);
      overColumnName = col?.name;
    }

    if (!overColumnName) return;

    // Find the active task's current column in state
    const activeTaskInState = tasks.find((t) => t._id === activeTaskId);
    if (!activeTaskInState) return;

    // If already in the same column, skip
    if (activeTaskInState.status === overColumnName) return;

    // Move task to the new column optimistically
    setTasks((prev) => {
      const taskIndex = prev.findIndex((t) => t._id === activeTaskId);
      if (taskIndex === -1) return prev;

      const task = prev[taskIndex];
      if (task.status === overColumnName) return prev;

      const remaining = prev.filter((t) => t._id !== activeTaskId);

      // Reindex source column
      const sourceReindexed = remaining
        .filter((t) => t.status === task.status)
        .sort((a, b) => a.position - b.position)
        .map((t, i) => ({ ...t, position: i }));

      // Count destination column tasks for position
      const destTasks = remaining.filter((t) => t.status === overColumnName);
      const newPosition = destTasks.length;

      const movedTask = { ...task, status: overColumnName!, position: newPosition };

      const otherTasks = remaining.filter(
        (t) => t.status !== task.status && t.status !== overColumnName,
      );

      return [...otherTasks, ...sourceReindexed, ...destTasks, movedTask];
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    // Clear active state
    setActiveTask(null);
    setActiveColumnId(null);

    if (!over || !board) return;

    const activeType = active.data.current?.type;

    if (activeType === "column") {
      if (active.id === over.id) return;

      const oldIndex = board.columns.findIndex((col) => col._id === active.id);
      const newIndex = board.columns.findIndex((col) => col._id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const newOrder = arrayMove(board.columns, oldIndex, newIndex);
      const newColumnIds = newOrder.map((col) => col._id);
      reorderColumns(newColumnIds);
    } else if (activeType === "task") {
      const activeTaskId = active.id as string;

      // Determine final status and position from current tasks state
      const currentTask = tasks.find((t) => t._id === activeTaskId);
      if (!currentTask) {
        setTasks(tasksSnapshot.current);
        return;
      }

      const finalStatus = currentTask.status;

      // Compute final position
      let finalPosition: number;

      if (over.data.current?.type === "task" && over.id !== active.id) {
        const overTask = tasks.find((t) => t._id === over.id);
        if (overTask && overTask.status === finalStatus) {
          finalPosition = overTask.position;
        } else {
          finalPosition = currentTask.position;
        }
      } else {
        finalPosition = currentTask.position;
      }

      // Check if anything actually changed
      const snapshotTask = tasksSnapshot.current.find((t) => t._id === activeTaskId);
      if (
        snapshotTask &&
        snapshotTask.status === finalStatus &&
        snapshotTask.position === finalPosition
      ) {
        setTasks(tasksSnapshot.current);
        return;
      }

      // Restore snapshot and let moveTask handle the optimistic update
      setTasks(tasksSnapshot.current);
      moveTask(activeTaskId, finalStatus, finalPosition);
    }
  }

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

  function handleAddColumnKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddColumn();
    } else if (e.key === "Escape") {
      setNewColumnName("");
      setIsAddingColumn(false);
    }
  }

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

  const columnIds = board.columns.map((col) => col._id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
        <div className="flex gap-4 overflow-x-auto p-4">
          {board.columns.map((column) => {
            const columnTasks = tasks
              .filter((t) => t.status === column.name)
              .sort((a, b) => a.position - b.position);

            const taskIds = columnTasks.map((t) => t._id);

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
                footer={<AddTaskForm columnName={column.name} />}
              >
                <SortableContext
                  items={taskIds}
                  strategy={verticalListSortingStrategy}
                >
                  {columnTasks.map((task) => (
                    <SortableTaskItem key={task._id} task={task} />
                  ))}
                </SortableContext>
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

      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
```

---

## Complete Modified File: `packages/client/src/components/__tests__/board-view.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BoardView } from "../board-view";

const mockUseBoard = vi.fn();

vi.mock("../../context/board-context", () => ({
  useBoard: (...args: unknown[]) => mockUseBoard(...args),
}));

let capturedOnDragStart: ((event: unknown) => void) | undefined;
let capturedOnDragOver: ((event: unknown) => void) | undefined;
let capturedOnDragEnd: ((event: unknown) => void) | undefined;

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({
    children,
    onDragStart,
    onDragOver,
    onDragEnd,
  }: {
    children: React.ReactNode;
    onDragStart?: (event: unknown) => void;
    onDragOver?: (event: unknown) => void;
    onDragEnd?: (event: unknown) => void;
  }) => {
    capturedOnDragStart = onDragStart;
    capturedOnDragOver = onDragOver;
    capturedOnDragEnd = onDragEnd;
    return <div data-testid="dnd-context">{children}</div>;
  },
  DragOverlay: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="drag-overlay">{children}</div>
  ),
  closestCenter: vi.fn(),
  PointerSensor: vi.fn(),
  KeyboardSensor: vi.fn(),
  useSensor: vi.fn((sensor) => sensor),
  useSensors: vi.fn((...sensors) => sensors),
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sortable-context">{children}</div>
  ),
  horizontalListSortingStrategy: "horizontal",
  verticalListSortingStrategy: "vertical",
  arrayMove: vi.fn((array: unknown[], from: number, to: number) => {
    const result = [...(array as unknown[])];
    const [removed] = result.splice(from, 1);
    result.splice(to, 0, removed);
    return result;
  }),
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    setActivatorNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  })),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: () => undefined,
    },
  },
}));

vi.mock("../column", () => ({
  Column: ({
    column,
    taskCount,
    children,
    footer,
  }: {
    column: { _id: string; name: string };
    taskCount: number;
    children: React.ReactNode;
    footer?: React.ReactNode;
  }) => (
    <div data-testid={`column-${column._id}`}>
      <span data-testid={`column-name-${column._id}`}>{column.name}</span>
      <span data-testid={`column-count-${column._id}`}>{taskCount}</span>
      <div data-testid={`column-tasks-${column._id}`}>{children}</div>
      {footer && <div data-testid={`column-footer-${column._id}`}>{footer}</div>}
    </div>
  ),
}));

vi.mock("../task-card", () => ({
  TaskCard: ({ task }: { task: { _id: string; title: string } }) => (
    <div data-testid={`task-card-${task._id}`}>{task.title}</div>
  ),
}));

vi.mock("../add-task-form", () => ({
  AddTaskForm: ({ columnName }: { columnName: string }) => (
    <div data-testid={`add-task-form-${columnName}`}>+ Add task</div>
  ),
}));

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
    createTask: vi.fn().mockResolvedValue(undefined),
    moveTask: vi.fn().mockResolvedValue(undefined),
    setTasks: vi.fn(),
  };
}

function renderBoardView(overrides?: any) {
  const state = { ...defaultBoardState(), ...overrides };
  mockUseBoard.mockReturnValue(state);
  render(<BoardView />);
  return state;
}

describe("BoardView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows LoadingSpinner when loading", () => {
    renderBoardView({ isLoading: true, board: null, tasks: [] });
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByLabelText("Loading")).toBeInTheDocument();
  });

  it("shows ErrorMessage when error exists", () => {
    renderBoardView({ error: "Failed to load board", board: null, tasks: [] });
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Failed to load board")).toBeInTheDocument();
  });

  it("renders nothing when board is null and not loading", () => {
    mockUseBoard.mockReturnValue({ ...defaultBoardState(), board: null, tasks: [] });
    const { container } = render(<BoardView />);
    expect(container.firstChild).toBeNull();
  });

  it("renders all columns with correct names", () => {
    renderBoardView();
    expect(screen.getByTestId("column-name-col1")).toHaveTextContent("To Do");
    expect(screen.getByTestId("column-name-col2")).toHaveTextContent("In Progress");
    expect(screen.getByTestId("column-name-col3")).toHaveTextContent("Done");
  });

  it("passes correct task count to each column", () => {
    renderBoardView();
    expect(screen.getByTestId("column-count-col1")).toHaveTextContent("2");
    expect(screen.getByTestId("column-count-col2")).toHaveTextContent("1");
    expect(screen.getByTestId("column-count-col3")).toHaveTextContent("0");
  });

  it("renders TaskCard components with task titles", () => {
    renderBoardView();
    expect(screen.getByTestId("task-card-task1")).toHaveTextContent("Write tests");
    expect(screen.getByTestId("task-card-task2")).toHaveTextContent("Setup project");
    expect(screen.getByTestId("task-card-task3")).toHaveTextContent("Deploy app");
  });

  it("groups tasks by status and sorts by position within columns", () => {
    renderBoardView();
    const todoTasks = screen.getByTestId("column-tasks-col1");
    const taskCards = todoTasks.querySelectorAll("[data-testid^='task-card-']");
    // "Setup project" (position 0) should come before "Write tests" (position 1)
    expect(taskCards[0]).toHaveAttribute("data-testid", "task-card-task2");
    expect(taskCards[1]).toHaveAttribute("data-testid", "task-card-task1");
  });

  it("renders DndContext and SortableContext", () => {
    renderBoardView();
    expect(screen.getByTestId("dnd-context")).toBeInTheDocument();
    // Multiple sortable contexts: 1 for columns + 1 per column for tasks
    const sortableContexts = screen.getAllByTestId("sortable-context");
    expect(sortableContexts.length).toBeGreaterThanOrEqual(1);
  });

  it("renders DragOverlay", () => {
    renderBoardView();
    expect(screen.getByTestId("drag-overlay")).toBeInTheDocument();
  });

  it("renders AddTaskForm in each column footer", () => {
    renderBoardView();
    expect(screen.getByTestId("add-task-form-To Do")).toBeInTheDocument();
    expect(screen.getByTestId("add-task-form-In Progress")).toBeInTheDocument();
    expect(screen.getByTestId("add-task-form-Done")).toBeInTheDocument();
  });

  it("shows Add Column button when not adding", () => {
    renderBoardView();
    expect(screen.getByText("+ Add Column")).toBeInTheDocument();
  });

  it("clicking Add Column button shows inline form", () => {
    renderBoardView();
    fireEvent.click(screen.getByText("+ Add Column"));
    expect(screen.getByLabelText("New column name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

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

  it("Escape cancels add column form", () => {
    renderBoardView();
    fireEvent.click(screen.getByText("+ Add Column"));
    expect(screen.getByLabelText("New column name")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByLabelText("New column name"), { key: "Escape" });
    expect(screen.queryByLabelText("New column name")).not.toBeInTheDocument();
    expect(screen.getByText("+ Add Column")).toBeInTheDocument();
  });

  it("Cancel button closes add column form", () => {
    renderBoardView();
    fireEvent.click(screen.getByText("+ Add Column"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByLabelText("New column name")).not.toBeInTheDocument();
    expect(screen.getByText("+ Add Column")).toBeInTheDocument();
  });

  it("empty input does not call addColumn", async () => {
    const state = renderBoardView();
    fireEvent.click(screen.getByText("+ Add Column"));
    const input = screen.getByLabelText("New column name");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(state.addColumn).not.toHaveBeenCalled();
  });

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

  it("handleDragEnd calls reorderColumns for column drag with new column order", () => {
    const state = renderBoardView();
    capturedOnDragEnd!({
      active: { id: "col1", data: { current: { type: "column" } } },
      over: { id: "col3", data: { current: { type: "column" } } },
    });
    expect(state.reorderColumns).toHaveBeenCalledWith(["col2", "col3", "col1"]);
  });

  it("handleDragEnd does not call reorderColumns when column dropped on same position", () => {
    const state = renderBoardView();
    capturedOnDragEnd!({
      active: { id: "col1", data: { current: { type: "column" } } },
      over: { id: "col1", data: { current: { type: "column" } } },
    });
    expect(state.reorderColumns).not.toHaveBeenCalled();
  });

  it("handleDragEnd does not call reorderColumns when over is null", () => {
    const state = renderBoardView();
    capturedOnDragEnd!({
      active: { id: "col1", data: { current: { type: "column" } } },
      over: null,
    });
    expect(state.reorderColumns).not.toHaveBeenCalled();
  });

  it("handleDragEnd calls moveTask for task drag to different column", () => {
    const state = renderBoardView();

    // Simulate drag start to set snapshot
    capturedOnDragStart!({
      active: {
        id: "task3",
        data: { current: { type: "task", task: mockTasks[2] } },
      },
    });

    // Simulate drag end — task dropped on a task in a different column
    // (onDragOver would have changed the task's status in real scenario,
    // but with mocked setTasks the tasks array doesn't actually change)
    capturedOnDragEnd!({
      active: {
        id: "task3",
        data: { current: { type: "task", task: mockTasks[2] } },
      },
      over: {
        id: "task2",
        data: { current: { type: "task", task: mockTasks[1] } },
      },
    });

    // moveTask should be called since the task's snapshot status differs from over task status
    // (the exact behavior depends on whether onDragOver changed tasks in state,
    // but with mocked setTasks, the tasks array stays the same, so moveTask gets called
    // when the task and over-task are in different columns)
    expect(state.moveTask).toHaveBeenCalled();
  });

  it("handleDragEnd does not call moveTask when task has not moved", () => {
    const state = renderBoardView();

    // Simulate drag start
    capturedOnDragStart!({
      active: {
        id: "task2",
        data: { current: { type: "task", task: mockTasks[1] } },
      },
    });

    // Simulate drag end — dropped on itself
    capturedOnDragEnd!({
      active: {
        id: "task2",
        data: { current: { type: "task", task: mockTasks[1] } },
      },
      over: {
        id: "task2",
        data: { current: { type: "task", task: mockTasks[1] } },
      },
    });

    expect(state.moveTask).not.toHaveBeenCalled();
  });

  it("handleDragEnd dispatches to column reorder not moveTask for column type", () => {
    const state = renderBoardView();
    capturedOnDragEnd!({
      active: { id: "col1", data: { current: { type: "column" } } },
      over: { id: "col2", data: { current: { type: "column" } } },
    });
    expect(state.reorderColumns).toHaveBeenCalled();
    expect(state.moveTask).not.toHaveBeenCalled();
  });
});
```