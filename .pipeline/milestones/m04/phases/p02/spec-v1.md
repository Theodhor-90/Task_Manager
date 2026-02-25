Now I have all the context needed to write the detailed phase specification. Let me produce it.

# Phase 2 — Task Cards & Drag-and-Drop

## Goal

Deliver interactive task cards and full drag-and-drop support so that users can see key task information at a glance (title, priority, labels, due date), move tasks between columns to change their status, reorder tasks within a column, and quickly create new tasks inline — all with optimistic UI updates that roll back gracefully on API failure.

---

## Design Decisions

### 1. Separate Drag Contexts for Columns vs. Tasks

Phase 1 established a single `DndContext` in `BoardView` for column reordering. Phase 2 must add task dragging (within and across columns) without conflicting with column drag. The approach is to **nest a second `DndContext` inside each `Column`** for task sorting, while keeping the outer `DndContext` exclusively for column reorder. This avoids collision-detection ambiguity because each `DndContext` only handles one item type. The column drag uses `setActivatorNodeRef` on the grip handle (already implemented), so task drags inside the column body will not accidentally trigger column moves.

**Alternative considered**: A single `DndContext` with type discrimination (custom collision detection or `data` property on draggables). This is more complex, harder to debug, and unnecessary since @dnd-kit supports nested contexts cleanly.

**Update**: After closer inspection, nested `DndContext` does not natively support cross-container transfers between sibling contexts. Instead, the approach will be: **replace the outer column-only `DndContext` with a unified `DndContext`** that handles both column reorder and task drag-and-drop. Columns will continue using their dedicated drag handle (`setActivatorNodeRef`), while tasks will be directly draggable items. An `onDragStart` handler will track whether a column or task is being dragged (via a `data` property on each draggable). `onDragEnd` will dispatch to column-reorder logic or task-move logic based on the drag type.

### 2. Task Drag Item Identification

Each task draggable will set `data: { type: "task", task }` on its `useSortable` config. Each column sortable already exists but will be augmented with `data: { type: "column" }`. The `onDragEnd` handler inspects `active.data.current.type` to determine which logic path to invoke.

### 3. Cross-Column Task Transfer with @dnd-kit/sortable

Use `SortableContext` per column (with `verticalListSortingStrategy`) to enable within-column reorder. For cross-column transfer, use the `onDragOver` event to detect when a task hovers over a different column's droppable area and temporarily move the task in local state so the drop animation is smooth. On `onDragEnd`, commit the final position to the API.

### 4. Optimistic Updates with Snapshot Rollback

Before each drag operation begins (`onDragStart`), snapshot the entire `tasks` array in the board context. On `onDragEnd`, apply the new positions and status optimistically, then fire the `PUT /api/tasks/:id/move` request. If the API call fails, restore the snapshot and set an error message. This follows the same pattern already used by `reorderColumns`.

### 5. Position Calculation

When a task is dropped at a new index within a column (same or different), the `position` value sent to the API is the target index in the destination column's sorted task list. The server clamps and reindexes automatically.

### 6. API Client Layer

New functions will be added to a dedicated `packages/client/src/api/tasks.ts` file (not in `boards.ts`) to maintain single-responsibility per resource:
- `createTask(boardId, input)` — POST `/api/boards/:boardId/tasks`
- `updateTask(taskId, input)` — PUT `/api/tasks/:taskId`
- `deleteTask(taskId)` — DELETE `/api/tasks/:taskId`
- `moveTask(taskId, body)` — PUT `/api/tasks/:taskId/move`

### 7. Board Context Extensions

The `BoardContextValue` interface will be extended with:
- `createTask(columnName: string, title: string): Promise<Task>` — creates a task and appends it to local state
- `moveTask(taskId: string, status: string, position: number): Promise<void>` — optimistic move with rollback
- `setTasks(updater)` — internal state setter exposed for drag handlers to do optimistic reordering during `onDragOver`

### 8. Priority Badge Color Mapping

Color-coded badges will use a simple lookup:
- `low` → gray (`bg-gray-200 text-gray-700`)
- `medium` → blue (`bg-blue-100 text-blue-700`)
- `high` → orange (`bg-orange-100 text-orange-700`)
- `urgent` → red (`bg-red-100 text-red-700`)

This will be defined as a constant map in the `TaskCard` component file (or a small shared utility) — no separate constants file needed for a single mapping.

