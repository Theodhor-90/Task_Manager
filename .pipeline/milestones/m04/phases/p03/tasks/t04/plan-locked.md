Now I have all the context I need. Let me produce the implementation plan.

# Task 4 Plan — `TaskDetailPanel` Component: Layout and Title Editing

## 1. Deliverables

| # | File / Artifact | Action | Purpose |
|---|----------------|--------|---------|
| 1 | `packages/client/src/components/task-detail-panel.tsx` | **Create** | Side panel component that slides in from the right when a task card is clicked, with data loading, title display/inline-edit, and status display |
| 2 | `packages/client/src/components/__tests__/task-detail-panel.test.tsx` | **Create** | Unit tests for the panel's layout, data loading, title editing, close behavior, and status display |

---

## 2. Dependencies

- **Sibling tasks (completed)**:
  - Task 2: `fetchTask` function in `api/tasks.ts` — used to load the full task when the panel opens
  - Task 3: `updateTask` method in `BoardContext` — used to persist title edits and sync the board
- **Existing infrastructure**:
  - `packages/client/src/components/ui/loading-spinner.tsx` — `LoadingSpinner` for the loading state
  - `packages/client/src/components/ui/error-message.tsx` — `ErrorMessage` for the error state
  - `packages/client/src/components/ui/modal.tsx` — reference pattern for `createPortal`, Escape key listener, body scroll lock
  - `packages/client/src/context/board-context.tsx` — `useBoard()` hook providing `updateTask`
  - `packages/client/src/api/tasks.ts` — `fetchTask(taskId)`
  - `@taskboard/shared` — `Task` type
- **No new npm packages required** — all dependencies are already installed

---

## 3. Implementation Details

### 3.1 Create `packages/client/src/components/task-detail-panel.tsx`

#### 3.1.1 Props interface

```typescript
interface TaskDetailPanelProps {
  taskId: string;
  onClose: () => void;
}
```

#### 3.1.2 Imports

```typescript
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import type { Task } from "@taskboard/shared";
import { fetchTask } from "../api/tasks";
import { useBoard } from "../context/board-context";
import { LoadingSpinner } from "./ui/loading-spinner";
import { ErrorMessage } from "./ui/error-message";
```

#### 3.1.3 Component structure

```typescript
export function TaskDetailPanel({ taskId, onClose }: TaskDetailPanelProps)
```

**State variables**:
- `task: Task | null` — the loaded task data; initially `null`
- `isLoading: boolean` — loading state for `fetchTask`; initially `true`
- `error: string | null` — error from `fetchTask`; initially `null`
- `isEditingTitle: boolean` — whether the title is in edit mode; initially `false`
- `editTitle: string` — the current value of the title input while editing; initially `""`

**Refs**:
- `titleInputRef: RefObject<HTMLInputElement | null>` — to auto-focus the title input when entering edit mode

**Context**:
- `const { updateTask } = useBoard();`

#### 3.1.4 Data loading effect

On mount (and when `taskId` changes), fetch the task:

```typescript
useEffect(() => {
  let cancelled = false;

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchTask(taskId);
      if (!cancelled) {
        setTask(response.data);
      }
    } catch (err: unknown) {
      if (!cancelled) {
        const message = err instanceof Error ? err.message : "Failed to load task";
        setError(message);
      }
    } finally {
      if (!cancelled) {
        setIsLoading(false);
      }
    }
  }

  load();
  return () => { cancelled = true; };
}, [taskId]);
```

**Key design decisions**:
- Uses a `cancelled` flag to prevent state updates after unmount (stale closures from async operations)
- Follows the same error message extraction pattern as `loadBoard` in `board-context.tsx`

#### 3.1.5 Escape key listener

```typescript
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      if (isEditingTitle) {
        // Cancel title editing instead of closing the panel
        setEditTitle(task?.title ?? "");
        setIsEditingTitle(false);
      } else {
        onClose();
      }
    }
  };

  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
}, [onClose, isEditingTitle, task]);
```

**Key design decision**: When the title is being edited, Escape cancels the edit rather than closing the panel. Only when not editing does Escape close the panel. This provides a consistent two-level escape behavior that users expect.

#### 3.1.6 Body scroll lock

```typescript
useEffect(() => {
  document.body.style.overflow = "hidden";
  return () => {
    document.body.style.overflow = "";
  };
}, []);
```

Follows the exact same pattern as `Modal`.

#### 3.1.7 Auto-focus title input on edit mode entry

```typescript
useEffect(() => {
  if (isEditingTitle && titleInputRef.current) {
    titleInputRef.current.focus();
    titleInputRef.current.select();
  }
}, [isEditingTitle]);
```

Follows the same pattern as `Column` rename (line 45–50 in `column.tsx`).

#### 3.1.8 Title editing handlers

**Enter edit mode**:
```typescript
function handleTitleClick() {
  if (!task) return;
  setEditTitle(task.title);
  setIsEditingTitle(true);
}
```

