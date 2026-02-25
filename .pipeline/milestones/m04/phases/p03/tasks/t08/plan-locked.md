Now I have all the information needed. Here's the plan:

# Task 8 Plan — Wire TaskCard Click to Open Panel in BoardView

## 1. Deliverables

| # | File / Artifact | Action | Purpose |
|---|----------------|--------|---------|
| 1 | `packages/client/src/components/board-view.tsx` | **Modify** | Add `selectedTaskId` state, `handleTaskClick` with drag guard, pass `onClick` to `TaskCard`, render `TaskDetailPanel` when a task is selected |
| 2 | `packages/client/src/components/__tests__/board-view.test.tsx` | **Modify** | Add tests for click-to-open panel, panel close resets state, drag guard prevents panel open |

---

## 2. Dependencies

- **Sibling tasks (completed)**:
  - Task 4: `TaskDetailPanel` component exists at `packages/client/src/components/task-detail-panel.tsx` with props `{ taskId: string; onClose: () => void }`
  - Tasks 5–7: `TaskDetailPanel` fully implemented with description, priority, due date, and delete functionality
- **Existing infrastructure**:
  - `packages/client/src/components/board-view.tsx` — `BoardView` component with `DndContext`, `SortableTaskItem`, `handleDragStart`/`handleDragOver`/`handleDragEnd` handlers
  - `packages/client/src/components/task-card.tsx` — `TaskCard` component already accepts an optional `onClick?: (taskId: string) => void` prop
  - `packages/client/src/components/__tests__/board-view.test.tsx` — existing test file with mocked `DndContext`, `SortableContext`, `useSortable`, `Column`, `TaskCard`, and `AddTaskForm`
- **No new npm packages required**

---

## 3. Implementation Details

### 3.1 Modify `packages/client/src/components/board-view.tsx`

#### 3.1.1 New import

Add `TaskDetailPanel` to the imports at the top of the file, after the existing component imports:

```typescript
import { TaskDetailPanel } from "./task-detail-panel";
```

#### 3.1.2 New state and ref

Add inside `BoardView`, after the existing `tasksSnapshot` ref (line 74):

```typescript
const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
const hasDraggedRef = useRef(false);
```

- `selectedTaskId` — tracks which task's detail panel is open; `null` means no panel. Initially `null`.
- `hasDraggedRef` — a ref set to `true` in `handleDragEnd` when a drag operation completes. Used to suppress the `onClick` that fires immediately after a drag ends. Cleared via `requestAnimationFrame` so the click event (which fires in the same event loop tick as `onDragEnd`) is suppressed, but subsequent clicks work normally.

#### 3.1.3 `handleTaskClick` function

Add after the `handleDragEnd` function (after line 226), before `handleAddColumn`:

```typescript
function handleTaskClick(taskId: string) {
  if (hasDraggedRef.current) return;
  setSelectedTaskId(taskId);
}
```

**Key design decision**: The function checks `hasDraggedRef.current` — if `true`, the click is suppressed because it was triggered by a drag-and-drop completion, not an intentional click. The ref is cleared asynchronously (see 3.1.4), so subsequent real clicks work normally.

#### 3.1.4 Modify `handleDragEnd` — set drag guard

At the beginning of `handleDragEnd` (line 164), after the existing first line, add the drag guard setter:

```typescript
function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;

  // Set drag guard to prevent click-through to TaskDetailPanel
  hasDraggedRef.current = true;
  requestAnimationFrame(() => {
    hasDraggedRef.current = false;
  });

  // Clear active state (existing code)
  setActiveTask(null);
  setActiveColumnId(null);
  // ... rest of existing code
```

**Key design decision**: `requestAnimationFrame` is used rather than `setTimeout(0)` because:
- The click event fires synchronously after the drag end in the same microtask queue
- `requestAnimationFrame` schedules the reset for the next frame, which is after the click event has already been processed
- This is a more reliable timing mechanism than `setTimeout(0)`, which may or may not fire before the click depending on the browser's task scheduling

Note: The `PointerSensor` has `activationConstraint: { distance: 8 }` (line 83–85), which means a drag is only recognized if the pointer moves 8+ pixels. Short clicks (< 8px movement) never trigger `onDragStart`/`onDragEnd`, so `hasDraggedRef` remains `false` and the click passes through to `handleTaskClick` normally.

#### 3.1.5 Modify `SortableTaskItem` — pass `onClick` to `TaskCard`

The `SortableTaskItem` component (lines 28–52) currently renders `<TaskCard task={task} />` without passing `onClick`. It needs to accept and forward an `onClick` prop:

Update the `SortableTaskItem` function signature and JSX:

```typescript
function SortableTaskItem({
  task,
  onClick,
}: {
  task: Task;
  onClick?: (taskId: string) => void;
}) {
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
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onClick={onClick} />
    </div>
  );
}
```

#### 3.1.6 Pass `onClick` to `SortableTaskItem` in the render loop

Update the task rendering inside the column map (line 308):

Change:
```tsx
<SortableTaskItem key={task._id} task={task} />
```

To:
```tsx
<SortableTaskItem key={task._id} task={task} onClick={handleTaskClick} />
```

#### 3.1.7 Render `TaskDetailPanel` when a task is selected

Add just before the closing `</DndContext>` tag (line 363), after the `</DragOverlay>`:

```tsx
{selectedTaskId && (
  <TaskDetailPanel
    taskId={selectedTaskId}
    onClose={() => setSelectedTaskId(null)}
  />
)}
```

**Key design decision**: The `TaskDetailPanel` renders via `createPortal` to `document.body`, so its placement within the component tree is purely for lifecycle management. Rendering it inside `DndContext` is fine — the portal escapes the DndContext's DOM tree. The `onClose` callback sets `selectedTaskId` back to `null`, which unmounts the panel.

#### 3.1.8 What NOT to do

- Do **not** add `updateTask` or `removeTask` to the `useBoard()` destructuring in `BoardView` — the panel accesses these directly from the context.
- Do **not** debounce or throttle `handleTaskClick` — the `hasDraggedRef` guard is sufficient.
- Do **not** add `useCallback` to `handleTaskClick` — it references `hasDraggedRef` (a ref, stable) and `setSelectedTaskId` (a setter, stable). As a regular function, it will be recreated on each render, but since it's passed through `SortableTaskItem` (which is not memoized), there's no benefit to memoizing it.
- Do **not** modify `TaskCard` — it already accepts `onClick?: (taskId: string) => void` and handles it properly (including keyboard accessibility with Enter and Space).

---

### 3.2 Modify `packages/client/src/components/__tests__/board-view.test.tsx`

#### 3.2.1 Add mock for `TaskDetailPanel`

Add after the existing `AddTaskForm` mock (line 107):

```typescript
vi.mock("../task-detail-panel", () => ({
  TaskDetailPanel: ({
    taskId,
    onClose,
  }: {
    taskId: string;
    onClose: () => void;
  }) => (
    <div data-testid="task-detail-panel" data-task-id={taskId}>
      <button onClick={onClose} data-testid="close-panel">
        Close
      </button>
    </div>
  ),
}));
```

This provides a simple mock that:
- Renders with a `data-testid="task-detail-panel"` for presence assertions
- Exposes the `taskId` via a `data-task-id` attribute for verifying the correct task was selected
- Provides a close button for testing the `onClose` callback

#### 3.2.2 Update `TaskCard` mock to support `onClick`

The existing `TaskCard` mock (lines 97–101) doesn't forward `onClick`:

```typescript
vi.mock("../task-card", () => ({
  TaskCard: ({ task }: { task: { _id: string; title: string } }) => (
    <div data-testid={`task-card-${task._id}`}>{task.title}</div>
  ),
}));
```

Update to:

```typescript
vi.mock("../task-card", () => ({
  TaskCard: ({
    task,
    onClick,
  }: {
    task: { _id: string; title: string };
    onClick?: (taskId: string) => void;
  }) => (
    <div
      data-testid={`task-card-${task._id}`}
      onClick={() => onClick?.(task._id)}
    >
      {task.title}
    </div>
  ),
}));
```

This adds `onClick` support so that clicking the mock task card triggers the `handleTaskClick` function in `BoardView`.

#### 3.2.3 Update `defaultBoardState` to include `updateTask` and `removeTask`

The existing `defaultBoardState` (lines 160–175) doesn't include `updateTask` or `removeTask`, which `TaskDetailPanel` accesses from the context. Although the panel is mocked and doesn't actually call `useBoard()`, the `BoardView` component itself destructures `useBoard()` which only uses `board`, `tasks`, `isLoading`, `error`, `addColumn`, `renameColumn`, `removeColumn`, `reorderColumns`, `moveTask`, and `setTasks`. The mock `useBoard` returns whatever `defaultBoardState` provides, and the mock `TaskDetailPanel` doesn't call `useBoard()`, so no update to `defaultBoardState` is strictly needed.

However, for consistency with the actual `BoardContextValue` interface (and to prevent `undefined` access if someone later adds a real component that calls `useBoard`), add:

```typescript
updateTask: vi.fn().mockResolvedValue(undefined),
removeTask: vi.fn().mockResolvedValue(undefined),
```

to the `defaultBoardState` object.

#### 3.2.4 New test cases

Add the following tests after the existing tests (after line 488), within the existing `describe("BoardView", ...)` block:

**Test 1: clicking a task card opens the detail panel**

```typescript
it("clicking a task card opens the task detail panel", async () => {
  renderBoardView();

  const taskCard = screen.getByTestId("task-card-task1");
  fireEvent.click(taskCard);

  expect(screen.getByTestId("task-detail-panel")).toBeInTheDocument();
  expect(screen.getByTestId("task-detail-panel")).toHaveAttribute(
    "data-task-id",
    "task1",
  );
});
```

**Test 2: panel is not rendered when no task is selected**

```typescript
it("does not render task detail panel when no task is selected", () => {
  renderBoardView();
  expect(screen.queryByTestId("task-detail-panel")).not.toBeInTheDocument();
});
```

**Test 3: closing the panel resets selectedTaskId**

```typescript
it("closing the panel hides it", async () => {
  renderBoardView();

  // Open panel
  fireEvent.click(screen.getByTestId("task-card-task1"));
  expect(screen.getByTestId("task-detail-panel")).toBeInTheDocument();

  // Close panel
  fireEvent.click(screen.getByTestId("close-panel"));
  expect(screen.queryByTestId("task-detail-panel")).not.toBeInTheDocument();
});
```

**Test 4: drag-and-drop does not open the task detail panel**

```typescript
it("drag-and-drop does not open the task detail panel", () => {
  renderBoardView();

  // Simulate a drag operation
  act(() => {
    capturedOnDragStart!({
      active: {
        id: "task1",
        data: { current: { type: "task", task: mockTasks[0] } },
      },
    });

    capturedOnDragEnd!({
      active: {
        id: "task1",
        data: { current: { type: "task", task: mockTasks[0] } },
      },
      over: {
        id: "task1",
        data: { current: { type: "task", task: mockTasks[0] } },
      },
    });
  });

  // Click the task card — should be suppressed by drag guard
  fireEvent.click(screen.getByTestId("task-card-task1"));

  expect(screen.queryByTestId("task-detail-panel")).not.toBeInTheDocument();
});
```

**Note on Test 4**: This test verifies the drag guard mechanism. After `handleDragEnd` fires, `hasDraggedRef.current` is set to `true`. The click that fires immediately after (in the same synchronous execution) is suppressed. The `requestAnimationFrame` callback that resets the ref hasn't fired yet because `requestAnimationFrame` is asynchronous.

In the test environment, `requestAnimationFrame` may or may not be polyfilled. If jsdom doesn't provide `requestAnimationFrame`, we need to handle this. jsdom does provide a basic `requestAnimationFrame` implementation, but it may execute immediately or not at all in tests. To make the test reliable, the test verifies that the click fired synchronously after `handleDragEnd` is suppressed — which is the exact timing scenario in real browsers.

**Test 5: clicking a different task card changes the panel**

```typescript
it("clicking a different task card updates the panel", () => {
  renderBoardView();

  // Open panel for task1
  fireEvent.click(screen.getByTestId("task-card-task1"));
  expect(screen.getByTestId("task-detail-panel")).toHaveAttribute(
    "data-task-id",
    "task1",
  );

  // Click task2
  fireEvent.click(screen.getByTestId("task-card-task2"));
  expect(screen.getByTestId("task-detail-panel")).toHaveAttribute(
    "data-task-id",
    "task2",
  );
});
```

---

## 4. Contracts

### `handleTaskClick`

| Attribute | Details |
|-----------|---------|
| **Signature** | `handleTaskClick(taskId: string): void` |
| **Guard** | If `hasDraggedRef.current` is `true`, returns early without setting state |
| **Effect** | Sets `selectedTaskId` to `taskId`, causing `TaskDetailPanel` to render |

### Drag Guard Mechanism

| Event | `hasDraggedRef.current` | Effect |
|-------|------------------------|--------|
| `handleDragEnd` fires | Set to `true` | Click suppressed |
| `requestAnimationFrame` callback | Set to `false` | Subsequent clicks work |

### `SortableTaskItem` Props (updated)

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `task` | `Task` | Yes | The task data to render |
| `onClick` | `(taskId: string) => void` | No | Click handler passed through to `TaskCard` |

### `TaskDetailPanel` Rendering

| Condition | Rendered |
|-----------|----------|
| `selectedTaskId === null` | Not rendered |
| `selectedTaskId !== null` | `<TaskDetailPanel taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />` |

### Interactions and Effects

| User Action | Internal Effect | External Effect |
|-------------|----------------|-----------------|
| Click a task card (no prior drag) | `setSelectedTaskId(taskId)` → `TaskDetailPanel` renders | Panel fetches task data via `fetchTask(taskId)` |
| Click a task card immediately after drag-and-drop | `handleTaskClick` returns early (guard active) | No panel opens |
| Click close/backdrop/Escape in panel | `setSelectedTaskId(null)` → panel unmounts | Board is fully visible again |
| Click a different task card while panel is open | `setSelectedTaskId(newTaskId)` → panel re-renders with new task | Panel reloads with new task data |