### 9. TaskCard Component

A compact, presentation-focused component. Receives a `Task` object and an `onClick` handler (for Phase 3's detail panel — wired as a no-op or stub now). Renders title, priority badge, label color dots (labels are IDs in this phase; dots are rendered only if labels array is non-empty, using a placeholder color since label data isn't fetched until Phase 4), and a formatted due date if present.

### 10. AddTaskForm Component

An inline form at the bottom of each column. Shows a `+ Add task` button; clicking it reveals a text input. Enter creates the task, Escape cancels. After creation, the input clears and stays open for rapid entry. The form calls `createTask` from the board context.

---

## Tasks

### Task 1: API Client Functions for Tasks

**Deliverables**:
- New file `packages/client/src/api/tasks.ts` with four exported functions:
  - `createTask(boardId: string, input: { title: string; status?: string; priority?: Priority; description?: string; dueDate?: string; labels?: string[] }): Promise<ApiSuccessResponse<Task>>`
  - `updateTask(taskId: string, input: { title?: string; description?: string; priority?: Priority; dueDate?: string | null; labels?: string[] }): Promise<ApiSuccessResponse<Task>>`
  - `deleteTask(taskId: string): Promise<ApiSuccessResponse<{ message: string }>>`
  - `moveTask(taskId: string, body: { status?: string; position: number }): Promise<ApiSuccessResponse<Task>>`
- Each function uses the existing `apiClient` from `api/client.ts`
- Type imports from `@taskboard/shared`

### Task 2: Extend Board Context with Task Mutations

**Deliverables**:
- Add `createTask(columnName: string, title: string): Promise<Task>` to `BoardContextValue`:
  - Calls `api/tasks.createTask` with `boardId`, `{ title, status: columnName }`
  - On success, appends the returned task to the `tasks` state array
  - Returns the created task
- Add `moveTask(taskId: string, status: string, position: number): Promise<void>` to `BoardContextValue`:
  - Snapshots current `tasks` array
  - Optimistically updates the task's `status` and `position` in state and reindexes affected columns
  - Calls `api/tasks.moveTask`
  - On failure, restores the snapshot and sets `error`
- Expose a `setTasks` dispatcher so `BoardView` can perform intermediate optimistic reordering during `onDragOver`
- Unit tests for the new context methods (mock API calls, verify optimistic update and rollback)

### Task 3: TaskCard Component

**Deliverables**:
- New file `packages/client/src/components/task-card.tsx`
- Props: `{ task: Task; onClick?: (taskId: string) => void }`
- Renders:
  - Task title (truncated if long)
  - Priority badge: small colored pill with priority text using the color map from Design Decision 8
  - Label color dots: small colored circles if `task.labels.length > 0` (placeholder dots — full label colors come in Phase 4)
  - Due date: formatted as "MMM D" (e.g., "Feb 25") if present; styled red if overdue
- Clicking the card calls `onClick` (used by Phase 3; safe to be undefined now)
- Styling: white background, rounded, shadow-sm, padding — consistent with the current placeholder task divs
- Unit tests: renders title, priority badge, due date, label dots, handles click

### Task 4: Integrate Task Drag-and-Drop into BoardView

**Deliverables**:
- Refactor `BoardView` to support both column reorder and task drag-and-drop in a unified `DndContext`:
  - Add `data: { type: "column" }` to column sortable items
  - Add a `SortableContext` per column (vertical list strategy) wrapping task cards
  - Each task card wrapped in a sortable wrapper with `data: { type: "task", task }`
  - `onDragStart`: snapshot `tasks` state; track active drag type
  - `onDragOver`: if dragging a task over a different column, optimistically move the task in local state to provide smooth animation
  - `onDragEnd`: if column drag → existing column reorder logic; if task drag → call `moveTask` from context with computed status and position
- Replace the current placeholder task `<div>` elements with `TaskCard` components wrapped in sortable containers
- Render `AddTaskForm` at the bottom of each column (below the sortable task list)
- Visual drag overlay for the active task (using `DragOverlay` from @dnd-kit to show a floating card while dragging)
- Unit tests: verify drag-end dispatches to correct handler, verify task cards render, verify add-task form renders

### Task 5: AddTaskForm Component