**Save on Enter or blur**:
```typescript
async function handleTitleSave() {
  if (!task) return;
  const trimmed = editTitle.trim();
  if (!trimmed || trimmed === task.title) {
    setIsEditingTitle(false);
    return;
  }
  try {
    const updated = await updateTask(taskId, { title: trimmed });
    setTask(updated);
  } catch {
    // Revert input to current title on failure
    setEditTitle(task.title);
  }
  setIsEditingTitle(false);
}
```

**Key down handler for the title input**:
```typescript
function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key === "Enter") {
    e.preventDefault();
    handleTitleSave();
  }
  // Note: Escape is handled by the document-level keydown listener
}
```

**Key design decisions**:
- Follows the exact same inline-edit pattern as `Column` rename: Enter saves, blur saves, Escape cancels
- On save success, updates local `task` state with the returned `Task` from `updateTask` — this keeps the panel's local state in sync with the board context
- On save failure, reverts `editTitle` to the current title (the title in the context was never modified because `updateTask` threw before calling `setTasks`)
- `handleTitleSave` handles the blur event — it must stop propagation of Escape so the panel doesn't close while the user is just cancelling the title edit

#### 3.1.9 Rendered JSX structure

The component uses `createPortal` to render to `document.body`:

```tsx
return createPortal(
  <div
    className="fixed inset-0 z-50 flex"
    data-testid="task-detail-overlay"
  >
    {/* Backdrop */}
    <div
      className="flex-1 bg-black/20"
      onClick={onClose}
      data-testid="task-detail-backdrop"
    />

    {/* Panel */}
    <div
      className="h-full w-full max-w-2xl overflow-y-auto bg-white shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header with close button */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <h3 className="text-sm font-medium text-gray-500">Task Details</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Close panel"
        >
          ×
        </button>
      </div>

      {/* Body */}
      <div className="px-6 py-4">
        {isLoading && <LoadingSpinner />}

        {error && <ErrorMessage message={error} />}

        {!isLoading && !error && task && (
          <>
            {/* Title — inline editable */}
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                onBlur={handleTitleSave}
                className="w-full rounded border border-blue-300 px-2 py-1 text-xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Task title"
              />
            ) : (
              <h2
                onClick={handleTitleClick}
                className="cursor-pointer text-xl font-bold text-gray-900 hover:text-blue-600"
                title="Click to edit title"
              >
                {task.title}
              </h2>
            )}

            {/* Status label */}
            <span className="mt-2 inline-block rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
              {task.status}
            </span>
          </>
        )}
      </div>
    </div>
  </div>,
  document.body,
);
```