---

## 5. Test Plan

All tests are added to the existing file `packages/client/src/components/__tests__/board-view.test.tsx`.

### 5.1 Test Setup Modifications

1. **Add `TaskDetailPanel` mock**: A simple mock that renders a `data-testid="task-detail-panel"` div with `data-task-id` attribute and a close button
2. **Update `TaskCard` mock**: Add `onClick` prop forwarding so clicking the mock card triggers `handleTaskClick`
3. **Update `defaultBoardState`**: Add `updateTask` and `removeTask` mock functions for interface completeness

### 5.2 Per-Test Specification

| # | Test Name | Setup | Action | Assertion |
|---|-----------|-------|--------|-----------|
| 1 | clicking a task card opens the task detail panel | Default board state with tasks | Click `task-card-task1` | `task-detail-panel` is in the document with `data-task-id="task1"` |
| 2 | does not render task detail panel when no task is selected | Default board state | Initial render (no clicks) | `task-detail-panel` is NOT in the document |
| 3 | closing the panel hides it | Default board state | Click `task-card-task1` to open, then click `close-panel` | `task-detail-panel` is no longer in the document |
| 4 | drag-and-drop does not open the task detail panel | Default board state | Simulate `onDragStart` + `onDragEnd` for task1, then click `task-card-task1` | `task-detail-panel` is NOT in the document |
| 5 | clicking a different task card updates the panel | Default board state | Click `task-card-task1`, then click `task-card-task2` | `task-detail-panel` has `data-task-id="task2"` |

### 5.3 Impact on Existing Tests

- **`TaskCard` mock change**: Updating the mock to include `onClick` forwarding may affect existing tests that assert on `task-card-*` test IDs. The existing tests don't click task cards, so adding an `onClick` handler to the mock div should not cause regressions. However, the mock now renders `onClick={() => onClick?.(task._id)}` — if `onClick` is `undefined` (which it will be for `DragOverlay`'s `TaskCard` rendering at line 359), the optional chaining `?.` prevents errors.
- **`defaultBoardState` change**: Adding `updateTask` and `removeTask` is additive; existing tests don't reference these keys.

---

## 6. Implementation Order

1. **Step 1**: Open `packages/client/src/components/board-view.tsx`
2. **Step 2**: Add `import { TaskDetailPanel } from "./task-detail-panel";`
3. **Step 3**: Add `selectedTaskId` state and `hasDraggedRef` ref inside `BoardView`
4. **Step 4**: Add the drag guard code (set `hasDraggedRef.current = true` + `requestAnimationFrame` reset) at the top of `handleDragEnd`
5. **Step 5**: Add `handleTaskClick` function after `handleDragEnd`
6. **Step 6**: Update `SortableTaskItem` to accept and forward `onClick` prop to `TaskCard`
7. **Step 7**: Pass `onClick={handleTaskClick}` to each `SortableTaskItem` in the column render loop
8. **Step 8**: Add `{selectedTaskId && <TaskDetailPanel ... />}` before `</DndContext>`
9. **Step 9**: Open `packages/client/src/components/__tests__/board-view.test.tsx`
10. **Step 10**: Add `vi.mock("../task-detail-panel")` mock
11. **Step 11**: Update `TaskCard` mock to forward `onClick`
12. **Step 12**: Add `updateTask` and `removeTask` to `defaultBoardState`
13. **Step 13**: Add the 5 new test cases
14. **Step 14**: Verify TypeScript compiles: `npm run build -w packages/client`
15. **Step 15**: Run tests: `npm run test -w packages/client`

---

## 7. Verification Commands

```bash
# 1. Verify TaskDetailPanel import exists in board-view
grep "TaskDetailPanel" packages/client/src/components/board-view.tsx

# 2. Verify selectedTaskId state exists
grep "selectedTaskId" packages/client/src/components/board-view.tsx

# 3. Verify hasDraggedRef exists
grep "hasDraggedRef" packages/client/src/components/board-view.tsx

# 4. Verify handleTaskClick exists
grep "handleTaskClick" packages/client/src/components/board-view.tsx

# 5. Verify onClick is passed to SortableTaskItem
grep "onClick={handleTaskClick}" packages/client/src/components/board-view.tsx

# 6. Verify TypeScript compiles
npm run build -w packages/client

# 7. Run all client tests (should pass including 5 new tests)
npm run test -w packages/client
```

All seven commands should succeed (grep finds matches, build and test exit with code 0).