**Deliverables**:
- New file `packages/client/src/components/add-task-form.tsx`
- Props: `{ columnName: string }` (determines the `status` for the created task)
- UI flow:
  - Initially shows a `+ Add task` button
  - Clicking reveals an input field (auto-focused)
  - Enter: calls `createTask(columnName, title)` from board context, clears input, keeps form open
  - Escape: hides input, returns to button state
  - Empty submit: ignored
- Error handling: if creation fails, show a brief inline error; keep the input text so the user can retry
- Unit tests: renders button, toggles to input, submits on Enter, cancels on Escape

### Task 6: Integration Testing & Polish

**Deliverables**:
- Verify that the full drag-and-drop flow works end-to-end with mocked API calls:
  - Drag task within same column → position updated
  - Drag task to different column → status and position updated
  - API failure → board state reverts to snapshot
- Verify `AddTaskForm` creates tasks that appear in the correct column
- Verify column drag-and-drop still works correctly after the refactor
- Ensure no regressions in existing board-view and column tests
- Run full client test suite and fix any failures
- Visual polish: ensure drag overlay looks good, smooth transitions, no layout shift during drag

---

## Exit Criteria

1. `packages/client/src/api/tasks.ts` exports `createTask`, `updateTask`, `deleteTask`, and `moveTask` functions that call the correct API endpoints with proper request shapes
2. `BoardContextValue` exposes `createTask` and `moveTask` methods; `createTask` appends the new task to state; `moveTask` applies optimistic updates and rolls back on API failure
3. `TaskCard` component renders task title, color-coded priority badge, label indicator dots, and formatted due date
4. Tasks can be dragged between columns (changing `status`) and reordered within a column (changing `position`) using @dnd-kit; the API is called on drop with the correct `status` and `position`
5. Optimistic UI updates apply immediately on drag-drop; on API failure, the board reverts to its pre-drag state and an error message is displayed
6. A drag overlay shows a floating task card while dragging
7. Column drag-and-drop (from Phase 1) continues to work correctly alongside task drag-and-drop
8. `AddTaskForm` at the bottom of each column creates a task in that column via the API; the task appears in the column immediately after creation
9. All new and existing client tests pass (`npm run test -w packages/client`)
10. No regressions in login, dashboard, project CRUD, or board/column management

---

## Dependencies

1. **Phase 1 (Board & Columns)** — must be complete. Specifically:
   - `BoardView` component with `DndContext` and column `SortableContext`
   - `Column` component with `useSortable` and drag handle pattern
   - `BoardContext` with `board`, `tasks`, `loadBoard`, and column management methods
   - API client functions in `api/boards.ts` for board and column operations
2. **Milestone 2 (Core API)** — task endpoints must be implemented and passing:
   - `POST /api/boards/:boardId/tasks`
   - `PUT /api/tasks/:id`
   - `DELETE /api/tasks/:id`
   - `PUT /api/tasks/:id/move`
3. **@dnd-kit packages** — `@dnd-kit/core@^6.3.1`, `@dnd-kit/sortable@^10.0.0`, and `@dnd-kit/utilities` must be installed in the client package (already present from Phase 1)
4. **Shared types** — `Task`, `Priority`, `ApiSuccessResponse` from `@taskboard/shared`

---

## Artifacts

| Artifact | Action | Description |
|----------|--------|-------------|
| `packages/client/src/api/tasks.ts` | **Create** | API client functions for task CRUD and move |
| `packages/client/src/context/board-context.tsx` | **Modify** | Add `createTask`, `moveTask`, and `setTasks` to context |
| `packages/client/src/components/task-card.tsx` | **Create** | Task card component with priority badge, label dots, due date |
| `packages/client/src/components/add-task-form.tsx` | **Create** | Inline form for quick task creation at column bottom |
| `packages/client/src/components/board-view.tsx` | **Modify** | Unified drag context for columns + tasks, render TaskCard and AddTaskForm, drag overlay |
| `packages/client/src/components/column.tsx` | **Modify** | Accept sortable task children and AddTaskForm; minor adjustments for nested sortable context |
| `packages/client/src/components/__tests__/task-card.test.tsx` | **Create** | Unit tests for TaskCard |
| `packages/client/src/components/__tests__/add-task-form.test.tsx` | **Create** | Unit tests for AddTaskForm |
| `packages/client/src/components/__tests__/board-view.test.tsx` | **Modify** | Update tests for unified drag context and task rendering |
| `packages/client/src/context/__tests__/board-context.test.tsx` | **Modify** | Add tests for createTask and moveTask with optimistic rollback |