**Key layout decisions**:
- The overlay uses `flex` layout: backdrop fills available space (`flex-1`), panel takes `max-w-2xl` on the right
- The backdrop uses `bg-black/20` (lighter than the Modal's `bg-black/50`) since the board should remain partially visible
- Panel is full-height (`h-full`) with `overflow-y-auto` for scrollable content
- Close button uses `×` character (same as `Modal`) with `aria-label="Close panel"`
- The title displays as an `<h2>` and toggles to an `<input>` on click (same pattern as `Column` rename's `<h3>` → `<input>`)
- Status is displayed as a read-only pill/badge beneath the title

---

## 4. Contracts

### `TaskDetailPanel` Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `taskId` | `string` | Yes | The `_id` of the task to display and edit |
| `onClose` | `() => void` | Yes | Callback invoked when the panel should close (backdrop click, close button, or Escape key) |

### Internal State → External Effects

| Action | Internal Effect | External Effect (via BoardContext) |
|--------|----------------|-----------------------------------|
| Panel mounts | Calls `fetchTask(taskId)`, sets local `task` state | None |
| Title edit saved | Updates local `task` state with returned value | Calls `updateTask(taskId, { title })`, which patches the task in `BoardContext.tasks` — the `TaskCard` on the board re-renders with the new title |
| Escape while editing title | Reverts `editTitle` to current `task.title`, exits edit mode | None |
| Escape while not editing | Calls `onClose()` | None |
| Backdrop click | Calls `onClose()` | None |
| Close button click | Calls `onClose()` | None |

### Usage (by Task 8, `BoardView`)

```typescript
import { TaskDetailPanel } from "./task-detail-panel";

// Inside BoardView:
const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

// In JSX:
{selectedTaskId && (
  <TaskDetailPanel
    taskId={selectedTaskId}
    onClose={() => setSelectedTaskId(null)}
  />
)}
```

---

## 5. Test Plan

All tests are in a new file: `packages/client/src/components/__tests__/task-detail-panel.test.tsx`.

### 5.1 Test Setup

**Mocks required**:
- `vi.mock("../../api/tasks")` — mock `fetchTask` to control task loading
- `vi.mock("../../context/board-context")` — mock `useBoard` to provide `updateTask`
- `vi.mock("../ui/loading-spinner")` — simple render mock for easy assertion
- `vi.mock("../ui/error-message")` — simple render mock for easy assertion

**Mock fixtures**:
```typescript
const mockTask = {
  _id: "task1",
  title: "Test Task",
  description: "Some description",
  status: "To Do",
  priority: "medium" as const,
  position: 0,
  labels: [],
  board: "board1",
  project: "proj1",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
};
```

**Helper**:
```typescript
function renderPanel(props?: Partial<TaskDetailPanelProps>) {
  const defaultProps = { taskId: "task1", onClose: vi.fn() };
  const finalProps = { ...defaultProps, ...props };
  return { ...render(<TaskDetailPanel {...finalProps} />), onClose: finalProps.onClose };
}
```

### 5.2 Per-Test Specification

| # | Test Name | Setup | Action | Assertion |
|---|-----------|-------|--------|-----------|
| 1 | shows loading spinner while fetching task | Mock `fetchTask` to return a never-resolving promise | Render panel | `LoadingSpinner` is visible; task title is not rendered |
| 2 | shows error message when fetchTask fails | Mock `fetchTask` to reject with `Error("Not found")` | Render panel, `await waitFor` | `ErrorMessage` with "Not found" is visible; task title is not rendered |
| 3 | renders task title and status after loading | Mock `fetchTask` to resolve with `mockTask` | Render panel, `await waitFor` | `<h2>` with "Test Task" is visible; status badge with "To Do" is visible |
| 4 | calls onClose when backdrop is clicked | Mock `fetchTask` to resolve | Click on the backdrop element (`data-testid="task-detail-backdrop"`) | `onClose` called once |
| 5 | calls onClose when close button is clicked | Mock `fetchTask` to resolve | Click the button with `aria-label="Close panel"` | `onClose` called once |
| 6 | calls onClose when Escape is pressed (not editing) | Mock `fetchTask` to resolve, wait for load | Press Escape via `fireEvent.keyDown(document, { key: "Escape" })` | `onClose` called once |
| 7 | clicking title enters edit mode with input pre-filled | Mock `fetchTask` to resolve, wait for load | Click the `<h2>` title | An `<input>` with `aria-label="Task title"` appears; its value is "Test Task"; the `<h2>` is no longer present |
| 8 | Enter saves title and exits edit mode | Mock `fetchTask` to resolve, mock `updateTask` to resolve with updated task | Click title, change input to "New Title", press Enter | `updateTask` called with `("task1", { title: "New Title" })`; `<h2>` reappears with "New Title"; input is gone |
| 9 | blur saves title and exits edit mode | Mock `fetchTask` to resolve, mock `updateTask` to resolve | Click title, change input to "New Title", blur the input | `updateTask` called with `("task1", { title: "New Title" })` |
| 10 | Escape while editing cancels edit without closing panel | Mock `fetchTask` to resolve, wait for load | Click title, change input to "Changed", press Escape | Input disappears; `<h2>` reappears with original "Test Task"; `onClose` is NOT called |
| 11 | empty or whitespace-only title does not trigger update | Mock `fetchTask` to resolve | Click title, clear input to "   ", press Enter | `updateTask` NOT called; reverts to displaying `<h2>` with "Test Task" |
| 12 | same-as-current title does not trigger update | Mock `fetchTask` to resolve | Click title, leave input as "Test Task", press Enter | `updateTask` NOT called; exits edit mode cleanly |
| 13 | prevents body scroll while open | N/A | Render panel | `document.body.style.overflow` is `"hidden"` |
| 14 | restores body scroll on unmount | N/A | Render panel, then unmount | `document.body.style.overflow` is `""` |
| 15 | title edit failure reverts to current title | Mock `fetchTask` to resolve, mock `updateTask` to reject | Click title, change to "Bad", press Enter | `<h2>` reappears with "Test Task" (original); `updateTask` was called |
| 16 | panel does not close on click inside panel content | Mock `fetchTask` to resolve | Click inside the panel area (on the title) | `onClose` NOT called |

---

## 6. Implementation Order

1. **Step 1**: Create `packages/client/src/components/task-detail-panel.tsx` with the full component implementation:
   - Imports
   - Props interface
   - Component function with state, refs, context usage
   - `fetchTask` effect
   - Escape key effect (two-level: cancel editing or close panel)
   - Body scroll lock effect
   - Title focus effect
   - Title editing handlers (`handleTitleClick`, `handleTitleSave`, `handleTitleKeyDown`)
   - JSX with `createPortal`: backdrop, panel container, header with close button, loading/error states, title (editable h2/input), status badge
2. **Step 2**: Create `packages/client/src/components/__tests__/task-detail-panel.test.tsx` with all 16 test cases
3. **Step 3**: Verify TypeScript compiles: `npm run build -w packages/client`
4. **Step 4**: Run tests: `npm run test -w packages/client`

---

## 7. Verification Commands

```bash
# 1. Verify the component file exists and exports TaskDetailPanel
grep "export function TaskDetailPanel" packages/client/src/components/task-detail-panel.tsx

# 2. Verify the test file exists
grep "describe.*TaskDetailPanel" packages/client/src/components/__tests__/task-detail-panel.test.tsx

# 3. Verify TypeScript compiles
npm run build -w packages/client

# 4. Run all client tests (should pass including 16 new tests)
npm run test -w packages/client
```

All four commands should succeed (grep finds matches, build and test exit with code 0).